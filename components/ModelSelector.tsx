'use client';

import type { Model } from '@/lib/types';

const MODELS: { id: Model; label: string }[] = [
  { id: 'anthropic', label: 'Anthropic' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'groq', label: 'Groq' },
];

interface ModelSelectorProps {
  selected: Model;
  onChange: (model: Model) => void;
}

export default function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {MODELS.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            selected === m.id
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          }`}
        >
          {m.label}
          {m.id === MODELS[0].id && selected === m.id && (
            <span className="ml-1 text-slate-500">▼</span>
          )}
        </button>
      ))}
    </div>
  );
}
