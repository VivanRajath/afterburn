import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function run({ operation, ...args }) {
  if (operation === 'get_pr_diff') {
    const { source = 'file', path } = args;
    if (source !== 'file') {
      console.error('[github-client] github API mode not implemented in v0.1 demo');
      return { error: 'github mode not implemented' };
    }
    const diff = await readFile(path, 'utf8');
    const changed_files = diff.split('\n')
      .filter(l => l.startsWith('+++ b/'))
      .map(l => l.slice(6).trim());
    return { diff, changed_files };
  }

  if (operation === 'post_comment') {
    const { body } = args;
    const W = 72;
    const bar = '─'.repeat(W);
    const pad = s => s.slice(0, W - 2).padEnd(W - 2);
    process.stdout.write(`┌${bar}┐\n`);
    process.stdout.write(`│ ${pad('afterburn · PR Warning')} │\n`);
    process.stdout.write(`├${bar}┤\n`);
    for (const line of body.split('\n')) {
      process.stdout.write(`│ ${pad(line)} │\n`);
    }
    process.stdout.write(`└${bar}┘\n`);
    return { posted: true, mode: 'stdout' };
  }

  throw new Error(`Unknown operation: ${operation}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try {
    const result = await run(JSON.parse(Buffer.concat(chunks)));
    process.stdout.write(JSON.stringify(result));
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}
