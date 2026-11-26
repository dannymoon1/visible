"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  REF_COOKIE,
  REF_MAX_AGE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE,
  isValidSlug,
  readCookie,
  type LinkEvent,
} from "@/lib/trackingLinks";

// Follows a visitor who came through a tracking link (/r/<slug>) and reports
// how far they got: stayed, tapped sign up or start campaign, opened the
// sign-up page or the campaign builder. Does nothing for anyone else.

const ENGAGED_AFTER_SECONDS = 15;
const CTA_PATHS = ["/register", "/order"];

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax${secure}`;
}

function send(event: LinkEvent, ref: string) {
  const body = JSON.stringify({ event, ref });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // Fall through to fetch
  }
  fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(
    () => {}
  );
}

export default function LinkTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Someone may arrive on a copied address that still carries ?ref=
    const urlRef = new URLSearchParams(window.location.search).get("ref")?.toLowerCase() ?? null;
    let ref = readCookie(REF_COOKIE);
    const arrivedByCopy = Boolean(urlRef && isValidSlug(urlRef) && urlRef !== ref);
    if (arrivedByCopy && urlRef) {
      ref = urlRef;
      writeCookie(REF_COOKIE, urlRef, REF_MAX_AGE);
    }
    if (!ref || !isValidSlug(ref)) return;
    const slug = ref;

    if (!readCookie(VISITOR_COOKIE)) writeCookie(VISITOR_COOKIE, crypto.randomUUID(), VISITOR_MAX_AGE);
    if (arrivedByCopy) send("click", slug);

    if (pathname === "/register") send("signup_view", slug);
    if (pathname.startsWith("/order/new")) send("builder_view", slug);

    // Stayed: 15 seconds with the page in view, scrolled halfway, or used a form
    let engaged = false;
    let visibleSeconds = 0;
    const engage = () => {
      if (engaged) return;
      engaged = true;
      send("engaged", slug);
    };
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      visibleSeconds += 1;
      if (visibleSeconds >= ENGAGED_AFTER_SECONDS) {
        engage();
        window.clearInterval(timer);
      }
    }, 1000);
    const onScroll = () => {
      const page = document.documentElement.scrollHeight;
      if (page > window.innerHeight && window.scrollY + window.innerHeight >= page * 0.5) engage();
    };
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLElement && e.target.matches("input, textarea, select")) engage();
    };
    const onClick = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link) return;
      const url = new URL(link.getAttribute("href") ?? "", window.location.href);
      if (url.origin === window.location.origin && CTA_PATHS.some((p) => url.pathname.startsWith(p))) {
        engage();
        send("cta_click", slug);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("focusin", onFocus);
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [pathname]);

  return null;
}
