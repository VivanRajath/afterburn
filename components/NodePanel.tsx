'use client';

import { useState } from 'react';
import type { GraphNode, GraphData } from '@/lib/types';
import { linkEndId } from '@/lib/types';

interface NodePanelProps {
  nodeId: string;
  graphData: GraphData;
  onClose: () => void;
}

function relativeTime(isoStr: string): string {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function codePathDisplay(codePathId: string, graphData: GraphData): string {
  const node = graphData.nodes.find((n) => n.id === codePathId);
  return (
    (node?.properties?.original_path as string | undefined) ??
    (node?.properties?.path as string | undefined) ??
    codePathId.replace('code-path:', '')
  );
}

function PropRow({ k, v }: { k: string; v: unknown }) {
  if (v === null || v === undefined || v === false) return null;
  return (
    <div className="flex gap-2 text-xs leading-relaxed">
      <span className="text-slate-400 shrink-0 min-w-[80px]">{k}</span>
      <span className="text-slate-200 break-all">{String(v)}</span>
    </div>
  );
}

const INCIDENT_TOP_FIELDS = new Set([
  'title', 'severity', 'status', 'started_at', 'description', 'summary',
  'band_aid_candidate', 'id',
]);

function IncidentPanel({ node, graphData, onClose }: { node: GraphNode; graphData: GraphData; onClose: () => void }) {
  const [showMore, setShowMore] = useState(false);

  const title = (node.properties?.title as string | undefined) ?? node.id;
  const severity = node.properties?.severity as string | undefined;
  const status = node.properties?.status as string | undefined;
  const startedAt = node.properties?.started_at as string | undefined;
  const description = (node.properties?.description ?? node.properties?.summary) as string | undefined;
  const isBandAid = node.properties?.band_aid_candidate === true;
  const descLong = description && description.split(' ').length > 30;

  const touchedPaths = graphData.links
    .filter((l) => l.type === 'touched' && linkEndId(l.source) === node.id)
    .map((l) => linkEndId(l.target));

  const resolvedBy = graphData.links
    .filter((l) => l.type === 'resolved' && linkEndId(l.target) === node.id)
    .map((l) => linkEndId(l.source));

  const satisfiesEdges = graphData.links.filter((l) => l.type === 'satisfies');

  const extraProps = Object.entries(node.properties).filter(([k]) => !INCIDENT_TOP_FIELDS.has(k));

  return (
    <div className="w-72 shrink-0 bg-slate-800 border-l border-slate-700 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-slate-700">
        <div className="min-w-0">
          <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">Incident</p>
          <p className="text-sm text-white font-semibold mt-1 break-words leading-snug">{title}</p>

          {/* Metadata row */}
          {(severity || status || startedAt) && (
            <p className="text-xs text-slate-500 mt-1 space-x-1">
              {severity && <span>{severity}</span>}
              {severity && status && <span>·</span>}
              {status && <span>{status}</span>}
              {(severity || status) && startedAt && <span>·</span>}
              {startedAt && <span>{relativeTime(startedAt)}</span>}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 ml-2 shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Band-aid callout */}
        {isBandAid && (
          <div className="rounded border border-rose-800 bg-rose-950 px-3 py-2">
            <p className="text-xs font-semibold text-rose-400">⚠ Band-aid pattern</p>
            <p className="text-xs text-rose-300 mt-0.5 leading-relaxed">
              The mitigation that closed this incident never satisfied the root cause.
              The underlying gap may still be open.
            </p>
          </div>
        )}

        {/* Description */}
        {description && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Description
            </p>
            <div
              className="text-xs text-slate-300 leading-relaxed overflow-hidden"
              style={{ maxHeight: showMore ? undefined : '3.9em' }}
            >
              {description}
            </div>
            {descLong && (
              <button
                onClick={() => setShowMore(!showMore)}
                className="text-xs text-slate-500 hover:text-slate-300 mt-1 underline"
              >
                {showMore ? 'Show less' : 'Show more'}
              </button>
            )}
          </section>
        )}

        {/* Touched files */}
        {touchedPaths.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Touched files
            </p>
            <ul className="space-y-1">
              {touchedPaths.map((p) => (
                <li key={p} className="text-xs font-mono text-emerald-400 break-all">
                  {codePathDisplay(p, graphData)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Resolved by */}
        {resolvedBy.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Resolved by
            </p>
            {resolvedBy.map((m) => {
              const hasSatisfies = satisfiesEdges.some((l) => linkEndId(l.source) === m);
              return (
                <div key={m}>
                  <p className="text-xs font-mono text-slate-300 break-all">
                    {m.replace('mitigation:', '')}
                  </p>
                  {!hasSatisfies && (
                    <p className="text-xs text-rose-400 mt-0.5">⚠ No satisfies edge — band-aid candidate</p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* Remaining properties grid */}
        {extraProps.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Properties
            </p>
            <div className="space-y-1.5">
              {extraProps.map(([k, v]) => <PropRow key={k} k={k} v={v} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function NodePanel({ nodeId, graphData, onClose }: NodePanelProps) {
  const node: GraphNode | undefined = graphData.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  if (node.type === 'Incident') {
    return <IncidentPanel node={node} graphData={graphData} onClose={onClose} />;
  }

  // ── Non-Incident nodes (original rendering) ──────────────────────────────
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
