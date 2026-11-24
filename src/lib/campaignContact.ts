// How customers reach the business (campaign creation plan, screen 4).
// Creators put it in their posts; later each creator gets a tracked link to
// it, which is how we count clicks and WhatsApp chats. Shared by the builder
// and the server (src/app/api/campaigns/route.ts) so both apply the same rules.

export const CONTACT_TYPES = ["whatsapp", "social", "website", "address"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const CONTACT_LABELS: Record<ContactType, string> = {
  whatsapp: "WhatsApp",
  social: "Social page",
  website: "Website",
  address: "Shop address",
};

const SOCIAL_HOSTS = ["instagram.com", "tiktok.com", "facebook.com", "fb.com", "youtube.com", "x.com", "twitter.com", "snapchat.com"];

export function isContactType(value: unknown): value is ContactType {
  return (CONTACT_TYPES as readonly unknown[]).includes(value);
}

// "mamaekaette.com" → "https://mamaekaette.com"; null when it isn't a web address
function asUrl(raw: string): URL | null {
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".") || /\s/.test(raw)) return null;
    return url;
  } catch {
    return null;
  }
}

const hostOf = (url: URL) => url.hostname.toLowerCase().replace(/^(www|m|web)\./, "");

// Cleans what the brand typed into the value we store, or says what's wrong
export function normalizeContact(type: ContactType, raw: string): { value: string; error?: undefined } | { value?: undefined; error: string } {
  const input = raw.trim();
  if (!input) return { error: "Add how customers can reach you." };

  if (type === "whatsapp") {
    // 0801 234 5678, 801 234 5678, +234 801 234 5678 or 234801…
    let digits = input.replace(/\D/g, "");
    if (digits.startsWith("234")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.slice(1);
    if (!/^[789][01]\d{8}$/.test(digits)) return { error: "Enter a Nigerian mobile number, like 0801 234 5678." };
    return { value: `+234${digits}` };
  }

  if (type === "address") {
    if (input.length < 8) return { error: "Add the street and area, so people can find you." };
    if (input.length > 160) return { error: "Keep the address to 160 characters." };
    return { value: input.replace(/\s+/g, " ") };
  }

  const url = asUrl(input);
  if (!url || input.length > 300) return { error: type === "social" ? "Paste the link to your page, like instagram.com/yourshop." : "Enter your website, like yourshop.com." };
  const host = hostOf(url);
  const isSocial = SOCIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  if (type === "social" && !isSocial) return { error: "That isn't an Instagram, TikTok, Facebook or YouTube link. Use Website for other sites." };
  return { value: url.toString().replace(/\/$/, "") };
}

// How the contact reads on screen: "+234 801 234 5678", "instagram.com/mamaekaette"
export function contactDisplay(type: ContactType, value: string): string {
  if (type === "whatsapp") {
    const d = value.replace(/^\+234/, "");
    return `+234 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  if (type === "address") return value;
  return value.replace(/^https?:\/\/(www\.)?/i, "");
}

// Where a tap on the contact goes (null for an address)
export function contactHref(type: ContactType, value: string): string | null {
  if (type === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
  if (type === "address") return null;
  return value;
}
