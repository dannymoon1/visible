// Tracking links (decided 2026-11-23): one link per place we post, made in
// /admin/links. The database side is supabase/migrations/20261123000000_tracking_links.sql.
//
//   visibilitycampaigns.com/r/k7m2q   a short code made for us (the default)
//   visibilitycampaigns.com/r/uniuyo  a custom word, for flyers people type in

// Cookies set when someone opens a link. Readable by the page (not HttpOnly)
// so the sign-up form can pass them on; they hold no personal details.
export const REF_COOKIE = "vc_ref"; // the link's slug, 30 days
export const VISITOR_COOKIE = "vc_vid"; // a random id for this phone, 1 year
export const REF_MAX_AGE = 60 * 60 * 24 * 30;
export const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

// Same rule as the database check: lowercase letters, numbers, single hyphens
export const SLUG_MIN = 3;
export const SLUG_MAX = 20;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return value.length >= SLUG_MIN && value.length <= SLUG_MAX && SLUG_RE.test(value);
}

// Turns what the admin types into a slug: "UNIUYO Hall 2" -> "uniuyo-hall-2"
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

// Short codes skip letters people mix up: 0/o, 1/l/i
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const CODE_LENGTH = 5;

export function makeCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export const LINK_EVENTS = ["click", "engaged", "cta_click", "signup_view", "builder_view"] as const;
export type LinkEvent = (typeof LINK_EVENTS)[number];

export function isLinkEvent(value: unknown): value is LinkEvent {
  return typeof value === "string" && (LINK_EVENTS as readonly string[]).includes(value);
}

export const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp group or chat" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "x", label: "X" },
  { value: "telegram", label: "Telegram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "flyer", label: "Flyer or poster" },
  { value: "agent", label: "Agent" },
  { value: "other", label: "Other" },
] as const;
export type Channel = (typeof CHANNELS)[number]["value"];

export function channelLabel(value: string): string {
  return CHANNELS.find((c) => c.value === value)?.label ?? value;
}

// Who a link is for decides where it lands and its starting message
export const AUDIENCES = {
  creators: {
    label: "Creators",
    destination: "/register",
    message:
      "Local businesses in Uyo pay creators to post about them in their own words. You're paid per post and for real views, and you keep 100% of what you earn. Founding creators can join from 500 followers.",
  },
  businesses: {
    label: "Businesses",
    destination: "/",
    message:
      "Get your business talked about by local creators your customers already follow. You set the budget, creators post in their own words, and you see every post, view and WhatsApp chat it brings.",
  },
} as const;
export type Audience = keyof typeof AUDIENCES;

export function isAudience(value: unknown): value is Audience {
  return value === "creators" || value === "businesses";
}

export const MESSAGE_MAX = 500;

// Where a link opens. ?ref= keeps the link attached if someone copies the
// address and opens it on another browser.
export function destinationFor(audience: Audience, slug: string): string {
  return `${AUDIENCES[audience].destination}?ref=${encodeURIComponent(slug)}`;
}

// The public address of a link. Set NEXT_PUBLIC_SITE_URL once the domain is
// live; until then links use the address the admin page is open on.
export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  return typeof window === "undefined" ? "https://visibilitycampaigns.com" : window.location.origin;
}

export function linkUrl(slug: string, origin = siteOrigin()): string {
  return `${origin}/r/${slug}`;
}

// The address without https://, for showing and for print
export function displayUrl(slug: string, origin = siteOrigin()): string {
  return linkUrl(slug, origin).replace(/^https?:\/\//, "");
}

// Servers that open a link to build a preview card, not people
const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|facebot|whatsapp\/|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|embedly|pinterestbot|skypeuripreview|vkshare|headless|lighthouse|curl|wget|python-requests|go-http-client/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_UA.test(userAgent);
}

export function deviceFor(userAgent: string | null): "mobile" | "desktop" {
  return userAgent && /mobi|android|iphone|ipad/i.test(userAgent) ? "mobile" : "desktop";
}

// Share targets. Facebook and LinkedIn don't accept a typed message from a
// website, so the message is copied for the admin to paste.
export interface ShareTarget {
  key: string;
  label: string;
  href: (text: string, url: string) => string;
  copyMessage?: boolean;
}

export const SHARE_TARGETS: ShareTarget[] = [
  { key: "whatsapp", label: "WhatsApp", href: (text, url) => `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}` },
  {
    key: "telegram",
    label: "Telegram",
    href: (text, url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: "x",
    label: "X",
    href: (text, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    href: (_text, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    copyMessage: true,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    href: (_text, url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    copyMessage: true,
  },
  {
    key: "email",
    label: "Email",
    href: (text, url) =>
      `mailto:?subject=${encodeURIComponent("Visibility Campaigns")}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  },
  { key: "sms", label: "SMS", href: (text, url) => `sms:?&body=${encodeURIComponent(`${text} ${url}`)}` },
];

export function shareText(message: string, url: string): string {
  const trimmed = message.trim();
  return trimmed ? `${trimmed}\n\n${url}` : url;
}

// Periods for the admin numbers
export const PERIODS = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "all", label: "All time", days: null },
] as const;
export type PeriodKey = (typeof PERIODS)[number]["key"];

export function sinceFor(period: PeriodKey): string | null {
  const days = PERIODS.find((p) => p.key === period)?.days;
  return days ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString() : null;
}

export function percent(part: number, whole: number): string {
  if (!whole) return "–";
  return `${Math.round((part / whole) * 100)}%`;
}

// Reads one cookie in the browser
export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
