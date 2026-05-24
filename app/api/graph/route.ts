import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, basename } from 'path';

const GROUP_MAP: Record<string, number> = {
  Service: 1,
  CodePath: 2,
  Incident: 3,
  RootCause: 4,
  Error: 4,
  Symptom: 4,
  Mitigation: 5,
  Lesson: 6,
  Pattern: 7,
};

const VAL_MAP: Record<string, number> = {
  Incident: 8,
  RootCause: 6,
  CodePath: 5,
  Service: 4,
  Mitigation: 4,
  Lesson: 4,
  Pattern: 10,
};

function deriveLabel(id: string, type: string): string {
  const slug = id.includes(':') ? id.slice(id.indexOf(':') + 1) : id;
  if (type === 'CodePath') return basename(slug);
  return slug.replace(/[-_]/g, ' ');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repo_id = searchParams.get('repo_id');

  if (repo_id !== 'demo') {
    return NextResponse.json({ error: 'unknown repo_id' }, { status: 404 });
  }

  const graphPath = join(process.cwd(), 'agent', 'knowledge', 'incident-graph.json');
  const raw = await readFile(graphPath, 'utf8');
  const graph = JSON.parse(raw);

  const nodes = (graph.nodes ?? []).map(
    (n: { id: string; type: string; properties?: Record<string, unknown> }) => ({
      id: n.id,
      name: deriveLabel(n.id, n.type),
      group: GROUP_MAP[n.type] ?? 4,
      type: n.type,
      val: VAL_MAP[n.type] ?? 3,
      properties: n.properties ?? {},
    }),
  );

  const links = (graph.edges ?? []).map(
    (e: {
      source: string;
      target: string;
      type: string;
      properties?: Record<string, unknown>;
    }) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      properties: e.properties ?? {},
    }),
  );

  return NextResponse.json({ nodes, links });
}
