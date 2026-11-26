import { NextResponse, type NextRequest } from "next/server";
import { REF_COOKIE, VISITOR_COOKIE, deviceFor, isBot, isLinkEvent, isValidSlug } from "@/lib/trackingLinks";
import { recordLinkEvent, visitorIdFrom } from "@/lib/linkTracking.server";

// Steps a visitor takes after opening a tracking link, sent by LinkTracker:
// engaged, cta_click, signup_view, builder_view, and click when someone
// arrives on a copied address (?ref=) without having opened /r/<slug>.
// Only visitors who came through a link are recorded. LinkTracker sets the
// cookies before it sends, so this only reads them.

export async function POST(req: NextRequest) {
  const done = new NextResponse(null, { status: 204 });
  const userAgent = req.headers.get("user-agent");
  if (isBot(userAgent)) return done;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return done;
  }
  if (typeof body !== "object" || body === null) return done;
  const { event, ref } = body as { event?: unknown; ref?: unknown };
  if (!isLinkEvent(event)) return done;

  const slug = (typeof ref === "string" ? ref : req.cookies.get(REF_COOKIE)?.value ?? "").toLowerCase();
  if (!isValidSlug(slug)) return done;

  const visitor = visitorIdFrom(req.cookies.get(VISITOR_COOKIE)?.value);
  if (visitor.isNew) return done;

  await recordLinkEvent(slug, visitor.id, event, event === "click" ? deviceFor(userAgent) : null);
  return done;
}
