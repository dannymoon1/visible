import { NextResponse, type NextRequest } from "next/server";
import { VISITOR_COOKIE, destinationFor, deviceFor, isBot, isValidSlug } from "@/lib/trackingLinks";
import { recordLinkEvent, setTrackingCookies, visitorIdFrom } from "@/lib/linkTracking.server";

// A tracking link: visibilitycampaigns.com/r/<slug>.
// Records the open, remembers the link on this phone for 30 days and sends
// the visitor on: creator links to sign-up, business links to the homepage.
// Preview servers (WhatsApp, Facebook, Telegram...) are sent to the homepage
// without being counted, so pasting a link into a group isn't a fake open.

export const dynamic = "force-dynamic";

function redirect(req: NextRequest, path: string) {
  const res = NextResponse.redirect(new URL(path, req.url), 302);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug.toLowerCase();
  const userAgent = req.headers.get("user-agent");

  if (!isValidSlug(slug) || isBot(userAgent)) return redirect(req, "/");

  const visitor = visitorIdFrom(req.cookies.get(VISITOR_COOKIE)?.value);
  const audience = await recordLinkEvent(slug, visitor.id, "click", deviceFor(userAgent));
  if (!audience) return redirect(req, "/");

  const res = redirect(req, destinationFor(audience, slug));
  setTrackingCookies(res, slug, visitor.id);
  return res;
}

// Link checkers send HEAD: answer without counting an open
export async function HEAD(req: NextRequest) {
  return redirect(req, "/");
}
