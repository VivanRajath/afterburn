import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const GRAPH_PATH = join(__dir, '..', '..', 'knowledge', 'incident-graph.json');

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

async function loadGraph() {
  return JSON.parse(await readFile(GRAPH_PATH, 'utf8'));
}

export async function run({ operation, files }) {
  if (operation !== 'incidents_touching_files') {
    throw new Error(`Unsupported operation: ${operation}. Only incidents_touching_files is implemented.`);
  }

  const graph = await loadGraph();
  const nodeById = Object.fromEntries(graph.nodes.map(n => [n.id, n]));

  // Normalise: accept bare file paths OR code-path: prefixed IDs, slugify to match graph node IDs
  const targetIds = new Set(files.map(f => {
    if (f.startsWith('code-path:')) return f;
    return `code-path:${slugify(f)}`;
  }));

  // All "touched" edges whose target is one of our files
  const touchedEdges = graph.edges.filter(e => e.type === 'touched' && targetIds.has(e.target));
  const incidentIds = [...new Set(touchedEdges.map(e => e.source))];

  // Count distinct incidents per code path for hot-zone detection
  const countByPath = {};
  for (const e of touchedEdges) {
    countByPath[e.target] = (countByPath[e.target] ?? 0) + 1;
  }
  const hot_zones = Object.entries(countByPath)
    .filter(([, c]) => c >= 3)
    .map(([code_path, incident_count]) => ({ code_path, incident_count }));

  // Build one summary object per matched incident
  const incidents = incidentIds.map(id => {
    const node = nodeById[id] ?? { id, properties: {} };
    const resolvedEdge = graph.edges.find(e => e.type === 'resolved' && e.target === id);
    const satisfiesEdge = resolvedEdge
      ? graph.edges.find(e => e.type === 'satisfies' && e.source === resolvedEdge.source)
      : null;
    const touched_paths = graph.edges
      .filter(e => e.type === 'touched' && e.source === id)
      .map(e => e.target.replace(/^code-path:/, ''));
    // Root cause: find a "caused" edge from any root-cause node
    const causedEdge = graph.edges.find(e => e.type === 'caused');
    const isBandAid =
      node.properties?.band_aid_candidate === true ||
      (!!resolvedEdge && !satisfiesEdge);

    return {
      id,
      touched_paths,
      root_cause_id: causedEdge?.source ?? null,
      resolved_by: resolvedEdge?.source ?? null,
      satisfies: !!satisfiesEdge,
      band_aid_candidate: isBandAid,
      ...node.properties,
    };
  });

  // Pattern nodes derived from incident summaries
  const patterns = [];
  for (const inc of incidents) {
    if (inc.band_aid_candidate) {
      patterns.push({
        type: 'band-aid',
        id: `pattern:band-aid:${inc.resolved_by ?? inc.id}`,
        severity: 'high',
      });
    }
  }
  for (const hz of hot_zones) {
    patterns.push({ type: 'hot-zone', id: `pattern:hot-zone:${hz.code_path}`, severity: 'medium' });
  }

  return { incidents, hot_zones, patterns };
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
