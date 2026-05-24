export type Model = 'anthropic' | 'openai' | 'groq';

export interface RepoStats {
  post_mortems_found: number;
  graph_node_count: number;
  graph_edge_count: number;
  band_aid_count: number;
  hot_zone_count: number;
}

export interface GraphNode {
  id: string;
  name: string;
  group: number;
  type: string;
  val: number;
  properties: Record<string, unknown>;
  x?: number;
  y?: number;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface CheckResult {
  tier?: string;
  warning?: string;
  lessons_cited?: string[];
  matched_node_ids?: string[];
  model_used?: string;
  elapsed_ms?: number;
  error?: string;
  hint?: string;
}

export function linkEndId(v: string | GraphNode): string {
  return typeof v === 'string' ? v : v.id;
}
