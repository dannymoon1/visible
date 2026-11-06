"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Bell, ChevronsUpDown, Home, LayoutGrid, Plus, Sparkles, UserRound, type LucideIcon } from "lucide-react";
import { BASE, BUSINESS, naira } from "@/lib/demo/adiaha";
import { cn } from "@/lib/cn";

// The business app's frame.
//
//   phones  → a slim top bar (business switcher, updates) and a floating dark
//             dock at the thumb, the way TikTok and Instagram work, with
//             "Start a campaign" as the raised centre button
//   desktop → a left sidebar after contentrewards.com: business switcher on
//             top, the same four places, the one orange action, the wallet
//
// Same four places everywhere, same names, so people learn it once.

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  { href: BASE, label: "Home", icon: Home, match: (p) => p === BASE },
  { href: `${BASE}/campaigns`, label: "Campaigns", icon: LayoutGrid, match: (p) => p.startsWith(`${BASE}/campaigns`) },
  { href: `${BASE}/results`, label: "Results", icon: Sparkles, match: (p) => p.startsWith(`${BASE}/results`) },
  { href: `${BASE}/me`, label: "Me", icon: UserRound, match: (p) => p.startsWith(`${BASE}/me`) },
];

export default function BusinessShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? BASE;
  const building = path.startsWith(`${BASE}/new`);

  return (
    <div className="min-h-dvh bg-page text-ink lg:grid lg:grid-cols-[16.5rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href={BASE} className="flex items-center gap-2.5 px-2" aria-label="Visibility Campaigns home">
          <img src="/logo/v2/visibility-campaigns-icon-light.svg" alt="" className="h-7 w-7 dark:hidden" />
          <img src="/logo/v2/visibility-campaigns-icon-dark.svg" alt="" className="hidden h-7 w-7 dark:block" />
          <span className="font-heading text-[0.95rem] leading-none font-semibold">Visibility</span>
        </Link>

        <BusinessSwitcher className="mt-6" />

        <nav className="mt-6 flex flex-col gap-0.5" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon, match }) => {
            const on = match(path);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "press flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] transition-colors",
                  on ? "bg-page font-medium text-ink" : "text-muted hover:text-ink"
                )}
              >
                <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={on ? 2.2 : 1.8} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <Link
          href={`${BASE}/new`}
          className="press mt-6 flex h-11 items-center justify-center gap-2 rounded-full bg-ember font-heading text-[0.95rem] font-semibold text-on-signal"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
          Start a campaign
        </Link>

        <div className="mt-auto rounded-2xl bg-page p-4">
          <p className="text-sm text-muted">Wallet</p>
          <p className="mt-0.5 font-mono text-xl tabular-nums">{naira(BUSINESS.wallet)}</p>
          <p className="mt-1 text-xs text-muted">Includes {naira(BUSINESS.credit)} credit from an unfilled spot</p>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-page/85 px-4 backdrop-blur-md lg:hidden">
          <BusinessSwitcher compact />
          <button type="button" className="press relative flex h-10 w-10 items-center justify-center rounded-full" aria-label="Updates, 2 new">
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-signal ring-2 ring-page" />
          </button>
        </header>

        <main className={cn("mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16", building ? "pb-36" : "pb-32")}>
          {children}
        </main>
      </div>

      {/* Phone dock (hidden while building a campaign: the builder has its own bottom bar) */}
      {!building && (
        <nav
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex h-16 max-w-md items-center justify-around rounded-[1.6rem] bg-[#14161A] px-2 shadow-[0_18px_40px_-14px_rgb(20_22_26/0.55)] lg:hidden"
          aria-label="Main"
        >
          {NAV.slice(0, 2).map((item) => (
            <DockItem key={item.href} {...item} on={item.match(path)} />
          ))}
          <Link
            href={`${BASE}/new`}
            className="press -mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-ember text-on-signal shadow-[0_10px_24px_-6px_rgb(255_106_26/0.75)] ring-[5px] ring-page"
            aria-label="Start a campaign"
          >
            <Plus className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
          </Link>
          {NAV.slice(2).map((item) => (
            <DockItem key={item.href} {...item} on={item.match(path)} />
          ))}
        </nav>
      )}
    </div>
  );
}

function DockItem({ href, label, icon: Icon, on }: { href: string; label: string; icon: LucideIcon; on: boolean }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={cn("press flex w-14 flex-col items-center gap-1 py-1 text-[0.68rem]", on ? "text-white" : "text-[#8D94A0]")}
    >
      <Icon className="h-5 w-5" strokeWidth={on ? 2.3 : 1.8} aria-hidden="true" />
      {label}
    </Link>
  );
}

function BusinessSwitcher({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "press flex items-center gap-2.5 rounded-2xl text-left",
        compact ? "-ml-1 px-1 py-1" : "w-full border border-line px-2.5 py-2.5",
        className
      )}
      aria-label={`${BUSINESS.name}. Switch business`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F6D7B8,#C98B5E)] font-heading text-sm font-semibold text-[#2A1A10]">
        {BUSINESS.initial}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[0.95rem] font-semibold">{BUSINESS.name}</span>
        {!compact && <span className="block text-xs text-muted">{BUSINESS.area}</span>}
      </span>
      <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
    </button>
  );
}
