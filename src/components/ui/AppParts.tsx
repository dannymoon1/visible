"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Small pieces shared by the rebuilt app screens (Links, Run campaigns, …).

// Buttons: one orange action per screen, the rest quiet
const BUTTON_TONES = {
  signal: "bg-signal text-on-signal hover:brightness-[0.96]",
  ink: "bg-ink text-white hover:bg-ink/90",
  quiet: "bg-surface text-ink ring-1 ring-line hover:bg-page",
  ghost: "text-muted hover:bg-page hover:text-ink",
} as const;

export function pillButton(tone: keyof typeof BUTTON_TONES, className?: string) {
  return cn(
    "press inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-semibold whitespace-nowrap",
    "focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
    BUTTON_TONES[tone],
    className
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly { key: T; label: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-full bg-page p-1 ring-1 ring-line", className)} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "press inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
            value === o.key ? "bg-surface text-ink shadow-[0_1px_2px_rgb(20_22_26/0.08)] ring-1 ring-line" : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// The logo's ring of eight dots around the orange centre. `filled` dots are
// solid: used as a mark on empty states and as a campaign's progress
// (spots filled, or budget used) in lists.
export function RingMark({ filled = 0, className }: { filled?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-16 w-16", className)} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const on = i < filled;
        return (
          <circle
            key={i}
            cx={32 + Math.cos(a) * 22}
            cy={32 + Math.sin(a) * 22}
            r={5}
            className={on ? "fill-ink" : "fill-none stroke-line"}
            strokeWidth={2}
          />
        );
      })}
      <circle cx={32} cy={32} r={7} className="fill-signal" />
    </svg>
  );
}
