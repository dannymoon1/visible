import { cn } from "@/lib/cn";

// A small area chart of a series, scaled to its own maximum. Pass `days`
// to label the x-axis.
export default function Sparkline({
  values,
  days,
  className,
  id,
}: {
  values: number[];
  days?: string[];
  className?: string;
  id: string;
}) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [(i / Math.max(1, values.length - 1)) * 100, 38 - (v / max) * 34] as const);
  // Smooth the line with simple cubic segments between points
  const line = pts
    .map(([x, y], i) => {
      if (i === 0) return `M${x} ${y}`;
      const [px, py] = pts[i - 1]!;
      const cx = (px + x) / 2;
      return `C${cx} ${py} ${cx} ${y} ${x} ${y}`;
    })
    .join(" ");
  return (
    <div className={cn("w-full", className)}>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-signal)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--color-signal)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L100 40 L0 40 Z`} fill={`url(#${id})`} />
        <path d={line} fill="none" stroke="var(--color-signal)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
      </svg>
      {days && (
        <div className="mt-2 flex justify-between text-xs text-muted">
          {days.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
      )}
    </div>
  );
}
