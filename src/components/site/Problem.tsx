"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clapperboard,
  Crosshair,
  Megaphone,
  Newspaper,
  Package,
  Radio,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import SourceNote from "@/components/site/SourceNote";
import { cn } from "@/lib/cn";

// The problem (DESIGN.md §8, section 2): one card that moves through four
// pains, after the founder's reference `how it works or who is it for.mp4`.
// Each state has a tinted blob with a 3D object breaking out of it and a big
// title, and on the right what that pain looks like day to day.
//
// The pains are about the owner's reality (no time, no know-how, rising ad
// costs, no way to tell what worked), not about ads failing: we sit beside
// ads, we don't replace them. They're the founder's working hypotheses until
// interviews with business owners confirm or change them.
//
//   on screen → plays once through the four states (5s each), then rests on
//               the last. Hover pauses; tapping a tab or the arrow takes over.
//   phones    → the blob sits above the rows; swipe between states
//   reduced motion → no autoplay, no movement; tabs still work
//
// Figures carry their source behind an ⓘ. Never invent quotes.

type Row = { icon: LucideIcon; label: string; value: string; tone?: "strong" | "chip"; source?: string };
// `size` is the object's width class: tall renders run smaller so they
// never reach the title
type Pain = { tab: string; title: ReactNode; tint: string; object: string; size?: string; lead: string; rows: Row[] };

const PAINS: Pain[] = [
  {
    tab: "No time",
    title: (
      <>
        No time
        <br />
        to post.
      </>
    ),
    tint: "#8E4C8A",
    object: "ghost",
    lead: "You're serving customers, restocking and chasing payments. Posting every day is a second job, and it's always the first thing to slip.",
    rows: [
      { icon: Users, label: "Serve customers", value: "Done" },
      { icon: Package, label: "Restock and pay suppliers", value: "Done" },
      { icon: Smartphone, label: "Post on TikTok, Instagram and Facebook", value: "Not today", tone: "strong" },
    ],
  },
  {
    tab: "Know-how",
    title: (
      <>
        Ads feel like
        <br />
        another language.
      </>
    ),
    tint: "#E5674F",
    object: "megaphone",
    size: "w-[44%] sm:w-[38%] lg:w-[42%]",
    lead: "Targeting, budgets, algorithms, hashtags. You started a business, not a marketing course.",
    rows: [
      { icon: Crosshair, label: "Ad targeting and budgets", value: "To learn", tone: "chip" },
      { icon: Sparkles, label: "What the algorithm wants this week", value: "To learn", tone: "chip" },
      { icon: Clapperboard, label: "Videos people actually watch", value: "To learn", tone: "chip" },
    ],
  },
  {
    tab: "Rising costs",
    title: (
      <>
        Same ad.
        <br />
        Triple the naira.
      </>
    ),
    tint: "#D9852A",
    object: "naira",
    lead: "Ads priced in dollars now cost nearly three times as many naira as they did in mid-2023.",
    rows: [
      { icon: CalendarDays, label: "Naira to the dollar, mid-2023", value: "₦463" },
      { icon: CalendarDays, label: "Naira to the dollar, October 2026", value: "₦1,333" },
      {
        icon: TrendingUp,
        label: "What the same ad now costs you",
        value: "2.9×",
        tone: "strong",
        source: "Central Bank of Nigeria official rates: about ₦463 to the dollar before June 2023, about ₦1,333 in October 2026.",
      },
    ],
  },
  {
    tab: "Guesswork",
    title: (
      <>
        So who
        <br />
        actually came?
      </>
    ),
    tint: "#1F8A8A",
    object: "pin",
    size: "w-[38%] sm:w-[32%] lg:w-[36%]",
    lead: "Flyers, radio, a banner, a boost. None of them can tell you who walked in because of them.",
    rows: [
      { icon: Newspaper, label: "Flyers", value: "Can't tell", tone: "chip" },
      { icon: Radio, label: "Radio", value: "Can't tell", tone: "chip" },
      { icon: Megaphone, label: "Boosted post", value: "Can't tell", tone: "chip" },
    ],
  },
];

const STEP_MS = 5000;

