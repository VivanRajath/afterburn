import { readFile, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import extract from './ontology-extractor.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const GRAPH_PATH = join(__dir, '..', '..', 'knowledge', 'incident-graph.json');
const PACE_MS = parseInt(process.env.AFTERBURN_INGEST_PACE_MS ?? '10000', 10);

const SKIP_DIRS = new Set(['.git', 'node_modules', 'vendor', '.next', 'dist', 'build']);
const PM_DIRS = new Set(['post-mortems', 'postmortems', 'incidents', 'post_mortems', 'outages']);
const PM_NAME_RE = /incident|postmortem|post-mortem|outage/i;
const PM_EXACT = new Set(['INCIDENTS.md', 'POSTMORTEMS.md', 'INCIDENT.md']);

// ─── ID normalization ─────────────────────────────────────────────────────────
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function canonicalId(rawId) {
  if (!rawId || typeof rawId !== 'string') return rawId;
  const id = rawId.trim();
  const colonIdx = id.indexOf(':');
  if (colonIdx === -1) return slugify(id);
  const prefix = id.slice(0, colonIdx).toLowerCase();
  const rest = id.slice(colonIdx + 1);
  return `${prefix}:${slugify(rest)}`;
}

// Re-normalize IDs in an already-loaded graph and fix up edge references
function normalizeGraph(graph) {
  const idMap = new Map();
  for (const node of graph.nodes) {
    const canonical = canonicalId(node.id);
    if (canonical !== node.id) {
      idMap.set(node.id, canonical);
      node.id = canonical;
    }
  }
  if (idMap.size > 0) {
    for (const edge of graph.edges) {
      if (idMap.has(edge.source)) edge.source = idMap.get(edge.source);
      if (idMap.has(edge.target)) edge.target = idMap.get(edge.target);
    }
  }
  // Deduplicate nodes that collide after normalization
  const seen = new Set();
  graph.nodes = graph.nodes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });
}

// ─── CLI arg parsing ──────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo_url') out.repo_url = args[++i];
    else if (args[i] === '--workdir') out.workdir = args[++i];
  }
  return out;
}

// ─── git clone with timeout ───────────────────────────────────────────────────
async function gitClone(repoUrl, workdir) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'git',
      ['clone', '--depth', '1', '--single-branch', '--no-tags', repoUrl, workdir],
      { stdio: 'pipe', env: { ...process.env } },
    );

    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('git clone timed out after 60s'));
    }, 60000);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`git clone exited ${code}: ${stderr.trim()}`));
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`git spawn error: ${err.message}`));
    });
  });
}

// ─── recursive file scanner ───────────────────────────────────────────────────
async function scanForPostMortems(dir, rootDir, found = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = join(dir, ent.name);

    if (ent.isDirectory()) {
      await scanForPostMortems(full, rootDir, found);
    } else if (ent.isFile() && ent.name.endsWith('.md')) {
      const parentName = basename(dir);
      const nameMatch = PM_NAME_RE.test(ent.name) || PM_EXACT.has(ent.name);
      const dirMatch = PM_DIRS.has(parentName);
      if (nameMatch || dirMatch) {
        let mtime = 0;
        try { mtime = (await stat(full)).mtimeMs; } catch { /* ignore */ }
        found.push({ full, rel: relative(rootDir, full), mtime });
      }
    }
  }
  return found;
}

// ─── graph merge helpers ──────────────────────────────────────────────────────
function mergeGraph(base, incoming) {
  // Normalize all incoming IDs before merging
  for (const node of incoming.nodes ?? []) {
    node.id = canonicalId(node.id);
  }
  for (const edge of incoming.edges ?? []) {
    edge.source = canonicalId(edge.source);
    edge.target = canonicalId(edge.target);
  }

  const nodeIds = new Set(base.nodes.map((n) => n.id));
  const edgeKeys = new Set(base.edges.map((e) => `${e.source}|${e.target}|${e.type}`));
  let dedupCount = 0;

  for (const node of incoming.nodes ?? []) {
    if (!nodeIds.has(node.id)) {
      base.nodes.push(node);
      nodeIds.add(node.id);
    } else {
      // Merge properties: existing first, incoming wins on conflict
      const existing = base.nodes.find((n) => n.id === node.id);
      if (existing && node.properties) {
        existing.properties = { ...(existing.properties ?? {}), ...node.properties };
      }
      dedupCount++;
    }
  }

  for (const edge of incoming.edges ?? []) {
    const key = `${edge.source}|${edge.target}|${edge.type}`;
    if (!edgeKeys.has(key)) {
      base.edges.push(edge);
      edgeKeys.add(key);
    }
  }

  return dedupCount;
}

