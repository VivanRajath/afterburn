import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function run({ path }) {
  const content = await readFile(path, 'utf8');
  return { content, size_bytes: Buffer.byteLength(content), exists: true };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  try {
    process.stdout.write(JSON.stringify(await run(JSON.parse(Buffer.concat(chunks)))));
  } catch (e) {
    process.stderr.write(JSON.stringify({ error: e.message }));
    process.exit(1);
  }
}