export default function Problem() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);

  // Autoplay runs only while the card is on screen (and never with reduced motion)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAuto(false);
      return;
    }
    root.dataset.armed = "true";
    const io = new IntersectionObserver(([e]) => root.toggleAttribute("data-playing", Boolean(e?.isIntersecting)), {
      threshold: 0.5,
    });
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const go = (i: number) => {
    setAuto(false);
    setActive((i + PAINS.length) % PAINS.length);
  };

  // The active tab's progress fill is the timer: when it finishes, move on
  const onFillEnd = (i: number) => {
    if (!auto || i !== active) return;
    if (active === PAINS.length - 1) setAuto(false);
    else setActive(active + 1);
  };

  return (
    <section id="problem" className="scroll-mt-16 pt-6 pb-4 sm:pt-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="bg-sand rounded-[2rem] px-3 pt-16 pb-3 sm:rounded-[2.5rem] sm:px-4 sm:pt-24 sm:pb-4">
          <div className="mx-auto max-w-3xl px-3 text-center">
            <h2 className="mt-4 font-heading text-[2.5rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-6xl">
              You&apos;re great at your business. Getting seen is a second full-time job.
            </h2>
          </div>

          <div
            ref={rootRef}
            data-auto={auto ? "" : undefined}
            className="pc mt-12 rounded-[1.6rem] bg-surface p-2.5 shadow-[0_30px_60px_-40px_rgb(38_29_24/0.35)] ring-1 ring-[#261D18]/5 sm:mt-16 sm:rounded-[2rem] sm:p-3"
            onTouchStart={(e) => (touch.current = e.touches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const start = touch.current;
              const end = e.changedTouches[0]?.clientX;
              touch.current = null;
              if (start == null || end == null || Math.abs(end - start) < 50) return;
              go(active + (end < start ? 1 : -1));
            }}
          >
            <div className="grid lg:grid-cols-[1.08fr_1fr]">
              {/* The blob, its title and the object */}
              <div
                className="pc-blob relative h-[18rem] sm:h-[24rem] lg:h-[30rem]"
                style={{ "--tint": PAINS[active]!.tint } as CSSProperties}
              >
                <div className="pc-shape absolute inset-0 overflow-hidden">
                  <span className="pc-sheen absolute inset-0" aria-hidden="true" />
                  {PAINS.map((p, i) => (
                    <p
                      key={p.tab}
                      data-pos={pos(i, active)}
                      aria-hidden={i !== active}
                      className="pc-title absolute top-7 left-7 font-heading text-[2.3rem] leading-[0.95] font-semibold tracking-[-0.035em] text-white sm:top-10 sm:left-10 sm:text-[3.5rem] lg:text-[3.75rem]"
                    >
                      {p.title}
                    </p>
                  ))}
                </div>

                {/* Little spheres that drift between states, for depth */}
                <span className="pc-ball pc-ball-a" data-step={active} aria-hidden="true" />
                <span className="pc-ball pc-ball-b" data-step={active} aria-hidden="true" />

                {PAINS.map((p, i) => (
                  <div
                    key={p.tab}
                    data-pos={pos(i, active)}
                    className={cn(
                      "pc-obj pointer-events-none absolute right-[0%] bottom-[0%] lg:right-[-9%] lg:bottom-[1%]",
                      p.size ?? "w-[50%] sm:w-[42%] lg:w-[50%]"
                    )}
                    aria-hidden="true"
                  >
                    <div className="pc-float">
                      <ObjectImage name={p.object} />
                    </div>
                  </div>
                ))}
              </div>

              {/* What the pain looks like day to day */}
              <div className="relative grid px-4 pt-8 pb-4 sm:px-8 lg:items-center lg:pt-6 lg:pr-10 lg:pl-20">
                {PAINS.map((p, i) => (
                  <div
                    key={p.tab}
                    data-pos={pos(i, active)}
                    aria-hidden={i !== active}
                    className="pc-receipt col-start-1 row-start-1"
                  >
                    <p className="pc-in max-w-sm font-heading text-xl leading-snug font-medium text-pretty sm:text-[1.35rem]" style={d(0.05)}>
                      {p.lead}
                    </p>
                    <ul className="mt-6">
                      {p.rows.map(({ icon: Icon, label, value, tone, source }, r) => (
                        <li key={label} className="pc-in flex items-center gap-3 border-b border-line py-3.5 first:border-t" style={d(0.12 + r * 0.07)}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-page text-muted">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 text-[0.95rem] text-muted">{label}</span>
                          <span
                            className={cn(
                              "flex items-center gap-1.5 font-mono tabular-nums",
                              tone === "chip" ? "rounded-full bg-page px-2.5 py-0.5 text-sm text-muted" : "text-lg",
                              tone === "strong" ? "text-signal" : tone !== "chip" && "text-ink"
                            )}
                          >
                            {value}
                            {source && <SourceNote text={source} />}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs, with a progress fill that drives the autoplay */}
            <div className="mt-3 flex items-center justify-between gap-3 px-1 pb-1 sm:mt-2">
              <div className="flex min-w-0 gap-1 overflow-x-auto rounded-full bg-page p-1 [scrollbar-width:none]" role="tablist" aria-label="Problems">
                {PAINS.map((p, i) => (
                  <button
                    key={p.tab}
                    type="button"
                    role="tab"
                    aria-selected={i === active}
                    data-pos={pos(i, active)}
                    onClick={() => go(i)}
                    className="pc-tab relative shrink-0 overflow-hidden rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap text-muted transition-colors focus-visible:outline-2 focus-visible:outline-signal aria-selected:bg-surface aria-selected:text-ink aria-selected:shadow-sm sm:px-4"
                  >
                    <span className="relative z-10">{p.tab}</span>
                    <span
                      className="pc-fill absolute inset-x-3 bottom-1 h-0.5 origin-left rounded-full bg-signal"
                      style={{ "--dur": `${STEP_MS}ms` } as CSSProperties}
                      onAnimationEnd={() => onFillEnd(i)}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => go(active + 1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#14161A] text-white transition hover:bg-[#25282E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal dark:bg-[#F2F3F5] dark:text-[#14161A]"
                aria-label="Next problem"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const pos = (i: number, active: number) => (i === active ? "active" : i < active ? "past" : "future");
const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function ObjectImage({ name }: { name: string }) {
  const set = (ext: string) => `/hero/problem/${name}-360.${ext} 360w, /hero/problem/${name}-640.${ext} 640w`;
  const sizes = "(min-width: 1024px) 26rem, 50vw";
  return (
    <picture>
      <source type="image/avif" srcSet={set("avif")} sizes={sizes} />
      <img
        src={`/hero/problem/${name}-360.webp`}
        srcSet={set("webp")}
        sizes={sizes}
        alt=""
        width={640}
        height={640}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-auto w-full select-none"
      />
    </picture>
  );
}
