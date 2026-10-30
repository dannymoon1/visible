// Option lists for the campaign order form.

export const PLATFORMS = [
  "Facebook",
  "Instagram",
  "X",
  "TikTok",
  "YouTube",
  "LinkedIn",
  "WhatsApp",
  "Snapchat",
  "Threads",
];

export const CONTENT_TYPES = [
  "Image post",
  "Video",
  "Reel / Short",
  "Story",
  "Text post",
  "Live stream",
  "Article / Blog",
  "Product review",
];

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
export const REGIONS = {
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

export const COUNTRIES = [
  ...Object.keys(REGIONS),
  "Kenya",
  "South Africa",
  "United Kingdom",
  "United States",
  "Canada",
];

export const ALL = "All";

// ---------------------------------------------------------
// Campaign budget -> reward per approved engagement
// ---------------------------------------------------------

// Share of each campaign budget kept by the platform (0.2 = 20%).
// 0 means the full budget is paid out to participants.
export const PLATFORM_FEE_RATE = 0;

// Smallest reward a participant can earn per approved engagement (₦)
export const MIN_REWARD = 10;

// Reward per approved engagement, rounded down to whole naira so the
// total paid out can never exceed the budget.
export function rewardFor(amount, participants) {
  const budget = Number(amount) || 0;
  const spots = Math.floor(Number(participants) || 0);
  if (budget <= 0 || spots <= 0) return 0;
  return Math.floor((budget * (1 - PLATFORM_FEE_RATE)) / spots);
}
