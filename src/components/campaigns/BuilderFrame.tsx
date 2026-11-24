"use client";

import Link from "next/link";
import { Check, Eye, SealCheck, UsersThree } from "@phosphor-icons/react";
import { platformIcon } from "@/components/PlatformIcon";
import { BRAND_COLORS } from "@/components/icons/brands";
import { cn } from "@/lib/cn";
import type { CampaignType } from "@/lib/campaignOptions";

// The campaign builder's frame (campaign creation plan, screen 2): focus mode
// with its own top bar, a named stepper you can tap back through, and a live
// preview of the card creators will see.

export const BUILDER_STEPS = ["The campaign", "Where and when", "Budget and pay", "Review"] as const;

const TYPE_STYLE: Record<CampaignType, { label: string; icon: typeof UsersThree; tone: string }> = {
  open: { label: "Open", icon: UsersThree, tone: "text-[#C2610C] bg-[#FFF1E0] ring-[#F6D3AE]" },
  verified: { label: "Verified", icon: SealCheck, tone: "text-verified bg-verified/10 ring-verified/25" },
};

export function TypeChip({ type, onChange }: { type: CampaignType | null; onChange: () => void }) {
  if (!type) return null;
  const { label, icon: Icon, tone } = TYPE_STYLE[type];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full py-1 pr-1 pl-2.5 text-sm font-medium ring-1", tone)}>
      <Icon weight="fill" className="h-4 w-4" aria-hidden="true" />
      {label}
      <button
        type="button"
        onClick={onChange}
        className="press rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-ink hover:bg-white focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
        aria-label={`Change campaign type (now ${label})`}
      >
        Change
      </button>
    </span>
  );
}

export function BuilderTopBar({
  name,
  type,
  onChangeType,
  saved,
  onPreview,
}: {
  name: string;
  type: CampaignType | null;
  onChangeType: () => void;
  saved: boolean;
  onPreview: () => void;
}) {
  return (
    <div className="flex h-16 items-center gap-3">
      <Link href="/order" className="shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none" aria-label="Save and go back to your campaigns">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/v2/visibility-campaigns-icon-light.svg" alt="" className="h-8 w-8" />
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="truncate font-heading text-[1.05rem] font-semibold tracking-[-0.01em]">{name.trim() || "New campaign"}</span>
        <TypeChip type={type} onChange={onChangeType} />
      </div>
      <span
        className={cn("hidden items-center gap-1.5 text-sm text-muted transition-opacity sm:inline-flex", saved ? "opacity-100" : "opacity-0")}
        aria-live="polite"
      >
        <Check weight="bold" className="h-3.5 w-3.5" aria-hidden="true" />
        Draft saved
      </span>
      <button
        type="button"
        onClick={onPreview}
        className="press inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface lg:hidden"
      >
        <Eye className="h-4 w-4" aria-hidden="true" />
        Preview
      </button>
      <Link
        href="/order"
        className="press hidden h-9 items-center rounded-full px-3.5 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface sm:inline-flex"
      >
        Save and exit
      </Link>
    </div>
  );
}

// Named steps. Steps up to the furthest one reached can be tapped.
export function Stepper({ current, furthest, onGo }: { current: number; furthest: number; onGo: (index: number) => void }) {
  return (
    <>
      {/* Phones: where you are, and a thin progress line */}
      <div className="pb-3 sm:hidden">
        <p className="text-sm">
          <span className="font-semibold">{BUILDER_STEPS[current]}</span>
          <span className="text-muted">
            {" "}
            · {current + 1} of {BUILDER_STEPS.length}
          </span>
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ width: `${((current + 1) / BUILDER_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-center gap-2 pb-3.5 sm:flex" aria-label="Steps">
        {BUILDER_STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          const reachable = i <= furthest && !active;
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
              <button
                type="button"
                onClick={() => reachable && onGo(i)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group flex shrink-0 items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                  reachable && "hover:bg-surface",
                  !reachable && !active && "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full font-mono text-xs transition-colors",
                    done || (reachable && i < furthest) ? "bg-ink text-white" : active ? "bg-surface text-ink ring-2 ring-ink" : "bg-surface text-muted ring-1 ring-line"
                  )}
                >
                  {done ? <Check weight="bold" className="h-3 w-3" aria-hidden="true" /> : i + 1}
                </span>
                <span className={cn("whitespace-nowrap", active ? "font-semibold text-ink" : done || reachable ? "text-ink" : "text-muted")}>{label}</span>
              </button>
              {i < BUILDER_STEPS.length - 1 && (
                <span className={cn("h-px min-w-4 flex-1 transition-colors", i < current ? "bg-ink" : "bg-line")} aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}

// The card as creators will see it on Discover, building up as the brand types
export function CampaignPreview({
  name,
  brief,
  type,
  platforms,
  runs,
  bannerUrl,
  earnUpTo,
  rate,
}: {
  name: string;
  brief: string;
  type: CampaignType | null;
  platforms: string[];
  runs: string | null;
  bannerUrl: string;
  earnUpTo: string | null;
  rate: string | null;
}) {
  const style = type ? TYPE_STYLE[type] : null;
  const TypeIcon = style?.icon;
  return (
    <article className="overflow-hidden rounded-[1.5rem] bg-surface shadow-[0_18px_40px_-24px_rgb(20_22_26/0.35)] ring-1 ring-line">
      <div className="relative aspect-[16/9] overflow-hidden bg-[#14161A]">
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview of the file the brand picked
          <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_100%,rgb(255_106_26/0.55),transparent_60%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <p className="absolute inset-x-4 bottom-3 line-clamp-2 font-heading text-xl leading-tight font-semibold tracking-[-0.02em] text-white">
          {name.trim() || "Your campaign name"}
        </p>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          {style && TypeIcon ? (
            <span className={cn("inline-flex items-center gap-1 text-sm font-medium", type === "verified" ? "text-verified" : "text-[#C2610C]")}>
              <TypeIcon weight="fill" className="h-4 w-4" aria-hidden="true" />
              {style.label}
            </span>
          ) : (
            <span />
          )}
          <span className="flex items-center gap-1.5">
            {platforms.length ? (
              platforms.map((p) => {
                const Icon = platformIcon(p);
                return (
                  <span key={p} title={p} style={{ color: BRAND_COLORS[p] }}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-muted">No platforms yet</span>
            )}
          </span>
        </div>
        <p className={cn("line-clamp-3 text-sm text-pretty", brief.trim() ? "text-ink" : "text-muted")}>
          {brief.trim() || "Your brief shows here: what creators should say and must mention."}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
          <span className="text-muted">{runs ?? "Dates not set"}</span>
          {earnUpTo ? (
            <span className="rounded-full bg-signal/12 px-2.5 py-1 font-mono text-xs font-medium text-ink" title={rate ?? undefined}>
              Earn up to {earnUpTo}
            </span>
          ) : (
            <span className="text-xs text-muted">Pay set in Budget</span>
          )}
        </div>
      </div>
    </article>
  );
}
