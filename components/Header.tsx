import ModelSelector from '@/components/ModelSelector';
import type { Model } from '@/lib/types';

interface HeaderProps {
  selectedModel: Model;
  setSelectedModel: (m: Model) => void;
}

export default function Header({ selectedModel, setSelectedModel }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div>
          <span className="text-white font-semibold tracking-tight">afterburn</span>
          <span className="ml-3 text-slate-400 text-xs hidden sm:inline">
            Production-readiness intelligence for any repo
          </span>
        </div>
        <ModelSelector selected={selectedModel} onChange={setSelectedModel} />
      </div>
    </header>
  );
}
