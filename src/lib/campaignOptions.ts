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
// Campaign types and pay (decided 2026-11-18, see CLAUDE.md)
// ---------------------------------------------------------

// Open: anyone can join. Verified: only verified creators, fixed spots,
// first come first served (later joiners wait on standby).
export const CAMPAIGN_TYPES = ["open", "verified"] as const;
export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

// The brand picks one rate: per approved post, or per 1,000 verified views
export const PAY_MODELS = ["per_post", "per_1k_views"] as const;
export type PayModel = (typeof PAY_MODELS)[number];

export const MIN_RATE: Record<PayModel, number> = { per_post: 300, per_1k_views: 675 };
export const MIN_BUDGET = 5000;
export const NAME_MAX = 80;
export const BRIEF_MAX = 500;
export const MAX_REFERENCE_LINKS = 3;

// Views pay: nothing under 1,000 views, nothing past 5,000 (CLAUDE.md → The model)
export const MIN_PAID_VIEWS = 1000;
export const MAX_PAID_VIEWS = 5000;

export function rateLabel(rate: number | string | null | undefined, model: string | null | undefined): string {
  const n = Math.round(Number(rate) || 0).toLocaleString("en-NG");
  return model === "per_1k_views" ? `₦${n}/1K views` : `₦${n}/post`;
}

// What a views-paid post earns before the budget cap
export function viewsPayout(views: number, rate: number): number {
  if (!(views >= MIN_PAID_VIEWS)) return 0;
  return Math.floor((Math.min(views, MAX_PAID_VIEWS) / 1000) * rate);
}

// The budget a campaign needs. Per post: count × rate (count = posts for
// open, creators for verified). Per 1K views: the budget the brand enters.
export function expectedBudget(input: {
  payModel: PayModel;
  rate: number;
  count: number;
  budget: number;
}): number {
  return input.payModel === "per_post" ? Math.round(input.rate * input.count) : Math.round(input.budget);
}

// ---------------------------------------------------------
// Legacy: budget -> reward per approved engagement (old order form)
// ---------------------------------------------------------

// Share of each campaign budget kept by the platform (0.2 = 20%).
// 0 means the full budget is paid out to participants.
export const PLATFORM_FEE_RATE = 0;

// Smallest reward a participant can earn per approved engagement (₦)
export const MIN_REWARD = 10;

// Reward per approved engagement, rounded down to whole naira so the
// total paid out can never exceed the budget.
export function rewardFor(
  amount: number | string | null | undefined,
  participants: number | string | null | undefined
): number {
  const budget = Number(amount) || 0;
  const spots = Math.floor(Number(participants) || 0);
  if (budget <= 0 || spots <= 0) return 0;
  return Math.floor((budget * (1 - PLATFORM_FEE_RATE)) / spots);
}
