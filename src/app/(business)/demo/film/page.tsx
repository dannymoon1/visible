"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Bell,
  Check,
  ChevronsUpDown,
  Globe,
  Home,
  LayoutGrid,
  MapPin,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import CreatorAvatar from "@/components/site/CreatorAvatar";
import { GatheringRing } from "@/components/app/GatheringRing";
import { PostImage, StatusChip } from "@/components/app/parts";
import { BUSINESS, CAMPAIGN, POSTS, SPOTS, TOTALS, count, type SpotState } from "@/lib/demo/adiaha";
import { cn } from "@/lib/cn";

// The homepage film: the business app performing the four steps of How it
// works, on a timeline, at phone size (360 × 736, the phone render's glass).
// Recorded frame by frame by the founder's tooling; ?t=7.5 freezes a moment
// (used for the phone stills). Every frame is a pure function of t, so the
// recording is perfectly smooth.
//
//   Brief  0.0 – 5.0   the brief types itself, a goal is picked, Find creators
//   Gather 5.0 – 9.5   creators join the ring and get verified
//   Post   9.5 – 14.0  posts arrive
//   Report 14.0 – 19.0 the results count up, then what our checks removed
// Keep in step with FILM_STEPS in HowItWorks.tsx
const SCENES = [0, 5, 9.5, 14, 19] as const;

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (x: number) => 1 - Math.pow(1 - x, 3);

