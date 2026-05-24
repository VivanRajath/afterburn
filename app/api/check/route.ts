// v0.1: invokes check-pr-runner directly via child_process.
// v0.2 roadmap: route through gitclaw for full skill orchestration:
//   gitclaw --dir agent --model {provider}:{model} "check {diff_path}"

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

const PROVIDER_KEY: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  groq: 'GROQ_API_KEY',
};

const PROVIDER_MODEL: Record<string, string> = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4o-mini',
  groq: 'llama-3.1-8b-instant',
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const diff: string = body?.diff ?? '';
  const model: string = body?.model ?? 'anthropic';

  const provider = PROVIDER_KEY[model] ? model : 'anthropic';
  const keyName = PROVIDER_KEY[provider];

  if (!process.env[keyName]) {
    return NextResponse.json(
      { error: `API key for ${provider} not set`, hint: `Set ${keyName} in .env.local` },
      { status: 400 },
    );
  }

  const tmpPath = join(tmpdir(), `diff-${Date.now()}.patch`);
  await writeFile(tmpPath, diff, 'utf8');

  const start = Date.now();
  const repoRoot = process.cwd();
  const runnerPath = join(repoRoot, 'agent', 'tools', 'scripts', 'check-pr-runner.mjs');

  const childEnv = {
    ...process.env,
    LLM_PROVIDER: provider,
    LLM_MODEL: PROVIDER_MODEL[provider],
  };

  let stdout = '';
  let stderr = '';

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', [runnerPath, tmpPath], {
        cwd: repoRoot,
        env: childEnv,
      });

      child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`runner exited ${code}`));
      });

      child.on('error', reject);
    });
  } catch (err) {
    await unlink(tmpPath).catch(() => undefined);
    return NextResponse.json({ error: String(err), stderr }, { status: 500 });
  }

  await unlink(tmpPath).catch(() => undefined);

  const elapsed_ms = Date.now() - start;

  // stdout: formatted box + "\n--- result ---\n" + JSON
  const parts = stdout.split('--- result ---');
  const warningText = parts[0].trim();

  let tier = 'jnr';
  let lessons_cited: string[] = [];
  let matched_node_ids: string[] = [];

  if (parts[1]) {
    try {
      const result = JSON.parse(parts[1].trim());
      tier = result.tier ?? tier;
      lessons_cited = result.lessons_cited ?? lessons_cited;

      const matched = new Set<string>();
      for (const id of result.incidents_matched ?? []) matched.add(id);
      for (const inc of result.incidents ?? []) {
        for (const p of inc.touched_paths ?? []) matched.add(`code-path:${p}`);
      }
      for (const hz of result.hot_zones ?? []) {
        if (hz.code_path) matched.add(hz.code_path);
      }
      for (const pat of result.patterns ?? []) {
        if (pat.id) matched.add(pat.id);
      }
      for (const f of result.changed_files ?? []) matched.add(`code-path:${slugify(f)}`);
      matched_node_ids = [...matched];
    } catch {
      // leave defaults
    }
  }

  return NextResponse.json({
    warning: warningText,
    tier,
    lessons_cited,
    matched_node_ids,
    model_used: provider,
    elapsed_ms,
  });
}
