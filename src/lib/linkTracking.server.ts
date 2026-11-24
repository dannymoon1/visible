import { createClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import {
  REF_COOKIE,
  REF_MAX_AGE,
  VISITOR_COOKIE,
  VISITOR_MAX_AGE,
  isAudience,
  type Audience,
  type LinkEvent,
} from "@/lib/trackingLinks";

// Server-only helpers shared by /r/[slug] and /api/track.

// record_link_event is open to anyone (it only accepts known steps on real
// links), so the public key is enough and no service-role key is needed.
// Created on first use so a build without env vars doesn't fail.
let publicClient: ReturnType<typeof createClient<Database>> | null = null;
function client() {
  publicClient ??= createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return publicClient;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The visitor id from the cookie, or a new one for a first visit
export function visitorIdFrom(cookieValue: string | undefined): { id: string; isNew: boolean } {
  if (cookieValue && UUID_RE.test(cookieValue)) return { id: cookieValue, isNew: false };
  return { id: crypto.randomUUID(), isNew: true };
}

// Records one step. Returns the link's audience, or null when the slug
// doesn't exist. Tracking must never break a visit, so errors are logged.
export async function recordLinkEvent(
  slug: string,
  visitorId: string,
  event: LinkEvent,
  device: "mobile" | "desktop" | null = null
): Promise<Audience | null> {
  const { data, error } = await client().rpc("record_link_event", {
    p_slug: slug,
    p_visitor: visitorId,
    p_event: event,
    p_device: device,
  });
  if (error) {
    console.error("record_link_event failed:", error.message);
    return null;
  }
  return isAudience(data) ? data : null;
}

const cookieBase = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: false,
};

export function setTrackingCookies(res: NextResponse, slug: string, visitorId: string) {
  res.cookies.set(REF_COOKIE, slug, { ...cookieBase, maxAge: REF_MAX_AGE });
  res.cookies.set(VISITOR_COOKIE, visitorId, { ...cookieBase, maxAge: VISITOR_MAX_AGE });
}
