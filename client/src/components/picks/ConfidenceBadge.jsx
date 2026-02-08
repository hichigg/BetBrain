function ConfidenceBadge({ confidence, size = 'md' }) {
  const value = Math.max(1, Math.min(10, confidence));

  let colorClass;
  if (value >= 8) colorClass = 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30';
  else if (value >= 5) colorClass = 'bg-amber-500/15 text-amber-400 ring-amber-500/30';
  else colorClass = 'bg-red-500/15 text-red-400 ring-red-500/30';

  const sizeClass = size === 'lg'
    ? 'text-lg font-bold w-10 h-10'
    : size === 'sm'
      ? 'text-[11px] font-semibold w-6 h-6'
      : 'text-sm font-bold w-8 h-8';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ring-1 ${colorClass} ${sizeClass}`}
      title={`Confidence: ${value}/10`}
    >
      {value}
    </span>
  );
}

export default ConfidenceBadge;
