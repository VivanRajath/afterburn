'use client';

import { useState } from 'react';
import StatusPill from '@/components/StatusPill';
import type { RepoStats } from '@/lib/types';

interface ConnectRepoProps {
  onSuccess: (stats: RepoStats) => void;
}

export default function ConnectRepo({ onSuccess }: ConnectRepoProps) {
  const [url, setUrl] = useState('github.com/VivanRajath/demo-payments-service');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<RepoStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/add-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setStats(data);
      onSuccess(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Connect a repo</h2>
      <p className="text-xs text-slate-500 mt-0.5">
        Clones the repo, ingests post-mortems, builds the causal graph
      </p>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          placeholder="github.com/your-org/repo"
          className="flex-1 text-sm border border-slate-300 rounded px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
        />
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? 'Connecting…' : 'Add afterburn'}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-600">{error}</p>
      )}

      {stats && (
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill label={`${stats.post_mortems_found} post-mortem${stats.post_mortems_found !== 1 ? 's' : ''}`} variant="success" />
          <StatusPill label={`${stats.graph_node_count} nodes`} />
          <StatusPill label={`${stats.graph_edge_count} edges`} />
          {stats.band_aid_count > 0 && (
            <StatusPill label={`⚡ ${stats.band_aid_count} band-aid`} variant="warning" />
          )}
          {stats.hot_zone_count > 0 && (
            <StatusPill label={`🔥 ${stats.hot_zone_count} hot zone${stats.hot_zone_count !== 1 ? 's' : ''}`} variant="danger" />
          )}
          {stats.hot_zone_count === 0 && (
            <StatusPill label="🔥 0 hot zones" variant="neutral" />
          )}
        </div>
      )}
    </div>
  );
}
