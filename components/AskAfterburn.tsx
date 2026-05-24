'use client';

import { useState } from 'react';
import TierBadge from '@/components/TierBadge';
import type { CheckResult, Model } from '@/lib/types';

interface AskAfterburnProps {
  selectedModel: Model;
  onResult: (result: CheckResult) => void;
  lastResult: CheckResult | null;
}

export default function AskAfterburn({ selectedModel, onResult, lastResult }: AskAfterburnProps) {
  const [diff, setDiff] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadSample() {
    const res = await fetch('/api/sample-diff');
    const text = await res.text();
    setDiff(text);
  }

  async function handleCheck() {
    if (!diff.trim()) return;
    setLoading(true);
    onResult({});
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_id: 'demo', diff, model: selectedModel }),
      });
      const data: CheckResult = await res.json();
      onResult(data);
    } catch (e) {
      onResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  const hasResult = lastResult && (lastResult.tier || lastResult.error);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Ask afterburn about a PR</h2>
      <p className="text-xs text-slate-500 mt-0.5">
        Paste a diff. afterburn checks it against the graph and warns about historical patterns.
      </p>

      <textarea
        value={diff}
        onChange={(e) => setDiff(e.target.value)}
        placeholder="Paste a unified diff here..."
        rows={7}
        className="mt-4 w-full border border-slate-300 rounded px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none"
      />

      <div className="mt-3 flex gap-2">
        <button
          onClick={loadSample}
          className="px-3 py-2 text-xs font-medium border border-slate-300 rounded text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Load sample PR diff
        </button>
        <button
          onClick={handleCheck}
          disabled={loading || !diff.trim()}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading && (
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
          {loading ? 'Checking…' : 'Check'}
        </button>
      </div>

      {hasResult && (
        <div className="mt-5">
          {lastResult.error ? (
            <div className="border border-rose-200 bg-rose-50 rounded-lg p-4">
              <p className="text-sm font-medium text-rose-700">{lastResult.error}</p>
              {lastResult.hint && (
                <p className="text-xs text-rose-500 mt-1">{lastResult.hint}</p>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              {/* Header strip */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
                {lastResult.tier && <TierBadge tier={lastResult.tier} />}
                {lastResult.lessons_cited && lastResult.lessons_cited.length > 0 && (
                  <span className="text-xs text-slate-500">
                    Lessons cited: {lastResult.lessons_cited.join(', ')}
                  </span>
                )}
              </div>

              {/* Warning body */}
              <pre className="px-4 py-4 text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed bg-white">
                {lastResult.warning}
              </pre>

              {/* Footer */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
                Powered by gitclaw&nbsp;·&nbsp;Model: {lastResult.model_used}&nbsp;·&nbsp;
                {lastResult.elapsed_ms}ms
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