// ─── post-processing ──────────────────────────────────────────────────────────
function applyPostProcessing(graph) {
  const edges = graph.edges;
  const nodesById = Object.fromEntries(graph.nodes.map((n) => [n.id, n]));

  // Band-aid detection: Mitigation resolved an Incident but has no satisfies edge
  const resolvedEdges = edges.filter((e) => e.type === 'resolved');
  const satisfiesEdges = edges.filter((e) => e.type === 'satisfies');
  const satisfiesSources = new Set(satisfiesEdges.map((e) => e.source));

  for (const re of resolvedEdges) {
    const mitigationId = re.source;
    const incidentId = re.target;
    if (!satisfiesSources.has(mitigationId)) {
      const incident = nodesById[incidentId];
      if (incident) {
        incident.properties = incident.properties ?? {};
        incident.properties.band_aid_candidate = true;
      }
    }
  }

  // Hot-zone detection: CodePath with >= 3 distinct incoming touched edges
  const touchCounts = {};
  for (const e of edges) {
    if (e.type === 'touched') {
      touchCounts[e.target] = (touchCounts[e.target] ?? new Set());
      touchCounts[e.target].add(e.source);
    }
  }

  const existingPatternIds = new Set(
    graph.nodes.filter((n) => n.type === 'Pattern').map((n) => n.id),
  );

  for (const [codePath, sources] of Object.entries(touchCounts)) {
    if (sources.size >= 3) {
      const patternId = `pattern:hot-zone:${codePath}`;
      if (!existingPatternIds.has(patternId)) {
        graph.nodes.push({
          id: patternId,
          type: 'Pattern',
          properties: {
            pattern_type: 'hot-zone',
            incident_count: sources.size,
            file: codePath.replace('code-path:', ''),
          },
        });
        const edgeKey = `${patternId}|${codePath}|member_of`;
        const edgeExists = graph.edges.some(
          (e) => `${e.source}|${e.target}|${e.type}` === edgeKey,
        );
        if (!edgeExists) {
          graph.edges.push({ source: patternId, target: codePath, type: 'member_of', properties: {} });
        }
        existingPatternIds.add(patternId);
      }
    }
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const start = Date.now();
  const { repo_url, workdir } = parseArgs();

  if (!repo_url || !workdir) {
    process.stderr.write(JSON.stringify({ error: 'Missing --repo_url or --workdir' }) + '\n');
    process.exit(1);
  }

  if (!repo_url.startsWith('https://github.com/')) {
    process.stderr.write(JSON.stringify({ error: 'repo_url must start with https://github.com/' }) + '\n');
    process.exit(1);
  }

  // Clone
  try {
    await gitClone(repo_url, workdir);
  } catch (err) {
    process.stdout.write(JSON.stringify({ status: 'clone_error', url: repo_url, error: err.message }) + '\n');
    process.exit(1);
  }

  // Scan for post-mortem files
  const allFiles = await scanForPostMortems(workdir, workdir);
  allFiles.sort((a, b) => b.mtime - a.mtime);
  const files = allFiles.slice(0, 5);

  if (files.length === 0) {
    await rm(workdir, { recursive: true, force: true });
    process.stdout.write(JSON.stringify({
      status: 'no_post_mortems_found',
      url: repo_url,
      scanned: allFiles.map((f) => f.rel),
    }) + '\n');
    process.exit(0);
  }

  // Load existing graph
  let graph = { version: '0.1.0', updated_at: '', nodes: [], edges: [] };
  try {
    const raw = await readFile(GRAPH_PATH, 'utf8');
    graph = JSON.parse(raw);
  } catch { /* start fresh if graph doesn't exist */ }

  // Normalize any un-canonical IDs written by prior runs
  normalizeGraph(graph);

  // Extract ontology from each file
  let nodesCreated = 0;
  let edgesCreated = 0;
  let nodesDeduplicated = 0;
  const processedFiles = [];

  for (let i = 0; i < files.length; i++) {
    const { full, rel } = files[i];

    if (i > 0) {
      console.log(`[pace] sleeping ${PACE_MS / 1000}s to respect Groq rate limits (file ${i + 1} of ${files.length})`);
      await new Promise((r) => setTimeout(r, PACE_MS));
    }

    let text;
    try {
      const raw = await readFile(full, 'utf8');
      text = raw.length > 50000 ? raw.slice(0, 50000) : raw;
    } catch {
      continue;
    }

    const incidentId = 'incident:' + createHash('sha1').update(rel).digest('hex').slice(0, 12);

    let extracted;
    try {
      extracted = await extract(text, incidentId);
    } catch (err) {
      process.stderr.write(`[warn] extraction failed for ${rel}: ${err.message}\n`);
      continue;
    }

    const beforeNodes = graph.nodes.length;
    const beforeEdges = graph.edges.length;
    const dedup = mergeGraph(graph, extracted);
    nodesCreated += graph.nodes.length - beforeNodes;
    edgesCreated += graph.edges.length - beforeEdges;
    nodesDeduplicated += dedup;
    processedFiles.push(rel);
  }

  // Post-processing
  applyPostProcessing(graph);

  // ── Dangling edge filter ──
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const validEdges = [];
  const droppedEdges = [];
  for (const edge of graph.edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      validEdges.push(edge);
    } else {
      droppedEdges.push({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        missing: !nodeIds.has(edge.source) ? edge.source : edge.target,
      });
    }
  }
  graph.edges = validEdges;
  if (droppedEdges.length > 0) {
    console.error(`[merge] dropped ${droppedEdges.length} dangling edges:`);
    for (const d of droppedEdges) {
      console.error(`  ${d.source} -[${d.type}]-> ${d.target}  (missing: ${d.missing})`);
    }
  }

  // Write graph
  graph.updated_at = new Date().toISOString();
  await writeFile(GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf8');

  // Cleanup clone
  await rm(workdir, { recursive: true, force: true });

  const band_aid_count = graph.nodes.filter(
    (n) => n.type === 'Incident' && n.properties?.band_aid_candidate === true,
  ).length;
  const hot_zone_count = graph.nodes.filter(
    (n) => n.type === 'Pattern' && n.properties?.pattern_type === 'hot-zone',
  ).length;

  process.stdout.write(JSON.stringify({
    status: 'ready',
    repo_url,
    post_mortems_processed: processedFiles.length,
    files: processedFiles,
    nodes_created: nodesCreated,
    edges_created: edgesCreated,
    nodes_deduplicated: nodesDeduplicated,
    dangling_edges_dropped: droppedEdges.length,
    band_aid_count,
    hot_zone_count,
    duration_ms: Date.now() - start,
  }) + '\n');
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ error: err.message }) + '\n');
  process.exit(1);
});
