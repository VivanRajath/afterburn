'use client';

import { useState, useCallback } from 'react';
import Header from '@/components/Header';
import ConnectRepo from '@/components/ConnectRepo';
import GraphView from '@/components/GraphView';
import AskAfterburn from '@/components/AskAfterburn';
import type { Model, RepoStats, GraphData, CheckResult } from '@/lib/types';

type RepoState = { ready: false } | { ready: true; stats: RepoStats };

export default function Page() {
  const [selectedModel, setSelectedModel] = useState<Model>('anthropic');
  const [repoState, setRepoState] = useState<RepoState>({ ready: false });
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<CheckResult | null>(null);
  const [showStaleBanner, setShowStaleBanner] = useState(false);
  const [diff, setDiff] = useState('');
  const [staleHighlight, setStaleHighlight] = useState(false);

  const handleRepoSuccess = useCallback(async (stats: RepoStats) => {
    setShowStaleBanner(false);
    setRepoState({ ready: true, stats });
    setSelectedNodeId(null);
    const res = await fetch('/api/graph?repo_id=demo');
    const data: GraphData = await res.json();
    setGraphData(data);
  }, []);

  const handleNoResults = useCallback(() => {
    setShowStaleBanner(true);
  }, []);

  // When diff changes after a check has run, mark highlights as stale
  const handleDiffChange = useCallback((newDiff: string) => {
    setDiff(newDiff);
    setStaleHighlight((prev) => prev || lastCheckResult !== null);
  }, [lastCheckResult]);

  // New check result resets the stale flag
  const handleResult = useCallback((result: CheckResult) => {
    setLastCheckResult(result);
    setStaleHighlight(false);
  }, []);

  // Clear resets everything
  const handleClear = useCallback(() => {
    setLastCheckResult(null);
    setDiff('');
    setStaleHighlight(false);
  }, []);

  const hasGraphData = graphData !== null && graphData.nodes.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Header selectedModel={selectedModel} setSelectedModel={setSelectedModel} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <ConnectRepo onSuccess={handleRepoSuccess} onNoResults={handleNoResults} />

        {showStaleBanner && hasGraphData && (
          <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-500 shadow-sm">
            <span>📊</span>
            <span>Showing graph from previous ingestion. Connect a repo with post-mortems to populate fresh data.</span>
          </div>
        )}

        {staleHighlight && lastCheckResult && (
          <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 shadow-sm">
            <span>↻</span>
            <span>Diff has changed since last check. Click Check to refresh highlights.</span>
          </div>
        )}

        <GraphView
          graphData={graphData}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          highlightedNodeIds={lastCheckResult?.matched_node_ids}
          diff={diff}
          staleHighlight={staleHighlight}
        />

        <AskAfterburn
          selectedModel={selectedModel}
          diff={diff}
          onDiffChange={handleDiffChange}
          onResult={handleResult}
          onClear={handleClear}
          lastResult={lastCheckResult}
        />
      </main>

      <footer className="border-t border-slate-200 py-6 mt-8">
        <p className="text-center text-xs text-slate-400">
          Built on the{' '}
          <a
            href="https://www.gitagent.sh/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            gitagent
          </a>{' '}
          open standard&nbsp;·&nbsp;github.com/VivanRajath/afterburn
        </p>
      </footer>
    </div>
  );
}
