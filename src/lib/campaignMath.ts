// The Visibility Campaigns money model (CLAUDE.md → The model).
// Keep every number here so the site, calculator and apps all agree.

export const MIN_BUDGET = 5000;
export const CREATOR_SHARE = 0.7;
export const SPOT_COST = 1750;

// Verified campaigns: of the creator money, 30% is split equally per post, 70% by verified views
export const EQUAL_SHARE = 0.3;

// Open campaigns: ₦1,000 per 1,000 verified views, creator gets ₦700 of it.
// A post earns from its 1,000th view up to its 5,000th.
export const OPEN_PRICE_PER_1000 = 1000;
export const OPEN_CREATOR_PER_1000 = 700;
export const OPEN_MIN_VIEWS = 1000;
export const OPEN_MAX_VIEWS = 5000;

export interface VerifiedCampaign {
  creatorMoney: number;
  ourFee: number;
  spots: number;
  equalPool: number;
  viewPool: number;
  equalPerPost: number;
}

export interface OpenCampaign {
  views: number;
  creatorMoney: number;
  ourFee: number;
  minPosts: number;
  maxPosts: number;
  maxPerPost: number;
}

export function verifiedCampaign(budget: number): VerifiedCampaign {
  const creatorMoney = budget * CREATOR_SHARE;
  const spots = Math.floor(creatorMoney / SPOT_COST);
  const equalPool = creatorMoney * EQUAL_SHARE;

  return {
    creatorMoney,
    ourFee: budget - creatorMoney,
    spots,
    equalPool,
    viewPool: creatorMoney - equalPool,
    equalPerPost: spots > 0 ? equalPool / spots : 0,
  };
}

export function openCampaign(budget: number): OpenCampaign {
  const views = (budget / OPEN_PRICE_PER_1000) * 1000;

  return {
    views,
    creatorMoney: (views / 1000) * OPEN_CREATOR_PER_1000,
    ourFee: budget - (views / 1000) * OPEN_CREATOR_PER_1000,
    // Fewest posts if every post hits the 5,000-view cap, most if each stops at 1,000
    minPosts: Math.ceil(views / OPEN_MAX_VIEWS),
    maxPosts: Math.floor(views / OPEN_MIN_VIEWS),
    maxPerPost: (OPEN_MAX_VIEWS / 1000) * OPEN_CREATOR_PER_1000,
  };
}
