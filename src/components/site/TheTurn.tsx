"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

// A short muted clip: plays while on screen on desktop (never on Data Saver
// or with reduced motion); on phones it's a still you tap to play.
function useInViewPlay() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
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
  return ref;
}

// Watermarked iStock comps (public/hero/comps, gitignored): allowed for
// internal mock-ups only under iStock's comp licence, so they show in local
// dev for demos and never in a production build. Licensed or real creator
// footage replaces them before launch.
const SHOW_COMPS = process.env.NODE_ENV !== "production";
const COMP_BUSINESSES = SHOW_COMPS
  ? ["/hero/clips/tailor"]
  : [];

// One clip, or several that play one after another (each 5s, then the next)
function Clip({ src, label, className }: { src: string | string[]; label: string; className?: string }) {
  const videoRef = useInViewPlay();
  const list = Array.isArray(src) ? src : [src];
  const [i, setI] = useState(0);
  const current = list[i % list.length]!;
  const many = list.length > 1;

  // A new clip in the list: load it and keep playing if we were
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.preload = "auto";
    video.load();
    void video.play().catch(() => {});
  }, [current, videoRef]);

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
    <button
      type="button"
      onClick={toggle}
      aria-label={`${label}. Play or pause.`}
      className={`group relative block aspect-[9/16] w-full overflow-hidden rounded-2xl bg-line focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal ${className ?? ""}`}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop={!many}
        playsInline
        preload="none"
        poster={`${current}.webp`}
        onEnded={() => setI((n) => (n + 1) % list.length)}
        onPlay={(e) => e.currentTarget.parentElement?.setAttribute("data-playing", "")}
        onPause={(e) => e.currentTarget.parentElement?.removeAttribute("data-playing")}
      >
        <source src={`${current}.webm`} type="video/webm" />
        <source src={`${current}.mp4`} type="video/mp4" />
      </video>

      <span className="absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-data-[playing]:opacity-0 lg:hidden">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
          <Play className="h-4 w-4 translate-x-px" fill="currentColor" aria-hidden="true" />
        </span>
      </span>
    </button>
  );
}

// The creator side is real footage (a licensed sample clip), never an AI
// person: this tile is a proof point. Stock people can't be shown endorsing a
// named brand, so the clip carries no brand, handle or comments. Founding
// creators' real campaign posts replace it, with permission.
function AdVsCreator() {
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
            <Clip
              src="/hero/turn/creator"
              label="Sample creator video"
              className="shadow-[0_24px_50px_-26px_rgb(38_29_24/0.6)]"
            />
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

// A real business owner and a real creator (licensed sample clips, no names
// or brands), joined by a line that runs through our app icon. On arrival the
// two slide in, the line draws from both sides and the icon pops.
function WeConnect() {
  return (
    <Tile className="grid items-center gap-10 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_auto]">
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

      <div className="flex items-center justify-center">
        <figure className="turn-side turn-side-l w-[clamp(7rem,30vw,10.5rem)] shrink-0 lg:w-[9rem]">
          <Clip
            src={["/hero/turn/trader", ...COMP_BUSINESSES]}
            label="Sample videos of business owners at work"
            className="shadow-[0_24px_50px_-26px_rgb(38_29_24/0.6)]"
          />
          <figcaption className="mt-2.5 text-center font-mono text-xs text-muted">A business</figcaption>
        </figure>

        {/* The link: two lines meet in the app icon */}
        <div className="relative -mt-7 flex w-[clamp(4.5rem,16vw,8rem)] shrink-0 lg:w-[5.5rem] items-center" aria-hidden="true">
          <span className="turn-link turn-link-l h-[2px] flex-1 origin-left rounded-full bg-signal" />
          <span className="turn-icon relative mx-[-2px] h-14 w-14 shrink-0 sm:h-16 sm:w-16">
            <span className="turn-icon-glow absolute inset-0 rounded-[28%]" />
            <img
              src="/logo/v2/visibility-campaigns-app-icon-light.svg"
              alt=""
              width={64}
              height={64}
              className="relative h-full w-full rounded-[28%] shadow-[0_14px_30px_-12px_rgb(38_29_24/0.55)] dark:hidden"
            />
            <img
              src="/logo/v2/visibility-campaigns-app-icon-dark.svg"
              alt=""
              width={64}
              height={64}
              className="relative hidden h-full w-full rounded-[28%] shadow-[0_14px_30px_-12px_rgb(0_0_0/0.8)] dark:block"
            />
          </span>
          <span className="turn-link turn-link-r h-[2px] flex-1 origin-right rounded-full bg-signal" />
        </div>

        <figure className="turn-side turn-side-r w-[clamp(7rem,30vw,10.5rem)] shrink-0 lg:w-[9rem]">
          <Clip
            src="/hero/turn/vlogger"
            label="Sample video of a creator filming"
            className="shadow-[0_24px_50px_-26px_rgb(38_29_24/0.6)]"
          />
          <figcaption className="mt-2.5 text-center font-mono text-xs text-muted">A creator</figcaption>
        </figure>
      </div>
    </Tile>
  );
}
