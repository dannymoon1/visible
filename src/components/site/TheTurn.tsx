"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, Heart, MessageCircle, Play } from "lucide-react";
import CreatorAvatar, { type AvatarKey } from "@/components/site/CreatorAvatar";
import SourceNote from "@/components/site/SourceNote";

// The turn (DESIGN.md §8, section 2b): after the problem, the insight, as a
// bento. Four tiles of proof that end on our answer: the logo's ring of
// creators gathering around a business. Each tile animates once when it
// comes into view (data-in); with reduced motion or no script they're
// simply finished.

export default function TheTurn() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = ref.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    section.dataset.armed = "true";
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }),
      { threshold: 0.4 }
    );
    section.querySelectorAll("[data-tile]").forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} id="insight" className="turn scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="mx-auto max-w-4xl text-center font-heading text-[2.25rem] leading-[1.04] font-medium tracking-[-0.03em] text-balance sm:text-[3.5rem]">
          Ads get you seen. <span className="text-signal">Recommendations get you chosen.</span>
        </h2>

        <div className="mt-14 grid gap-3 sm:mt-16 lg:grid-cols-3">
          <AdVsCreator />
          <TrustBars />
          <CreatorsSide />
          <WeConnect />
        </div>
      </div>
    </section>
  );
}

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function Tile({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div data-tile className={`bg-sand relative overflow-hidden rounded-[1.75rem] p-7 sm:p-9 ${className ?? ""}`}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */

// The creator side is real footage (a licensed sample clip, labelled as one),
// never an AI person: this tile is a proof point. Stock people can't be shown
// endorsing a named brand, so the clip carries no brand, handle or comments.
// Founding creators' real campaign posts replace it, with permission.
function AdVsCreator() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Desktop, no Data Saver: play while the tile is on screen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    if (!window.matchMedia("(min-width: 1024px)").matches || saveData) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        video.preload = "auto";
        void video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.preload = "auto";
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  return (
    <Tile className="lg:col-span-2">
      <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="max-w-xs">
          <p className="font-heading text-2xl leading-tight font-medium tracking-[-0.02em] sm:text-[1.75rem]">
            One is an ad. One is someone they follow.
          </p>
          <p className="mt-2 text-muted text-pretty">
            An ad shows your product. A creator shows what it&apos;s like, in their own words, to people who already
            listen to them.
          </p>
        </div>

        <div className="flex items-end justify-center gap-3 sm:justify-end">
          {/* The ad: polished, easy to scroll past */}
          <figure className="turn-ad w-[9.5rem] sm:w-[10.5rem]">
            <div className="rounded-2xl bg-surface p-2 shadow-[0_20px_40px_-28px_rgb(38_29_24/0.5)]">
              <div className="flex items-center gap-1.5 px-1 pt-0.5 pb-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F6D7B8,#C98B5E)] text-[0.6rem] font-semibold text-[#2A1A10]">
                  A
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[0.7rem] font-semibold">Adiaha Skin</span>
                  <span className="block text-[0.6rem] text-muted">Sponsored</span>
                </span>
              </div>
              {/* A real product photo (Pexels), polished the way ads are */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#EEEDEB]">
                <picture>
                  <source type="image/avif" srcSet="/hero/turn/ad.avif" />
                  <img
                    src="/hero/turn/ad.webp"
                    alt=""
                    width={480}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </picture>
                <span className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 rounded-lg bg-white/90 py-1.5 pr-1.5 pl-2 text-[0.62rem] font-semibold whitespace-nowrap text-[#14161A] backdrop-blur-sm">
                  20% off
                  <span className="rounded-full bg-[#14161A] px-2 py-0.5 text-white">Shop now</span>
                </span>
              </div>
              <div className="flex items-center gap-3 px-1 pt-2 pb-0.5 text-[0.7rem] text-muted">
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" aria-hidden="true" />3
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" aria-hidden="true" />0
                </span>
              </div>
            </div>
            <figcaption className="mt-2.5 text-center font-mono text-xs text-muted">An ad</figcaption>
          </figure>

          {/* A real person talking to camera */}
          <figure className="w-[10.5rem] sm:w-[12rem]">
            <button
              type="button"
              onClick={toggle}
              aria-label="Sample creator video. Play or pause."
              className="group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-line shadow-[0_24px_50px_-26px_rgb(38_29_24/0.6)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
            >
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                muted
                loop
                playsInline
                preload="none"
                poster="/hero/turn/creator.webp"
                onPlay={(e) => e.currentTarget.parentElement?.setAttribute("data-playing", "")}
                onPause={(e) => e.currentTarget.parentElement?.removeAttribute("data-playing")}
              >
                <source src="/hero/turn/creator.webm" type="video/webm" />
                <source src="/hero/turn/creator.mp4" type="video/mp4" />
              </video>
              <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-data-[playing]:opacity-0 lg:hidden">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
                  <Play className="h-4 w-4 translate-x-px" fill="currentColor" aria-hidden="true" />
                </span>
              </span>
            </button>
            <figcaption className="mt-2.5 text-center font-mono text-xs text-muted">A creator</figcaption>
          </figure>
        </div>
      </div>
    </Tile>
  );
}

/* ---------------------------------------------------------------- */

function TrustBars() {
  const bars = [
    { label: "A recommendation from someone they know", value: 83, strong: true },
    { label: "An online video ad", value: 48 },
  ];
  return (
    <Tile className="flex flex-col">
      <p className="font-heading text-2xl leading-tight font-medium tracking-[-0.02em] sm:text-[1.75rem]">
        Who people trust
      </p>
      <div className="mt-auto space-y-6 pt-10">
        {bars.map(({ label, value, strong }, i) => (
          <div key={label}>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-muted">{label}</span>
              <span className={`flex items-center gap-1 font-mono text-3xl tabular-nums ${strong ? "text-signal" : ""}`}>
                {value}%
                {strong && (
                  <SourceNote text="Nielsen, Global Trust in Advertising, 2015: 83% trust recommendations from people they know, 48% trust online video ads. 30,000+ people in 60 countries." />
                )}
              </span>
            </div>
            <span className="mt-2 block h-3 overflow-hidden rounded-full bg-[#261D18]/[0.06] dark:bg-white/[0.06]">
              <span
                className={`turn-bar block h-full rounded-full ${strong ? "bg-ember" : "bg-muted/50"}`}
                style={{ width: `${value}%`, ...d(0.2 + i * 0.25) }}
              />
            </span>
          </div>
        ))}
      </div>
    </Tile>
  );
}

/* ---------------------------------------------------------------- */

const FACES: AvatarKey[] = ["stylist", "gadget", "suya", "fitness", "makeup"];

function CreatorsSide() {
  return (
    <Tile className="flex flex-col">
      <div className="flex -space-x-2.5">
        {FACES.map((who, i) => (
          <span key={who} className="turn-face" style={d(i * 0.08)}>
            <CreatorAvatar who={who} large className="h-11 w-11 ring-[3px] ring-[#F3F1EF] dark:ring-[#1A1715]" />
          </span>
        ))}
      </div>
      <p className="mt-8 font-heading text-2xl leading-tight font-medium tracking-[-0.02em] sm:text-[1.75rem]">
        Their trust is real. Their pay isn&apos;t.
      </p>
      <p className="mt-2 text-muted text-pretty">
        TikTok reaches 47.8 million Nigerian adults, yet its creator pay programme still leaves Nigeria out.
      </p>
      <div className="mt-auto pt-8">
        <span className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted" aria-hidden="true" />
          <span className="leading-tight">
            <span className="block text-xs text-muted">TikTok Creator Rewards</span>
            <span className="block font-medium">Not open in Nigeria</span>
          </span>
          <span className="ml-auto">
            <SourceNote text="TikTok ad reach: DataReportal, Digital 2026: Nigeria (October 2025). Creator Rewards left Nigeria out of its 2025 rollout: Business A.M., December 2025." />
          </span>
        </span>
      </div>
    </Tile>
  );
}

/* ---------------------------------------------------------------- */

// Eight creators drift in and lock into the logo's ring around the business
const RING: AvatarKey[] = ["makeup", "suya", "student", "barber", "salon", "gadget", "dancer", "tailor"];

function WeConnect() {
  return (
    <Tile className="grid items-center gap-8 lg:col-span-2 lg:grid-cols-[1fr_auto]">
      <div className="max-w-sm">
        <p className="font-heading text-[2rem] leading-[1.05] font-medium tracking-[-0.03em] text-balance sm:text-[2.6rem]">
          We connect the two.
        </p>
        <p className="mt-3 text-lg text-muted text-pretty">
          Businesses get talked about by people their customers already trust. Creators get paid for the trust
          they&apos;ve built.
        </p>
        <a
          href="#how-it-works"
          className="mt-6 inline-flex items-center gap-2 font-heading font-semibold text-ink underline decoration-signal decoration-2 underline-offset-[6px] hover:decoration-4"
        >
          See how it works <ArrowDown className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className="relative mx-auto aspect-square w-[min(19rem,78vw)]" aria-hidden="true">
        <span className="turn-orbit absolute inset-[11%] rounded-full border border-dashed border-[#261D18]/15 dark:border-white/15" />
        <span className="turn-core absolute top-1/2 left-1/2 h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember shadow-[0_0_0_10px_rgb(255_106_26/0.12),0_18px_40px_-10px_rgb(255_106_26/0.7)]" />
        {RING.map((who, i) => {
          const a = (i / RING.length) * Math.PI * 2 - Math.PI / 2;
          // Each face starts scattered outward and slightly turned
          const style = {
            left: `${(50 + 39 * Math.cos(a)).toFixed(2)}%`,
            top: `${(50 + 39 * Math.sin(a)).toFixed(2)}%`,
            "--sx": `${(Math.cos(a * 1.7 + 1) * 70).toFixed(0)}px`,
            "--sy": `${(Math.sin(a * 2.3 + 2) * 60).toFixed(0)}px`,
            ...d(0.15 + i * 0.09),
          } as CSSProperties;
          return (
            <span key={who} className="turn-ring absolute -mt-[10%] -ml-[10%] h-[20%] w-[20%]" style={style}>
              <CreatorAvatar who={who} large className="h-full w-full ring-[3px] ring-[#F3F1EF] dark:ring-[#1A1715]" />
            </span>
          );
        })}
      </div>
    </Tile>
  );
}
