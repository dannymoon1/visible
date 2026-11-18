"use client";

import { createElement, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Compass, Search, SlidersHorizontal, X } from "lucide-react";
import { platformIcon } from "@/components/PlatformIcon";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/types";
import { CampaignCard } from "./CampaignCard";
import { BUDGETS, DEFAULT_FILTERS, SORTS, type BudgetKey, type CatalogueFilters, type SortKey } from "./discover-data";

// ---------------------------------------------------------
// Floating search: sticks to the bottom of the screen. "/" focuses it.

export function FloatingSearch({
  value,
  onChange,
  onSubmit,
  placeholder = "Search campaigns, e.g. TikTok",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== "/" || target?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit?.(value);
  };

  return (
    <div className="pointer-events-none sticky bottom-4 z-30 mt-12 flex justify-center sm:bottom-5">
      <form
        role="search"
        onSubmit={submit}
        className="pointer-events-auto flex h-12 w-full max-w-md items-center gap-3 rounded-full border border-line bg-surface/90 pr-2 pl-4 shadow-[0_12px_40px_-12px_rgb(20_22_26/0.35)] backdrop-blur-xl focus-within:border-signal"
      >
        <Search className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden="true" />
        <label htmlFor="campaign-search" className="sr-only">
          Search campaigns
        </label>
        <input
          id="campaign-search"
          ref={ref}
          type="search"
          enterKeyHint="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onChange("")}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Clear search"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden rounded-md border border-line px-2 py-0.5 font-mono text-xs text-muted sm:block">/</kbd>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------
// Sort / category / budget / social toolbar. One row; scrolls sideways on phones.

export function FilterToolbar({
  filters,
  onChange,
  categories,
  platforms,
}: {
  filters: CatalogueFilters;
  onChange: (next: CatalogueFilters) => void;
  categories: string[];
  platforms: string[];
}) {
  const set = <K extends keyof CatalogueFilters>(key: K, value: CatalogueFilters[K]) => onChange({ ...filters, [key]: value });
  const activeCount =
    (filters.sort !== "recommended" ? 1 : 0) +
    (filters.category !== "all" ? 1 : 0) +
    (filters.budget !== "any" ? 1 : 0) +
    filters.socials.length;

  const toggleSocial = (p: string) =>
    set("socials", filters.socials.includes(p) ? filters.socials.filter((x) => x !== p) : [...filters.socials, p]);

  return (
    <div className="-mx-4 sm:-mx-6 md:-mx-10">
      <div
        role="toolbar"
        aria-label="Sort and filter campaigns"
        className="flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:px-6 md:px-10 [&::-webkit-scrollbar]:hidden"
      >
        <span className="flex h-10 shrink-0 items-center gap-1.5 pr-1 text-sm font-medium text-muted">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Filter</span>
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1.5 font-mono text-[11px] text-on-signal">
              {activeCount}
            </span>
          )}
        </span>

        <SelectPill label="Sort" value={filters.sort} onChange={(v) => set("sort", v as SortKey)} active={filters.sort !== "recommended"}>
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </SelectPill>

        <SelectPill label="Category" value={filters.category} onChange={(v) => set("category", v)} active={filters.category !== "all"}>
          <option value="all">All</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectPill>

        <SelectPill label="Budget" value={filters.budget} onChange={(v) => set("budget", v as BudgetKey)} active={filters.budget !== "any"}>
          {BUDGETS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </SelectPill>

        {platforms.length > 0 && <span className="mx-1 h-6 w-px shrink-0 bg-line" aria-hidden="true" />}

        {platforms.map((p) => {
          const on = filters.socials.includes(p);
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => toggleSocial(p)}
              className={cn(
                "flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition active:scale-[0.96]",
                on ? "border-ink bg-ink text-page" : "border-line bg-surface text-ink hover:border-muted/50"
              )}
            >
              {createElement(platformIcon(p), { className: "h-4 w-4", "aria-hidden": true })}
              {p}
            </button>
          );
        })}

        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS, q: filters.q })}
            className="flex h-10 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

// A native select dressed as a pill: phones get the system picker, and the
// menu can't be clipped by the scrolling toolbar
function SelectPill({
  label,
  value,
  onChange,
  active,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex h-10 shrink-0 items-center rounded-full border text-sm transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-signal",
        active ? "border-ink bg-ink text-page" : "border-line bg-surface text-ink hover:border-muted/50"
      )}
    >
      <span className={cn("pointer-events-none pl-3.5", active ? "text-page/70" : "text-muted")}>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full cursor-pointer appearance-none bg-transparent pr-8 pl-1.5 font-medium outline-none [field-sizing:content] [&>option]:bg-[#FFFFFF] [&>option]:text-[#14161A]"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4" aria-hidden="true" />
    </label>
  );
}

// ---------------------------------------------------------

export function SeeAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-muted/50 focus-visible:outline-2 focus-visible:outline-signal active:scale-[0.96]"
    >
      See all
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

export function CampaignGrid({ tasks, joined }: { tasks: Task[]; joined: Set<string> }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
      {tasks.map((task) => (
        <CampaignCard key={task.id} task={task} joined={joined.has(task.id)} className="w-full" />
      ))}
    </div>
  );
}

export function DiscoverEmpty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-line bg-surface px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-page text-muted">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-heading text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      <div className="mt-5">
        {action ?? (
          <Link href="/tasks" className="text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4">
            Go to my campaigns
          </Link>
        )}
      </div>
    </div>
  );
}

export function RowsSkeleton({ featured = true }: { featured?: boolean }) {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading campaigns">
      {featured && <div className="skeleton h-[300px] rounded-[28px] sm:h-[340px]" />}
      {[0, 1].map((row) => (
        <div key={row}>
          <div className="skeleton mb-4 h-6 w-48" />
          <div className="flex gap-4 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-[300px] w-[82%] shrink-0 rounded-[20px] sm:w-[46%] lg:w-[31.5%]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4" aria-busy="true" aria-label="Loading campaigns">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="skeleton h-[300px] rounded-[20px]" />
      ))}
    </div>
  );
}
