'use client';

import { useState } from 'react';
import StatusPill from '@/components/StatusPill';
import type { RepoStats } from '@/lib/types';

interface IngestResult extends RepoStats {
  warning?: string;
  files?: string[];
  duration_ms?: number;
}

interface ConnectRepoProps {
  onSuccess: (stats: RepoStats) => void;
  onNoResults?: () => void;
}

export default function ConnectRepo({ onSuccess, onNoResults }: ConnectRepoProps) {
  const [url, setUrl] = useState('https://github.com/PostHog/post-mortems');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/add-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Unknown error');
      setResult(data);
      if (data.warning) {
        // No post-mortems found — signal page without triggering a graph refetch
        onNoResults?.();
      } else {
        onSuccess(data);
      }
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
        Point afterburn at any public github.com repo. It will scan for post-mortem markdown files and build the causal graph.
      </p>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleConnect()}
          placeholder="https://github.com/your-org/repo"
          className="flex-1 text-sm border border-slate-300 rounded px-3 py-2 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
        />
        <button
          onClick={handleConnect}
          disabled={loading}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyzing…
            </span>
          ) : 'Add afterburn'}
        </button>
      </div>

      {loading && (
        <p className="mt-2 text-xs text-slate-500">
          Cloning and analyzing… this can take 30–90 seconds.
        </p>
      )}

      {error && (
        <div className="mt-3 rounded border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="text-xs font-medium text-rose-700">Connection failed</p>
          <p className="text-xs text-rose-600 mt-0.5">{error}</p>
          <button
            onClick={handleConnect}
            className="mt-2 text-xs text-rose-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {result?.warning && (
        <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-medium text-amber-700">No post-mortems found</p>
          <p className="text-xs text-amber-600 mt-0.5">
            No post-mortem files found in this repo. Showing previously ingested data below.
          </p>
          {result.warning && (
            <p className="text-xs text-amber-500 mt-1 font-mono">{result.warning}</p>
          )}
        </div>
      )}

      {result && !result.warning && (
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusPill
            label={`${result.post_mortems_found} post-mortem${result.post_mortems_found !== 1 ? 's' : ''}`}
            variant="success"
          />
          <StatusPill label={`${result.graph_node_count} nodes`} />
          <StatusPill label={`${result.graph_edge_count} edges`} />
          {result.band_aid_count > 0 && (
            <StatusPill label={`⚡ ${result.band_aid_count} band-aid`} variant="warning" />
          )}
          {result.hot_zone_count > 0 && (
            <StatusPill label={`🔥 ${result.hot_zone_count} hot zone${result.hot_zone_count !== 1 ? 's' : ''}`} variant="danger" />
          )}
          {result.hot_zone_count === 0 && (
            <StatusPill label="🔥 0 hot zones" variant="neutral" />
          )}
          {result.duration_ms && (
            <StatusPill label={`${(result.duration_ms / 1000).toFixed(1)}s`} variant="neutral" />
          )}
        </div>
      )}
    </div>
  );
}
