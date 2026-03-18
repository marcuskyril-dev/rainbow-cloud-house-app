interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100);

  return (
    <div
      className={`h-2 w-full rounded-pill bg-surface-muted overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-pill bg-olive transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