export default function Film() {
  const [t, setT] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // ?rec: the recorder sets each frame's time itself (window.__filmAt)
    if (params.has("rec")) {
      (window as Window & { __filmAt?: (v: number) => void }).__filmAt = (v) => setT(v);
      return;
    }
    const fixed = params.get("t");
    if (fixed !== null) {
      setT(Number(fixed));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const s = (now - start) / 1000;
      setT(Math.min(s, SCENES[4]));
      if (s < SCENES[4]) raf = requestAnimationFrame(tick);
      else document.documentElement.dataset.filmDone = "true";
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const scene = t < SCENES[1] ? 0 : t < SCENES[2] ? 1 : t < SCENES[3] ? 2 : 3;

  return (
    <div className="flex min-h-dvh items-start justify-center bg-[#d8d8d8]">
      <div className="relative h-[736px] w-[360px] overflow-hidden bg-page text-ink">
        <StatusBar />
        <div className="absolute inset-x-0 top-[34px] bottom-0 overflow-hidden">
        <Scene t={t} from={SCENES[0]} to={SCENES[1]} first>
          <BriefScene t={t} />
        </Scene>
        <Scene t={t} from={SCENES[1]} to={SCENES[2]}>
          <AppFrame tab="Creators">
            <GatherScene t={t - SCENES[1]} />
          </AppFrame>
        </Scene>
        <Scene t={t} from={SCENES[2]} to={SCENES[3]}>
          <AppFrame tab="Posts">
            <PostScene t={t - SCENES[2]} />
          </AppFrame>
        </Scene>
        <Scene t={t} from={SCENES[3]} to={SCENES[4]} last>
          <AppFrame tab="Report">
            <ReportScene t={t - SCENES[3]} />
          </AppFrame>
        </Scene>
        {scene > 0 && <Dock />}
        </div>
      </div>
    </div>
  );
}

// A scene slides in from the right and leaves to the left, like a screen push
function Scene({ t, from, to, first, last, children }: { t: number; from: number; to: number; first?: boolean; last?: boolean; children: ReactNode }) {
  if (t < from - 0.01 || t > to + 0.45) return null;
  const enter = first ? 1 : ease(span(t, from, from + 0.45));
  const exit = last ? 0 : ease(span(t, to, to + 0.45));
  const style: CSSProperties = {
    transform: `translateX(${((1 - enter) * 40 - exit * 30).toFixed(2)}%)`,
    opacity: Math.min(enter * 1.4, 1 - exit),
  };
  return (
    <div className="absolute inset-0" style={style}>
      {children}
    </div>
  );
}

// The phone's own status bar, clear of the camera cutout
function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex h-[34px] items-end justify-between bg-page px-6 pb-1 text-[0.8rem] font-semibold">
      <span>9:41</span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((h) => (
            <span key={h} className="w-[3px] rounded-[1px] bg-ink" style={{ height: h }} />
          ))}
        </span>
        <span className="ml-1 flex h-[11px] w-[22px] items-center rounded-[3px] border border-ink/60 p-[1.5px]">
          <span className="h-full w-[70%] rounded-[1.5px] bg-ink" />
        </span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function AppFrame({ tab, children }: { tab: "Posts" | "Creators" | "Report"; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line/70 px-4">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F6D7B8,#C98B5E)] font-heading text-sm font-semibold text-[#2A1A10]">
            {BUSINESS.initial}
          </span>
          <span className="font-semibold">{BUSINESS.name}</span>
          <ChevronsUpDown className="h-4 w-4 text-muted" aria-hidden="true" />
        </span>
        <span className="relative">
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-signal ring-2 ring-page" />
        </span>
      </header>
      <div className="px-4 pt-4">
        <p className="font-heading text-[1.6rem] leading-tight font-semibold tracking-[-0.025em]">{CAMPAIGN.name}</p>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
          <span className="live-dot h-2 w-2 rounded-full bg-signal" />
          Live · {CAMPAIGN.daysLeft} days left
        </p>
        <ul className="mt-3 flex gap-6 border-b border-line">
          {(["Posts", "Creators", "Report"] as const).map((l) => (
            <li key={l} className={cn("relative py-2.5 text-[0.95rem]", l === tab ? "font-semibold" : "text-muted")}>
              {l}
              {l === tab && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" />}
            </li>
          ))}
        </ul>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden px-4 pt-4 pb-24">{children}</div>
    </div>
  );
}

function Dock() {
  const items: [LucideIcon, string, boolean][] = [
    [Home, "Home", false],
    [LayoutGrid, "Campaigns", true],
  ];
  const rest: [LucideIcon, string, boolean][] = [
    [Sparkles, "Results", false],
    [UserRound, "Me", false],
  ];
  const Item = ([Icon, label, on]: [LucideIcon, string, boolean]) => (
    <span key={label} className={cn("flex w-14 flex-col items-center gap-1 text-[0.68rem]", on ? "text-white" : "text-[#8D94A0]")}>
      <Icon className="h-5 w-5" strokeWidth={on ? 2.3 : 1.8} aria-hidden="true" />
      {label}
    </span>
  );
  return (
    <div className="absolute inset-x-3 bottom-3 z-10 flex h-16 items-center justify-around rounded-[1.6rem] bg-[#14161A] px-2 shadow-[0_18px_40px_-14px_rgb(20_22_26/0.55)]">
      {items.map(Item)}
      <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full bg-ember text-on-signal ring-[5px] ring-page">
        <Plus className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
      </span>
      {rest.map(Item)}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Brief: the builder's first step                                   */

const GOALS: [string, string, LucideIcon][] = [
  ["visits", "Website visits", Globe],
  ["chats", "WhatsApp chats", MessageCircle],
  ["walkins", "Walk-ins", Store],
  ["followers", "Followers", Users],
];

function BriefScene({ t }: { t: number }) {
  const typed = CAMPAIGN.brief.slice(0, Math.round(CAMPAIGN.brief.length * span(t, 0.5, 2.7)));
  const picked = t >= 3.05;
  const tapGoal = span(t, 2.85, 3.05) * (1 - span(t, 3.05, 3.25));
  const tapGo = span(t, 4.25, 4.4) * (1 - span(t, 4.4, 4.6));
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <div className="flex items-center gap-3">
        <X className="h-5 w-5" aria-hidden="true" />
        <span className="flex flex-1 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-full", i === 0 ? "bg-ink" : "bg-line")} />
          ))}
        </span>
      </div>
      <p className="mt-5 text-sm text-muted">Step 1 of 4</p>
      <p className="font-heading text-[1.6rem] leading-tight font-semibold tracking-[-0.025em]">Tell us about your business</p>

      <p className="mt-5 font-medium">What makes you special?</p>
      <p className="mt-2 h-[6.2rem] rounded-2xl bg-surface px-4 py-3 text-[0.95rem] leading-relaxed ring-2 ring-ink">
        {typed}
        {t < 3 && <span className="ml-px inline-block h-[1.05em] w-[1.5px] translate-y-[0.15em] bg-signal" />}
      </p>

      <p className="mt-4 font-medium">Where do people find you?</p>
      <div className="mt-2 flex gap-2">
        <span className="flex flex-1 items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 text-sm ring-1 ring-line">
          <Globe className="h-4 w-4 text-signal" aria-hidden="true" />
          {CAMPAIGN.where[0]}
        </span>
        <span className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2.5 text-sm ring-1 ring-line">
          <MapPin className="h-4 w-4 text-signal" aria-hidden="true" />
          Studio
        </span>
      </div>

      <p className="mt-4 font-medium">What do you want more of?</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {GOALS.map(([id, label, Icon]) => {
          const on = id === "visits" && picked;
          return (
            <span
              key={id}
              className={cn("relative rounded-2xl p-3 ring-1", on ? "bg-ink text-page ring-ink" : "bg-surface ring-line")}
              style={id === "visits" ? { scale: `${1 - tapGoal * 0.04}` } : undefined}
            >
              <Icon className={cn("h-4 w-4", on ? "text-signal" : "text-muted")} aria-hidden="true" />
              <span className="mt-2 block text-sm font-medium">{label}</span>
              {on && <Check className="absolute top-3 right-3 h-4 w-4" strokeWidth={3} aria-hidden="true" />}
            </span>
          );
        })}
      </div>

      <span
        className="mt-auto mb-5 flex h-12 items-center justify-center rounded-full bg-ember font-heading font-semibold text-on-signal"
        style={{ scale: `${1 - tapGo * 0.04}` }}
      >
        Find creators
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Gather: creators join the ring, then get verified                 */

