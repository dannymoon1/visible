"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

// A titled, horizontally scrolling row with prev/next arrows.
// Phones swipe; the arrows page by one screen of cards.
export default function CampaignRow({
  title,
  description,
  children,
  itemClassName = "w-[82%] sm:w-[46%] lg:w-[31.5%]",
  count,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode[];
  itemClassName?: string;
  count?: number;
  // Shown beside the arrows on every screen size (e.g. "See all")
  action?: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () =>
      setEdges({
        start: el.scrollLeft <= 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    // The observer fires once on attach, so the arrows start in the right state
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduced ? "auto" : "smooth" });
  };

  const titleId = `row-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section aria-labelledby={titleId}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={titleId} className="font-heading text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
            {title}
            {count !== undefined && <span className="ml-2 font-mono text-sm font-medium text-muted">{count}</span>}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {action}
          {!(edges.start && edges.end) && (
          <div className="hidden gap-1.5 sm:flex">
            <ArrowButton label={`Previous ${title}`} disabled={edges.start} onClick={() => page(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </ArrowButton>
            <ArrowButton label={`More ${title}`} disabled={edges.end} onClick={() => page(1)}>
              <ArrowRight className="h-4 w-4" />
            </ArrowButton>
          </div>
          )}
        </div>
      </div>

      <div
        ref={scroller}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:-mx-10 md:scroll-px-10 md:px-10 [&::-webkit-scrollbar]:hidden"
      >
        {children.map((child, i) => (
          <div key={i} className={cn("flex shrink-0 snap-start", itemClassName)}>
            {child}
          </div>
        ))}
      </div>
    </section>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink transition hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-signal active:scale-[0.94] disabled:cursor-default disabled:opacity-35 disabled:active:scale-100"
    >
      {children}
    </button>
  );
}
