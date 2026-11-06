"use client";

import { useEffect, useRef } from "react";
import { Play } from "lucide-react";
import CreatorAvatar from "@/components/site/CreatorAvatar";
import { REAL_POSTS, REAL_POSTS_ARE_SAMPLES, type RealPost } from "@/lib/realPosts";

// "Real posts" (DESIGN.md §8, section 2): real creator videos on a strip that
// the visitor's own scrolling moves. The section holds in place while the
// strip travels through every video once, then the page carries on. Nothing
// loops on its own.
//
//   desktop → the centre video sits flat and the rest recede a little; the
//             strip leans toward the mouse; the videos nearest the centre play
//   phones  → stills with a play button, tap to play (no autoplay on phones)
//   reduced motion or no script → a plain strip you swipe
//
// Videos only load and play near the centre, never on Data Saver.

const CLIPS = "/hero/clips";

export default function RealPosts() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLUListElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const viewport = viewportRef.current;
    const tilt = tiltRef.current;
    const rail = railRef.current;
    if (!section || !viewport || !tilt || !rail) return;
    const cards = Array.from(rail.querySelectorAll<HTMLElement>("[data-card]"));
    const videos = cards.map((c) => c.querySelector("video"));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    if (reduced) return; // keep the plain swipeable strip

    section.dataset.pinned = "true";
    let travel = 0;
    let raf = 0;

    // The section is as tall as the strip is long, so one screen of scrolling
    // moves the strip one screen sideways
    const measure = () => {
      travel = Math.max(0, rail.scrollWidth - viewport.clientWidth);
      section.style.height = `${window.innerHeight + travel}px`;
      update();
    };

    const update = () => {
      raf = 0;
      const top = section.getBoundingClientRect().top;
      const span = section.offsetHeight - window.innerHeight;
      const progress = span > 0 ? Math.min(1, Math.max(0, -top / span)) : 0;
      const x = progress * travel;
      rail.style.transform = `translate3d(${(-x).toFixed(1)}px, 0, 0)`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress.toFixed(3)})`;

      // Depth: flat in the middle, receding toward the edges
      const mid = viewport.clientWidth / 2;
      const half = Math.max(mid, 480);
      const autoplay = desktop.matches && !saveData;
      cards.forEach((card, i) => {
        const centre = card.offsetLeft - x + card.offsetWidth / 2;
        const d = Math.max(-1.4, Math.min(1.4, (centre - mid) / half));
        const a = Math.abs(d);
        card.style.transform = `perspective(1000px) rotateY(${(-d * 12).toFixed(2)}deg) scale(${(1 - a * 0.08).toFixed(3)})`;
        card.style.opacity = (1 - a * 0.22).toFixed(3);

        const video = videos[i];
        if (!video || !autoplay) return;
        if (a < 0.5) {
          if (video.preload === "none") video.preload = "auto";
          if (video.paused) void video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // The strip leans a few degrees toward the mouse
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rx = (e.clientY / window.innerHeight - 0.5) * -4;
      const ry = (e.clientX / window.innerWidth - 0.5) * 6;
      tilt.style.transform = `perspective(1400px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
      delete section.dataset.pinned;
      section.style.height = "";
    };
  }, []);

  // Phones: tap a still to play or pause it
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const video = e.currentTarget.querySelector("video");
    if (!video) return;
    if (video.paused) {
      video.preload = "auto";
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  return (
    <section ref={sectionRef} className="real-posts-section relative border-line">
      <div className="rp-stage flex flex-col justify-center overflow-hidden py-20 sm:py-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-[2.4rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-[3.25rem]">
            Real creators. Real posts.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted text-pretty">
            Campaigns run on TikTok, Instagram and Facebook, from verified creators&apos; own accounts.
          </p>
        </div>

        <div ref={viewportRef} className="rp-viewport mt-10 sm:mt-14">
          <div ref={tiltRef} className="transition-transform duration-700 ease-out">
            <ul ref={railRef} className="rp-rail flex w-max gap-4 sm:gap-5" aria-label="Creator videos">
              {REAL_POSTS.map((post) => (
                <li key={post.clip} data-card className="rp-card w-[clamp(9.5rem,44vw,12.5rem)] shrink-0">
                  <ClipCard post={post} onToggle={toggle} />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-8 flex w-full max-w-6xl flex-col items-center gap-4 px-4 sm:px-6">
          <span className="rp-progress relative h-[3px] w-28 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <span ref={barRef} className="absolute inset-0 origin-left scale-x-0 rounded-full bg-signal" />
          </span>
          {REAL_POSTS_ARE_SAMPLES && (
            <p className="text-center text-sm text-muted">
              Sample footage from Pexels and Mixkit. Our founding creators&apos; campaign videos replace these as they go
              live.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function ClipCard({ post, onToggle }: { post: RealPost; onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const { clip, creator, business } = post;
  const label = creator
    ? `@${creator.handle} on ${creator.platform}${business ? `, a paid partnership with ${business}` : ""}. Play or pause.`
    : "Creator video. Play or pause.";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="group relative block aspect-[9/16] w-full overflow-hidden rounded-[1.4rem] bg-line shadow-[0_24px_50px_-28px_rgb(20_22_26/0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        muted
        loop
        playsInline
        preload="none"
        poster={`${CLIPS}/${clip}.webp`}
        onPlay={(e) => e.currentTarget.parentElement?.setAttribute("data-playing", "")}
        onPause={(e) => e.currentTarget.parentElement?.removeAttribute("data-playing")}
      >
        <source src={`${CLIPS}/${clip}.webm`} type="video/webm" />
        <source src={`${CLIPS}/${clip}.mp4`} type="video/mp4" />
      </video>

      {/* Play hint on stills (phones), hidden while playing */}
      <span className="rp-play absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-data-[playing]:opacity-0 lg:hidden">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm">
          <Play className="h-5 w-5 translate-x-px" fill="currentColor" aria-hidden="true" />
        </span>
      </span>

      {creator && (
        <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-left text-white">
          {creator.avatar && <CreatorAvatar who={creator.avatar} className="h-7 w-7 ring-2 ring-white/80" />}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">@{creator.handle}</span>
            <span className="block truncate text-xs opacity-80">
              {creator.platform}
              {business ? ` · Paid partnership with ${business}` : ""}
            </span>
          </span>
        </span>
      )}
    </button>
  );
}
