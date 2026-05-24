'use client';

import type { GraphNode, GraphData } from '@/lib/types';
import { linkEndId } from '@/lib/types';

interface NodePanelProps {
  nodeId: string;
  graphData: GraphData;
  onClose: () => void;
}

function PropRow({ k, v }: { k: string; v: unknown }) {
  if (v === null || v === undefined) return null;
  return (
    <div className="flex gap-2 text-xs leading-relaxed">
      <span className="text-slate-400 shrink-0 min-w-[80px]">{k}</span>
      <span className="text-slate-200 break-all">{String(v)}</span>
    </div>
  );
}

export default function NodePanel({ nodeId, graphData, onClose }: NodePanelProps) {
  const node: GraphNode | undefined = graphData.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  const touchedPaths = graphData.links
    .filter((l) => l.type === 'touched' && linkEndId(l.source) === nodeId)
    .map((l) => linkEndId(l.target));

  const resolvedBy = graphData.links
    .filter((l) => l.type === 'resolved' && linkEndId(l.target) === nodeId)
    .map((l) => linkEndId(l.source));

  const rootCauses = graphData.links
    .filter((l) => l.type === 'caused' && linkEndId(l.target) !== nodeId)
    .map((l) => linkEndId(l.source));

  const satisfiesEdges = graphData.links.filter((l) => l.type === 'satisfies');

  return (
    <div className="w-72 shrink-0 bg-slate-800 border-l border-slate-700 overflow-y-auto">
      <div className="flex items-start justify-between p-4 border-b border-slate-700">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{node.type}</p>
          <p className="text-sm text-white font-mono mt-0.5 break-all leading-tight">{node.name}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 ml-2 shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Properties */}
        <section>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Properties
          </p>
          <div className="space-y-1.5">
            {Object.entries(node.properties).map(([k, v]) => (
              <PropRow key={k} k={k} v={v} />
            ))}
            {Object.keys(node.properties).length === 0 && (
              <p className="text-xs text-slate-600">—</p>
            )}
          </div>
        </section>

        {/* Incident-specific context */}
        {node.type === 'Incident' && (
          <>
            {touchedPaths.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Touched files
                </p>
                <ul className="space-y-1">
                  {touchedPaths.map((p) => (
                    <li key={p} className="text-xs font-mono text-emerald-400 break-all">
                      {p.replace('code-path:', '')}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {resolvedBy.length > 0 && (
              <section>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Resolved by
                </p>
                {resolvedBy.map((m) => {
                  const hasSatisfies = satisfiesEdges.some(
                    (l) => linkEndId(l.source) === m,
                  );
                  return (
                    <div key={m}>
                      <p className="text-xs font-mono text-slate-300 break-all">
                        {m.replace('mitigation:', '')}
                      </p>
                      {!hasSatisfies && (
                        <p className="text-xs text-rose-400 mt-0.5">
                          ⚠ No satisfies edge — band-aid candidate
                        </p>
                      )}
                    </div>
                  );
                })}
              </section>
            )}
          </>
        )}

        {/* Pattern-specific context */}
        {node.type === 'Pattern' && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Related incidents
            </p>
            {graphData.links
              .filter((l) => l.type === 'member_of' && linkEndId(l.target) === nodeId)
              .map((l) => (
                <p key={linkEndId(l.source)} className="text-xs font-mono text-slate-300">
                  {linkEndId(l.source)}
                </p>
              ))}
          </section>
        )}

        {/* Root causes (from graph links for RootCause nodes) */}
        {node.type === 'RootCause' && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Causes
            </p>
            {graphData.links
              .filter((l) => l.type === 'caused' && linkEndId(l.source) === nodeId)
              .map((l) => (
                <p key={linkEndId(l.target)} className="text-xs font-mono text-orange-300 break-all">
                  {linkEndId(l.target)}
                </p>
              ))}
          </section>
        )}
      </div>
    </div>
  );
}
