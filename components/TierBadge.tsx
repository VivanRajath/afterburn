const TIER_CONFIG: Record<string, { label: string; className: string }> = {
  jnr: {
    label: 'no warning',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  snr: {
    label: 'standard warning',
    className: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  architect: {
    label: 'deep pattern detected',
    className: 'bg-rose-100 text-rose-800 border-rose-300',
  },
};

export default function TierBadge({ tier }: { tier: string }) {
  const cfg = TIER_CONFIG[tier] ?? TIER_CONFIG.jnr;
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
