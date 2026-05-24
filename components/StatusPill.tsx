interface StatusPillProps {
  label: string;
  variant?: 'neutral' | 'warning' | 'danger' | 'success';
}

const VARIANTS = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function StatusPill({ label, variant = 'neutral' }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${VARIANTS[variant]}`}
    >
      {label}
    </span>
  );
}
