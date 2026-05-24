'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import NodePanel from '@/components/NodePanel';
import type { GraphData, GraphNode } from '@/lib/types';

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
}

export default function GraphView({ graphData, selectedNodeId, onSelectNode }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphWidth, setGraphWidth] = useState(700);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

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

  const paintNode = useCallback(
    (rawNode: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = rawNode as GraphNode & { x: number; y: number };
      const size = node.val ?? 4;
      const color = GROUP_COLORS[node.group] ?? '#6b7280';
      const isHovered = hoveredNodeId === node.id;
      const isSelected = selectedNodeId === node.id;
      const isBandAid = node.properties?.band_aid_candidate === true;

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
    [hoveredNodeId, selectedNodeId],
  );

  const bandAidCount = graphData?.nodes.filter(
    (n) => n.properties?.band_aid_candidate,
  ).length ?? 0;

  const selectedNode = graphData?.nodes.find((n) => n.id === selectedNodeId) ?? null;

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
      <div className="flex" style={{ height: 560 }}>
        {/* Canvas */}
        <div ref={containerRef} className="flex-1 bg-slate-900 overflow-hidden">
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
              linkColor={() => '#334155'}
              linkWidth={1.2}
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
