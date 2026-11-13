import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// The left-aligned section opening (decided 2026-11-13): heading on the left,
// its supporting line on the right sitting on the heading's baseline; stacked
// and left-aligned on phones. Centring is kept for the big moments only:
// the hero, the guarantee and the closing panel.
export default function SectionHeader({ title, lead, className }: { title: ReactNode; lead?: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-end lg:gap-16", className)}>
      <h2 className="max-w-3xl font-heading text-[2.5rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-6xl">
        {title}
      </h2>
      {lead && <p className="max-w-md text-lg text-muted text-pretty lg:justify-self-end lg:pb-1.5">{lead}</p>}
    </div>
  );
}
