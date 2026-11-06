"use client";

import { useEffect, useRef, useState } from "react";

type NetworkInfo = { saveData?: boolean };

// The hero loop (DESIGN.md §10): desktop only, never on Data Saver or with
// reduced motion, loaded once the page is idle, paused while off-screen.
// Everyone else keeps the still underneath.
export default function HeroVideo() {
  const [show, setShow] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    const allowed =
      window.matchMedia("(min-width: 1024px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !connection?.saveData;
    if (!allowed) return;

    const start = () => setShow(true);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(start, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(start, 1500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // React doesn't write `muted` as an attribute, and browsers only autoplay muted video
    video.muted = true;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [show]);

  if (!show) return null;

  return (
    <video
      ref={ref}
      // Fades in over the still; the top edge softens into the disc because the
      // generated clip has little headroom
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 [mask-image:linear-gradient(to_bottom,transparent,black_14%)] ${playing ? "opacity-100" : "opacity-0"}`}
      onPlaying={() => setPlaying(true)}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/hero/shop-owner-576.webp"
    >
      <source src="/hero/shop-owner.webm" type="video/webm" />
      <source src="/hero/shop-owner.mp4" type="video/mp4" />
    </video>
  );
}
