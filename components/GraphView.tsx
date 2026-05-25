'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import NodePanel from '@/components/NodePanel';
import type { GraphData, GraphNode } from '@/lib/types';
import { linkEndId } from '@/lib/types';
import { extractSnippetForFile, findFileForCodePath } from '@/lib/diff-snippet';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
      Loading graph engine…
    </div>
  ),
});

const GROUP_COLORS: Record<number, string> = {
  1: '#3b82f6',  // Service      — blue
  2: '#10b981',  // CodePath     — emerald
  3: '#ef4444',  // Incident     — red
  4: '#f97316',  // RootCause/Error/Symptom — orange
  5: '#6b7280',  // Mitigation   — gray
  6: '#8b5cf6',  // Lesson       — purple
  7: '#eab308',  // Pattern      — yellow
};

interface GraphViewProps {
  graphData: GraphData | null;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  highlightedNodeIds?: string[];
  diff?: string;
}

export default function GraphView({ graphData, selectedNodeId, onSelectNode, highlightedNodeIds, diff }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphWidth, setGraphWidth] = useState(700);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Measure container width, re-measure when panel opens/closes
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setGraphWidth(containerRef.current.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [selectedNodeId]);

  // Deep-copy data so d3-force mutations don't affect our state
  const fgData = useMemo(() => {
    if (!graphData) return { nodes: [], links: [] };
    return {
      nodes: graphData.nodes.map((n) => ({ ...n })),
      links: graphData.links.map((l) => ({ ...l })),
    };
  }, [graphData]);

  const highlightSet = useMemo(() => {
    if (!highlightedNodeIds || highlightedNodeIds.length === 0 || !graphData) return null;
    const graphNodeIds = new Set(graphData.nodes.map((n) => n.id));
    const active = new Set(highlightedNodeIds.filter((id) => graphNodeIds.has(id)));
    return active.size > 0 ? active : null;
  }, [highlightedNodeIds, graphData]);

  const paintNode = useCallback(
    (rawNode: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as GraphNode & { x: number; y: number };
      const baseSize = node.val ?? 4;
      const color = GROUP_COLORS[node.group] ?? '#6b7280';
      const isHovered = hoveredNodeId === node.id;
      const isSelected = selectedNodeId === node.id;
      const isBandAid = node.properties?.band_aid_candidate === true;
      const isHighlighted = highlightSet === null || highlightSet.has(node.id);

      const opacity = isHighlighted ? 1 : 0.25;
      const size = isHighlighted && highlightSet !== null ? baseSize * 1.2 : baseSize;

      ctx.globalAlpha = opacity;

      // Glow for selected
      if (isSelected) {
        ctx.shadowBlur = 14;
        ctx.shadowColor = color;
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Pulsing red border for band-aid incidents
      if (isBandAid) {
        const pulse = (Math.sin(Date.now() * 0.003) + 1) / 2;
        ctx.lineWidth = 1.5 + pulse * 2;
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();
      } else if (isSelected) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'white';
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Label on hover or selection
      if (isHovered || isSelected) {
        const label = node.name ?? node.id;
        const fontSize = Math.min(14, Math.max(8, size * 1.4)) / globalScale;
        ctx.font = `bold ${fontSize}px ui-monospace, monospace`;
        const tw = ctx.measureText(label).width;
        const pad = 3 / globalScale;
        ctx.fillStyle = 'rgba(15,23,42,0.85)';
        ctx.fillRect(
          node.x - tw / 2 - pad,
          node.y + size + 2 / globalScale,
          tw + pad * 2,
          fontSize + pad * 2,
        );
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, node.x, node.y + size + 2 / globalScale + pad);
      }
    },
    [hoveredNodeId, selectedNodeId, highlightSet],
  );

  const bandAidCount = graphData?.nodes.filter(
    (n) => n.properties?.band_aid_candidate,
  ).length ?? 0;

  const selectedNode = graphData?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  // Compute tooltip content whenever hovered node or diff changes
  const tooltipContent = useMemo(() => {
    if (!hoveredNodeId || !diff || !diff.trim()) return null;
    const node = graphData?.nodes.find((n) => n.id === hoveredNodeId);
    if (!node) return null;

    const isHighlighted = highlightSet?.has(hoveredNodeId) ?? false;

    if (node.type === 'CodePath' && isHighlighted) {
      const filePath = findFileForCodePath(diff, hoveredNodeId);
      const snippet = filePath ? extractSnippetForFile(diff, filePath) : null;
      return { kind: 'codepath' as const, filePath: filePath ?? hoveredNodeId.replace('code-path:', ''), snippet };
    }

    if (node.type === 'Incident' && isHighlighted) {
      const title = (node.properties?.title as string | undefined)
        ?? (node.properties?.summary as string | undefined)?.split(' ').slice(0, 8).join(' ')
        ?? node.id;
      const summary = (node.properties?.summary as string | undefined)?.slice(0, 160);

      // Collect diff snippets for this incident's touched code paths
      const touchedSnippets: Array<{ filePath: string; snippet: string }> = [];
      if (graphData) {
        for (const link of graphData.links) {
          if (link.type !== 'touched' || linkEndId(link.source) !== hoveredNodeId) continue;
          const codePathId = linkEndId(link.target);
          const filePath = findFileForCodePath(diff, codePathId);
          if (filePath) {
            const snippet = extractSnippetForFile(diff, filePath);
            if (snippet) touchedSnippets.push({ filePath, snippet });
          }
        }
      }

      return { kind: 'incident' as const, title, summary, touchedSnippets };
    }

    // Dimmed or other node types — show basic info
    return { kind: 'basic' as const, type: node.type, name: node.name ?? node.id };
  }, [hoveredNodeId, diff, graphData, highlightSet]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Incident graph</h2>
        {graphData && (
          <p className="text-xs text-slate-500">
            {graphData.nodes.length} nodes&nbsp;·&nbsp;
            {graphData.links.length} edges&nbsp;·&nbsp;
            <span className={bandAidCount > 0 ? 'text-amber-600 font-medium' : ''}>
              {bandAidCount} band-aid pattern{bandAidCount !== 1 ? 's' : ''}
            </span>
            &nbsp;·&nbsp;0 hot zones
          </p>
        )}
      </div>

      {/* Graph area */}
      <div className="flex relative" style={{ height: 560 }}>
        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-900 overflow-hidden"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => { setMousePos(null); setHoveredNodeId(null); }}
        >
          {!graphData ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-2">
              <span className="text-3xl">⬡</span>
              <p className="text-sm">Connect a repo to visualise the causal graph</p>
            </div>
          ) : (
            <ForceGraph2D
              graphData={fgData}
              width={graphWidth}
              height={560}
              backgroundColor="#0f172a"
              nodeCanvasObject={paintNode}
              nodeCanvasObjectMode={() => 'replace'}
              onNodeClick={(node) => {
                const n = node as GraphNode;
                onSelectNode(selectedNodeId === n.id ? null : n.id);
              }}
              onNodeHover={(node) =>
                setHoveredNodeId(node ? (node as GraphNode).id : null)
              }
              linkColor={(link) => {
                if (!highlightSet) return '#334155';
                const { source, target } = link as { source: string | GraphNode; target: string | GraphNode };
                const srcId = typeof source === 'string' ? source : source.id;
                const tgtId = typeof target === 'string' ? target : target.id;
                return highlightSet.has(srcId) && highlightSet.has(tgtId) ? '#334155' : 'rgba(51,65,85,0.15)';
              }}
              linkWidth={(link) => {
                if (!highlightSet) return 1.2;
                const { source, target } = link as { source: string | GraphNode; target: string | GraphNode };
                const srcId = typeof source === 'string' ? source : source.id;
                const tgtId = typeof target === 'string' ? target : target.id;
                return highlightSet.has(srcId) && highlightSet.has(tgtId) ? 1.8 : 0.5;
              }}
              linkLabel={(l) => (l as { type: string }).type}
              linkDirectionalArrowLength={4}
              linkDirectionalArrowRelPos={1}
              cooldownTicks={120}
            />
          )}
        </div>

        {/* Side panel */}
        {selectedNode && graphData && (
          <NodePanel
            nodeId={selectedNode.id}
            graphData={graphData}
            onClose={() => onSelectNode(null)}
          />
        )}

        {/* Hover tooltip */}
        {tooltipContent && mousePos && (
          <div
            style={{
              position: 'absolute',
              left: mousePos.x + 420 + 16 > graphWidth
                ? Math.max(0, mousePos.x - 420 - 8)
                : mousePos.x + 16,
              top: Math.min(mousePos.y + 16, 560 - 8),
              width: 400,
              maxHeight: 320,
              pointerEvents: 'none',
              zIndex: 20,
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden"
          >
            {tooltipContent.kind === 'codepath' && (
              <>
                <div className="px-3 py-2 border-b border-slate-700 bg-slate-800">
                  <p className="text-xs font-semibold text-emerald-400 font-mono truncate">
                    {tooltipContent.filePath}
                  </p>
                </div>
                {tooltipContent.snippet ? (
                  <pre className="px-3 py-2 text-xs font-mono overflow-auto max-h-64 leading-relaxed">
                    {tooltipContent.snippet.split('\n').map((line, i) => (
                      <span
                        key={i}
                        className={
                          line.startsWith('+') && !line.startsWith('+++') ? 'text-emerald-400 block' :
                          line.startsWith('-') && !line.startsWith('---') ? 'text-rose-400 block' :
                          line.startsWith('@@') ? 'text-blue-400 block' :
                          'text-slate-300 block'
                        }
                      >{line || ' '}</span>
                    ))}
                  </pre>
                ) : (
                  <p className="px-3 py-2 text-xs text-slate-500">No diff snippet for this file.</p>
                )}
              </>
            )}

            {tooltipContent.kind === 'incident' && (
              <>
                <div className="px-3 py-2 border-b border-slate-700 bg-slate-800">
                  <p className="text-xs font-semibold text-rose-400">Incident</p>
                  <p className="text-xs text-white mt-0.5 font-semibold leading-snug">{tooltipContent.title}</p>
                </div>
                {tooltipContent.summary && (
                  <p className="px-3 py-2 text-xs text-slate-300 leading-relaxed border-b border-slate-800">
                    {tooltipContent.summary}
                  </p>
                )}
                {tooltipContent.touchedSnippets.map((ts) => (
                  <div key={ts.filePath}>
                    <p className="px-3 pt-2 text-xs font-mono text-emerald-400 truncate">{ts.filePath}</p>
                    <pre className="px-3 pb-2 text-xs font-mono overflow-auto max-h-32 leading-relaxed">
                      {ts.snippet.split('\n').map((line, i) => (
                        <span
                          key={i}
                          className={
                            line.startsWith('+') && !line.startsWith('+++') ? 'text-emerald-400 block' :
                            line.startsWith('-') && !line.startsWith('---') ? 'text-rose-400 block' :
                            line.startsWith('@@') ? 'text-blue-400 block' :
                            'text-slate-300 block'
                          }
                        >{line || ' '}</span>
                      ))}
                    </pre>
                  </div>
                ))}
              </>
            )}

            {tooltipContent.kind === 'basic' && (
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-slate-400">{tooltipContent.type}</p>
                <p className="text-xs text-slate-200 font-mono mt-0.5 break-all">{tooltipContent.name}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-slate-100 flex flex-wrap gap-3">
        {[
          { color: '#3b82f6', label: 'Service' },
          { color: '#10b981', label: 'Code path' },
          { color: '#ef4444', label: 'Incident' },
          { color: '#f97316', label: 'Root cause / Error' },
          { color: '#6b7280', label: 'Mitigation' },
          { color: '#8b5cf6', label: 'Lesson' },
          { color: '#eab308', label: 'Pattern' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
