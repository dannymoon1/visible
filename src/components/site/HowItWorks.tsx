"use client";

import { useEffect, useRef } from "react";

// How it works, the solution (DESIGN.md §8, section 3): four steps, shown on
// the real business app (the demo at /demo/business) for a made-up skincare
// brand. The film is recorded from /demo/film; see public/hero/film/.
//
//   desktop → the steps scroll on the left while a hand holds the phone still
//             on the right. Reaching a step plays that step's part of the film
//             and holds on its last frame. A giant step word sits behind the
//             phone; the orange dot rides the rail.
//   phones  → each step is a card with a still from the film (no video on
//             phones, CLAUDE.md → page budget)
//   reduced motion, Data Saver or no script → the stills, no video

// Where each step lives in the film, in seconds. Keep in step with SCENES in
// src/app/(business)/demo/film/page.tsx. Each part stops just before the next
// scene starts sliding in.
const FILM_STEPS: [start: number, end: number][] = [
  [0, 4.75],
  [5, 9.3],
  [9.5, 13.8],
  [14, 18.9],
];

const STEPS = [
  {
    word: "Brief",
    still: "brief",
    title: "Tell us about your business",
    body: "Say what makes you special and pick a goal: more WhatsApp chats, more walk-ins, more visits to your website or online store. Creators get a brief, never a script.",
  },
  {
    word: "Gather",
    still: "gather",
    title: "Verified creators join",
    body: "Only creators with real followers and real recent views can join, and each one is checked before they get a spot.",
  },
  {
    word: "Post",
    still: "post",
    title: "They post in their own words",
    body: "On TikTok, Instagram and Facebook, from their own accounts, marked as a paid partnership. Their followers hear about you from someone they already trust.",
  },
  {
    word: "Report",
    still: "report",
    title: "See who came",
    body: "Every post, verified view, website visit, WhatsApp chat and code used at your counter, in one report. Views that fail our checks never reach your bill.",
  },
] as const;

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const rail = railRef.current;
    const dot = dotRef.current;
    const video = videoRef.current;
    if (!section || !rail || !dot) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    section.dataset.armed = "true";
    const steps = Array.from(section.querySelectorAll<HTMLElement>("[data-step]"));
    const words = Array.from(section.querySelectorAll<HTMLElement>("[data-word]"));
    const stills = Array.from(section.querySelectorAll<HTMLElement>("[data-still]"));

    // The film plays on desktop only, never on Data Saver
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    const filmOn = Boolean(video) && window.matchMedia("(min-width: 1024px)").matches && !saveData;
    let stopAt = 0;
    let watch = 0;
    const playPart = (i: number) => {
      if (!video || !filmOn) return;
      const [start, end] = FILM_STEPS[i]!;
      cancelAnimationFrame(watch);
      stopAt = end;
      video.currentTime = start;
      void video.play().catch(() => {});
      // Stop exactly at the end of the part (timeupdate is too coarse)
      const check = () => {
        if (video.currentTime >= stopAt) video.pause();
        else watch = requestAnimationFrame(check);
      };
      watch = requestAnimationFrame(check);
    };
    const onReady = () => section.setAttribute("data-film", "");
    const fetchFilm = () => {
      if (!video || !filmOn || video.preload !== "none") return;
      video.preload = "auto";
      video.load();
    };
    let idle = 0;
    if (video && filmOn) {
      video.addEventListener("playing", onReady, { once: true });
      // Fetch it quietly once the page has settled, so it's ready on arrival
      idle = window.setTimeout(fetchFilm, 3000);
    }

    // The step nearest the middle of the screen drives the phone
    let active = -1;
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let next = 0;
      steps.forEach((step, i) => {
        if (step.getBoundingClientRect().top < mid) next = i;
      });
      if (next !== active) {
        active = next;
        words.forEach((w, i) => w.toggleAttribute("data-active", i === active));
        steps.forEach((s, i) => s.toggleAttribute("data-active", i === active));
        stills.forEach((s, i) => s.toggleAttribute("data-active", i === active));
        playPart(active);
      }
      const r = rail.getBoundingClientRect();
      const y = Math.min(r.height, Math.max(0, mid - r.top));
      dot.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // Only listen to scrolling while the section is on screen, and only fetch
    // the film once the section comes near
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          fetchFilm();
          window.addEventListener("scroll", schedule, { passive: true });
          schedule();
        } else {
          window.removeEventListener("scroll", schedule);
          video?.pause();
          active = -1; // replay the part when they come back
        }
      },
      { rootMargin: "1200px 0px" }
    );
    io.observe(section);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(watch);
      window.clearTimeout(idle);
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      video?.removeEventListener("playing", onReady);
      delete section.dataset.armed;
    };
  }, []);

  return (
    <section ref={sectionRef} id="how-it-works" className="hiw relative scroll-mt-16 pt-24 pb-16 sm:pt-32 lg:pb-12">
      <div className="hiw-bg pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6">
        <p className="font-mono text-sm text-signal">The solution</p>
        <h2 className="mt-4 font-heading text-[2.5rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-6xl">
          You tell us about your business. Creators do the talking.
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-muted text-pretty">Four steps. You only do the first one.</p>
      </div>

      <div className="relative mx-auto mt-14 max-w-6xl px-4 sm:px-6 lg:mt-4 lg:grid lg:grid-cols-2 lg:gap-10">
        {/* Steps. On desktop the rail and its dot run down their left edge */}
        <div className="relative">
          <div ref={railRef} className="absolute top-[37.5svh] bottom-[37.5svh] left-0 hidden w-px bg-line lg:block" aria-hidden="true">
            <span ref={dotRef} className="hiw-dot absolute -top-[7px] -left-[7px] block h-3.5 w-3.5 rounded-full bg-signal" />
          </div>

          <ol className="flex flex-col gap-20 lg:gap-0">
            {STEPS.map(({ word, still, title, body }, i) => (
              <li key={word} data-step className="hiw-step lg:flex lg:min-h-[75svh] lg:items-center lg:pl-12 lg:last:min-h-[60svh]">
                <div className="max-w-md">
                  <p className="font-mono text-sm text-signal">
                    0{i + 1} <span className="text-muted">· {word}</span>
                  </p>
                  <h3 className="mt-3 font-heading text-[1.75rem] leading-tight font-medium tracking-[-0.02em] text-balance sm:text-4xl">
                    {title}
                  </h3>
                  <p className="mt-3 text-lg text-muted text-pretty">{body}</p>
                </div>

                {/* Phones and tablets: a still from the film */}
                <div className="mx-auto mt-8 w-[min(17.5rem,80vw)] rounded-[2.4rem] bg-[#1A1C20] p-2 shadow-[0_40px_80px_-40px_rgb(20_22_26/0.7)] lg:hidden">
                  <div className="aspect-[558/1141] overflow-hidden rounded-[2rem] bg-page">
                    <Still name={still} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Desktop: a hand holds the phone still while the steps scroll */}
        <div className="hidden lg:block">
          <div className="sticky top-16 flex h-[calc(100svh-4rem)] items-center justify-center">
            {STEPS.map(({ word }, i) => (
              <span
                key={word}
                data-word
                data-active={i === 0 ? "" : undefined}
                className="hiw-word pointer-events-none absolute top-[44%] left-1/2 font-heading text-[clamp(8rem,15vw,14rem)] leading-none font-semibold tracking-[-0.05em] select-none"
                aria-hidden="true"
              >
                {word}
              </span>
            ))}
            <div className="hiw-hand relative w-[min(30rem,calc((100svh-7rem)*0.733))]">
              {/* The screen sits under the render's transparent glass */}
              <div className="hiw-glass absolute overflow-hidden bg-page">
                {STEPS.map(({ still }, i) => (
                  <div key={still} data-still data-active={i === 0 ? "" : undefined} className="hiw-still absolute inset-0">
                    <Still name={still} />
                  </div>
                ))}
                <video
                  ref={videoRef}
                  className="hiw-film absolute inset-0 h-full w-full object-cover"
                  muted
                  playsInline
                  preload="none"
                  aria-label="The business app: writing a brief, creators joining, posts arriving and the report filling up."
                >
                  {/* H.264 first: hardware decoding almost everywhere, so it never stutters */}
                  <source src="/hero/film/app.mp4" type="video/mp4" />
                  <source src="/hero/film/app.webm" type="video/webm" />
                </video>
              </div>
              <picture>
                <source
                  type="image/avif"
                  srcSet="/hero/phone-hand-480.avif 480w, /hero/phone-hand-800.avif 800w"
                  sizes="30rem"
                />
                <img
                  src="/hero/phone-hand-480.webp"
                  srcSet="/hero/phone-hand-480.webp 480w, /hero/phone-hand-800.webp 800w"
                  sizes="30rem"
                  alt=""
                  width={996}
                  height={1358}
                  loading="lazy"
                  decoding="async"
                  className="hiw-hand-img pointer-events-none relative block h-auto w-full select-none"
                />
              </picture>
            </div>
          </div>
        </div>
      </div>

      <p className="relative mx-auto mt-16 max-w-6xl px-4 text-center text-sm text-muted sm:px-6 lg:mt-6">
        Example campaign for a made-up brand.
      </p>
    </section>
  );
}

function Still({ name }: { name: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet={`/hero/film/${name}.avif`} />
      <img
        src={`/hero/film/${name}.webp`}
        alt=""
        width={540}
        height={1104}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </picture>
  );
}
