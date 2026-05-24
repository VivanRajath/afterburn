// smoke-test-api.mjs
// POST /api/add-repo -> expect status:"ready"
// GET  /api/graph?repo_id=demo -> expect nodes.length > 0
// POST /api/check with sample diff -> expect tier:"architect"

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const BASE = 'http://localhost:3000';
const __dir = dirname(fileURLToPath(import.meta.url));

function pass(label, detail) {
  console.log(`  PASS  ${label}${detail ? ' — ' + detail : ''}`);
}

function fail(label, detail) {
  console.error(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
  process.exitCode = 1;
}

async function testAddRepo() {
  console.log('\n[1] POST /api/add-repo');
  const res = await fetch(`${BASE}/api/add-repo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://github.com/test/repo' }),
  });
  const data = await res.json();
  if (res.ok && data.status === 'ready') {
    pass('status: ready');
    pass(`graph_node_count: ${data.graph_node_count}, graph_edge_count: ${data.graph_edge_count}`);
    pass(`band_aid_count: ${data.band_aid_count}, hot_zone_count: ${data.hot_zone_count}`);
  } else {
    fail('add-repo', JSON.stringify(data));
  }
}

async function testGraph() {
  console.log('\n[2] GET /api/graph?repo_id=demo');
  const res = await fetch(`${BASE}/api/graph?repo_id=demo`);
  const data = await res.json();
  if (res.ok && Array.isArray(data.nodes) && data.nodes.length > 0) {
    pass(`nodes: ${data.nodes.length}`);
    pass(`links: ${data.links.length}`);
    const incident = data.nodes.find((n) => n.type === 'Incident');
    if (incident) pass(`incident node: ${incident.name}, group=${incident.group}, val=${incident.val}`);
    else fail('no Incident node found');
  } else {
    fail('graph', JSON.stringify(data));
  }
}

async function testCheck() {
  console.log('\n[3] POST /api/check with sample diff');
  const diffPath = join(__dir, '..', 'agent', 'examples', 'sample-pr', 'diff.patch');
  let diff;
  try {
    diff = await readFile(diffPath, 'utf8');
  } catch {
    fail('read sample diff', diffPath);
    return;
  }

  const res = await fetch(`${BASE}/api/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_id: 'demo', diff, model: 'anthropic' }),
  });
  const data = await res.json();

  if (res.status === 400 && data.hint) {
    // API key not set — expected in CI, show hint
    pass(`API key not configured (${data.error}) — ${data.hint}`);
    console.log('       Skipping tier assertion; key required for full check.');
    return;
  }

  if (res.ok && data.tier === 'architect') {
    pass(`tier: ${data.tier}`);
    pass(`lessons_cited: ${JSON.stringify(data.lessons_cited)}`);
    pass(`model_used: ${data.model_used}, elapsed_ms: ${data.elapsed_ms}`);
  } else {
    fail('check', JSON.stringify(data));
  }
}

console.log('afterburn API smoke test');
console.log(`target: ${BASE}`);

await testAddRepo();
await testGraph();
await testCheck();

console.log('\ndone.');
