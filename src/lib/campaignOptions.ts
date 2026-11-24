// Option lists and rules for creating campaigns. Shared by the browser and
// the server (src/app/api/campaigns/route.ts), so both enforce the same limits.

// The platforms where we can check posts (decided 2026-11-18).
// "YouTube" means long videos; Shorts are their own option.
export const PLATFORMS = ["Facebook", "Instagram", "TikTok", "YouTube Shorts", "YouTube"] as const;

export type Platform = (typeof PLATFORMS)[number];

// How a platform is shown where the short key could be ambiguous
export const PLATFORM_LABELS: Record<Platform, string> = {
  Facebook: "Facebook",
  Instagram: "Instagram",
  TikTok: "TikTok",
  "YouTube Shorts": "YouTube Shorts",
  YouTube: "YouTube (long video)",
};

export const LANGUAGES = [
  "English",
  "Nigerian Pidgin",
  "Hausa",
  "Yoruba",
  "Igbo",
  "French",
];

// Countries with zone -> state breakdowns. Countries not listed here
// are targeted nationwide.
export const REGIONS: Record<string, Record<string, string[]>> = {
  Nigeria: {
    "North Central": ["Benue", "FCT (Abuja)", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
    "North East": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
    "North West": ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
    "South East": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
    "South South": ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
    "South West": ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
  },
  Ghana: {
    "Southern Belt": ["Greater Accra", "Central", "Western", "Western North", "Volta", "Eastern"],
    "Middle Belt": ["Ashanti", "Bono", "Bono East", "Ahafo", "Oti"],
    "Northern Belt": ["Northern", "Savannah", "North East", "Upper East", "Upper West"],
  },
};

export const COUNTRIES: string[] = [
  ...Object.keys(REGIONS),
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
  "Canada",
];

export const ALL = "All";

// ---------------------------------------------------------
// Campaign types and limits
// ---------------------------------------------------------

// Open: anyone can join. Verified: only verified creators, fixed spots.
export const CAMPAIGN_TYPES = ["open", "verified"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const NAME_MAX = 80;
export const BRIEF_MAX = 500;
export const MAX_REFERENCE_LINKS = 3;

// Pricing and pay for new campaigns live in src/lib/pricing.ts (version 2,
// decided 2026-11-22 to 24). What follows is kept only for version-1
// campaigns (one rate, made before 24 Nov 2026), which the admin still
// approves with the old rules until they end: nothing under 1,000 views,
// nothing past 5,000.
export const MIN_PAID_VIEWS = 1000;
export const MAX_PAID_VIEWS = 5000;

// What a version-1 views-paid post earns before the budget cap
export function viewsPayout(views: number, rate: number): number {
  if (!(views >= MIN_PAID_VIEWS)) return 0;
  return Math.floor((Math.min(views, MAX_PAID_VIEWS) / 1000) * rate);
}
