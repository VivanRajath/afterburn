// v0.1 demo: returns pre-seeded state. v0.2 roadmap:
// - clone repo via simple-git
// - scan repo for post-mortems (markdown files in /post-mortems/
//   or matching naming patterns)
// - run ingest-incident skillflow per discovered file
// - return live graph state

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface GraphNode {
  type: string;
  properties?: { band_aid_candidate?: boolean };
}

interface PatternNode extends GraphNode {
  properties?: { band_aid_candidate?: boolean; pattern_type?: string };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url: string = body?.url ?? '';

  const graphPath = join(process.cwd(), 'agent', 'knowledge', 'incident-graph.json');
  const raw = await readFile(graphPath, 'utf8');
  const graph = JSON.parse(raw);

  const nodes: GraphNode[] = graph.nodes ?? [];
  const edges: unknown[] = graph.edges ?? [];

  const band_aid_count = nodes.filter(
    (n) => n.properties?.band_aid_candidate === true,
  ).length;

  const hot_zone_count = nodes.filter(
    (n: PatternNode) =>
      n.type === 'Pattern' && n.properties?.pattern_type === 'hot-zone',
  ).length;

  return NextResponse.json({
    repo_id: 'demo',
    url_received: url,
    post_mortems_found: 1,
    graph_node_count: nodes.length,
    graph_edge_count: edges.length,
    band_aid_count,
    hot_zone_count,
    status: 'ready',
  });
}
