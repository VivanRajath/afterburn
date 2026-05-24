import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

const REPO_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;

function spawnIngest(repoUrl: string, workdir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'node',
      ['agent/tools/scripts/ingest-repo.mjs', '--repo_url', repoUrl, '--workdir', workdir],
      { cwd: process.cwd(), stdio: 'pipe', env: { ...process.env } },
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('ingest-repo timed out after 120s'));
    }, 120000);

    child.on('close', (code: number) => {
      clearTimeout(timer);
      if (code === 0 || stdout.trim()) resolve(stdout.trim());
      else reject(new Error(`ingest-repo exited ${code}: ${stderr.trim().slice(0, 300)}`));
    });

    child.on('error', (err: Error) => {
      clearTimeout(timer);
      reject(new Error(`spawn error: ${err.message}`));
    });
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url: string = (body?.url ?? '').trim();

  // Normalise: prepend https:// if user omitted scheme
  const fullUrl = url.startsWith('http') ? url : `https://${url}`;

  if (!REPO_URL_RE.test(fullUrl)) {
    return NextResponse.json(
      { error: 'repo_url must be a valid https://github.com/<owner>/<repo> URL' },
      { status: 400 },
    );
  }

  const hash = createHash('sha1').update(fullUrl).digest('hex').slice(0, 8);
  const workdir = join(tmpdir(), `afterburn-${hash}`);

  // Remove leftover workdir from a previous failed run
  if (existsSync(workdir)) {
    await rm(workdir, { recursive: true, force: true });
  }

  let stdout: string;
  try {
    stdout = await spawnIngest(fullUrl, workdir);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }

  // Parse the last non-empty line of stdout as the JSON summary
  const lines = stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1] ?? '{}';

  let summary: Record<string, unknown>;
  try {
    summary = JSON.parse(lastLine);
  } catch {
    return NextResponse.json({ error: 'Failed to parse ingest output', raw: lastLine }, { status: 500 });
  }

  if (summary.status === 'clone_error' || summary.status === 'error') {
    return NextResponse.json({ error: summary.error ?? 'Clone failed' }, { status: 500 });
  }

  // Map ingest summary fields to the shape ConnectRepo / page.tsx expect
  return NextResponse.json({
    repo_url: fullUrl,
    status: summary.status,
    post_mortems_found: summary.post_mortems_processed ?? 0,
    files: summary.files ?? [],
    graph_node_count: summary.nodes_created ?? 0,
    graph_edge_count: summary.edges_created ?? 0,
    band_aid_count: summary.band_aid_count ?? 0,
    hot_zone_count: summary.hot_zone_count ?? 0,
    duration_ms: summary.duration_ms ?? 0,
    // surface "no post-mortems" without treating it as an HTTP error
    warning: summary.status === 'no_post_mortems_found'
      ? `No post-mortem files found. Scanned: ${(summary.scanned as string[] ?? []).join(', ') || '(none)'}`
      : undefined,
  });
}
