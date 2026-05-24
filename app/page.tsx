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

  const handleRepoSuccess = useCallback(async (stats: RepoStats) => {
    setRepoState({ ready: true, stats });
    setSelectedNodeId(null);
    const res = await fetch('/api/graph?repo_id=demo');
    const data: GraphData = await res.json();
    setGraphData(data);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header selectedModel={selectedModel} setSelectedModel={setSelectedModel} />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <ConnectRepo onSuccess={handleRepoSuccess} />

        <GraphView
          graphData={graphData}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />

        <AskAfterburn
          selectedModel={selectedModel}
          onResult={setLastCheckResult}
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