function GatherScene({ t }: { t: number }) {
  const spots = SPOTS.map((s, i) => {
    let state: SpotState = "open";
    if (t >= 0.45 + i * 0.32) state = "joined";
    if (s.state === "verified" && t >= 3.3 + i * 0.18) state = "verified";
    if (s.state === "posted" && t >= 3.9) state = "posted";
    return { avatar: s.avatar, state };
  });
  const filled = spots.filter((s) => s.state !== "open").length;
  const verified = spots.filter((s) => s.state === "verified").length;
  return (
    <div>
      <GatheringRing
        spots={spots}
        className="mx-auto w-[17rem]"
        centre={<span className="font-heading text-3xl font-semibold">{BUSINESS.initial}</span>}
      />
      <div className="mt-4 flex items-end justify-between">
        <span>
          <span className="block font-mono text-[2rem] leading-none tabular-nums">{filled}/8</span>
          <span className="mt-1 block text-sm text-muted">spots filled</span>
        </span>
        <span
          className="flex items-center gap-1.5 rounded-full bg-verified/12 px-3 py-1.5 text-sm font-medium text-verified"
          style={{ opacity: verified > 0 ? 1 : 0 }}
        >
          <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
          {verified} verified
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Post: posts arrive, newest on top                                 */

function PostScene({ t }: { t: number }) {
  // Oldest first; each new post lands on top and eases the others down
  const order = POSTS.filter((p) => p.status !== "removed").slice(0, 5);
  const ROW = 104; // card height + gap, px
  const arrived = order.map((_, i) => ease(span(t, 0.35 + i * 0.7, 0.85 + i * 0.7)));
  return (
    <ul className="relative">
      {order.map((p, i) => {
        const a = arrived[i]!;
        if (a <= 0) return null;
        const y = arrived.slice(i + 1).reduce((sum, v) => sum + v * ROW, 0);
        return (
          <li
            key={p.id}
            className="absolute inset-x-0 top-0 flex h-[94px] items-center gap-3 rounded-2xl bg-surface p-2.5 ring-1 ring-line"
            style={{
              opacity: a,
              transform: `translateY(${(y + (1 - a) * -24).toFixed(1)}px) scale(${(0.96 + a * 0.04).toFixed(3)})`,
            }}
          >
            <span className="relative h-[4.6rem] w-[3.7rem] shrink-0 overflow-hidden rounded-xl">
              <PostImage name={p.image} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <CreatorAvatar who={p.creator.avatar} large className="h-5 w-5" />
                <span className="truncate text-sm font-semibold">
                  {p.platform === "Facebook" ? p.creator.handle : `@${p.creator.handle}`}
                </span>
              </span>
              <span className="mt-0.5 block text-xs text-muted">{p.platform} · Paid partnership</span>
              <span className="mt-1.5 flex items-center gap-2">
                <StatusChip status={p.status} />
                <span className="font-mono text-xs text-muted tabular-nums">{count(p.views)} views</span>
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------------------------------------------------------- */
/* Report: the goal, the views, what came, what was removed          */

function ReportScene({ t }: { t: number }) {
  const n = ease(span(t, 0.3, 1.8));
  const line = ease(span(t, 0.5, 2.1));
  const rows: [LucideIcon, string, number, number][] = [
    [Globe, "Website visits", TOTALS.taps, 1.5],
    [MessageCircle, "WhatsApp chats", TOTALS.chats, 1.7],
    [Ticket, "Codes used at your counter", TOTALS.codes, 1.9],
  ];
  const guard = ease(span(t, 2.7, 3.2));
  const path = "M0 38 C12 37 18 30 25 27 S40 18 50 14 S68 8 75 6 S92 3 100 2";
  return (
    <div>
      <p className="text-sm text-muted">Verified views</p>
      <p className="font-mono text-[2.2rem] leading-none tracking-[-0.03em] tabular-nums">{count(Math.round(TOTALS.views * n))}</p>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 h-16 w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id="film-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FF6A1A" stopOpacity="0.28" />
            <stop offset="1" stopColor="#FF6A1A" stopOpacity="0" />
          </linearGradient>
          <clipPath id="film-clip">
            <rect x="0" y="0" width={line * 100} height="40" />
          </clipPath>
        </defs>
        <g clipPath="url(#film-clip)">
          <path d={`${path} L100 40 L0 40 Z`} fill="url(#film-area)" />
          <path d={path} fill="none" stroke="#FF6A1A" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
        </g>
      </svg>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
        {rows.map(([Icon, label, value, at]) => {
          const a = ease(span(t, at - 0.9, at - 0.5));
          return (
            <li key={label} className="flex items-center gap-3 px-3.5 py-2.5" style={{ opacity: a }}>
              <Icon className="h-4 w-4 text-signal" aria-hidden="true" />
              <span className="flex-1 text-sm">{label}</span>
              <span className="font-mono tabular-nums">{count(Math.round(value * ease(span(t, at - 0.9, at + 0.4))))}</span>
            </li>
          );
        })}
      </ul>
      <p
        className="mt-3 flex items-center gap-2.5 rounded-2xl bg-surface px-3.5 py-3 text-sm ring-1 ring-line"
        style={{ opacity: guard, transform: `translateY(${((1 - guard) * 10).toFixed(1)}px)` }}
      >
        <ShieldCheck className="h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
        <span>
          <span className="font-mono font-medium tabular-nums">{count(CAMPAIGN.removedViews)}</span> views failed our checks.{" "}
          <span className="text-muted">Not billed.</span>
        </span>
      </p>
    </div>
  );
}
