"use client";

import { useEffect } from "react";

// Links to a section on the same page (href="#how-it-works") glide there
// instead of jumping, land just below the sticky navbar (scroll-margin in
// globals.css), and the section's heading rises in once on arrival so the
// visitor sees where they landed. Reduced motion: a plain jump, no rise.
export default function SectionLinks() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer = 0;

    const arrive = (el: HTMLElement) => {
      if (reduced) return;
      const mark = () => {
        el.removeAttribute("data-arrived");
        void el.offsetWidth; // restart the animation if it's the same section again
        el.setAttribute("data-arrived", "");
        window.clearTimeout(timer);
        timer = window.setTimeout(() => el.removeAttribute("data-arrived"), 1400);
      };
      // Wait for the glide to finish (scrollend where supported). The timeout
      // covers browsers without it, and links to a section already in view,
      // where no scroll happens at all.
      let done = false;
      const once = () => {
        if (done) return;
        done = true;
        window.removeEventListener("scrollend", once);
        mark();
      };
      window.addEventListener("scrollend", once, { once: true });
      window.setTimeout(once, 1500);
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
      if (!link) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
      const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!el) return;
      e.preventDefault();
      history.pushState(null, "", url.hash);
      el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      arrive(el);
    };

    document.addEventListener("click", onClick);
    // Arriving from another page with a hash
    if (location.hash) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) window.setTimeout(() => arrive(el), 300);
    }
    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
