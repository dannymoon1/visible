// Example briefs by business type (campaign creation plan, screen 4). Each one
// is a brief, not a script: what to show, what to say in the creator's own
// words, and what to mention. Gaps in [brackets] are for the brand to fill;
// the builder won't move on while any are left.

export interface BriefExample {
  key: string;
  label: string;
  brief: string;
}

export const BRIEF_EXAMPLES: BriefExample[] = [
  {
    key: "food",
    label: "Food and drinks",
    brief:
      "Try a dish from our [menu or special] and show it up close: the plate, the portion, the first bite. Say honestly how it tastes, in your own words. Mention that we're at [address], a plate starts from ₦[price], and people can order on WhatsApp for delivery.",
  },
  {
    key: "beauty",
    label: "Beauty and salons",
    brief:
      "Get a [service, e.g. braids or a facial] with us and show the before and after. Talk about how you were treated and how long it took. Mention that we're at [address], prices start from ₦[price], and people should book ahead on WhatsApp.",
  },
  {
    key: "fashion",
    label: "Fashion and tailoring",
    brief:
      "Wear a piece from our [collection or item] and style it your way. Show the fabric and the fit up close. Mention that we're at [address], prices start from ₦[price], and orders are ready in [number] days.",
  },
  {
    key: "gadgets",
    label: "Phones and gadgets",
    brief:
      "Unbox or use our [product] and show what it does in your day. Say what you like about it, honestly. Mention that we're at [address], it costs ₦[price], and every purchase comes with [warranty or extra].",
  },
  {
    key: "events",
    label: "Events and venues",
    brief:
      "Show people what to expect at [event name] on [date]: the venue, the vibe, who's performing or what's on. Say why you'd go. Mention the venue, [address], tickets from ₦[price], and where to buy them.",
  },
  {
    key: "shops",
    label: "Shops and supermarkets",
    brief:
      "Walk through our shop at [address] and show a few things you'd buy, like [products]. Point out a price or deal that stands out. Mention our opening hours, [hours], and that we deliver within [area].",
  },
];

// A gap to fill: [something] on one line, up to 60 characters
const GAP = /\[[^\]\n]{1,60}\]/g;

export interface BriefGap {
  text: string;
  start: number;
  end: number;
}

export function briefGaps(brief: string): BriefGap[] {
  return [...brief.matchAll(GAP)].map((m) => ({ text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
}

// True when the brief is one of the examples, untouched (safe to replace)
export function isUntouchedExample(brief: string): boolean {
  const trimmed = brief.trim();
  return BRIEF_EXAMPLES.some((e) => e.brief === trimmed);
}
