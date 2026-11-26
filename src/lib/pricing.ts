// The pricing and pay rules (CLAUDE.md → The model; plan: docs/plans/pricing-and-pay.md, step A1).
//
// One place for every number and calculation, so the campaign builder, the
// server that takes payment, the admin pages and the creator pages can never
// disagree. Pure functions only: no React, no Supabase, no path aliases, so
// `node --test` can run src/lib/pricing.test.ts directly.
//
// Campaigns made under these rules are pricing version 2. Older campaigns
// (version 1: one rate, per post or per 1,000 views) keep their old rules in
// campaignOptions.ts until they end.

export const PRICING_VERSION = 2;

export type CampaignType = "open" | "verified";

// ---------------------------------------------------------------
// The fee (decided 2026-11-22 and 23): added on top of the budget.
// 10% launch fee until 31 January 2027, 20% from 1 February 2027.
// Fixed at payment time: a campaign paid on 31 January keeps 10%.
// ---------------------------------------------------------------
export const LAUNCH_FEE_RATE = 0.1;
export const STANDARD_FEE_RATE = 0.2;
export const FEE_RISE_DATE = "2027-02-01";
export const LAUNCH_FEE_ENDS_LABEL = "31 January 2027";

// Nigeria is UTC+1 all year (no daylight saving)
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// The calendar date in Lagos, as YYYY-MM-DD
export function lagosDate(date: Date = new Date()): string {
  return new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
}

export function feeRateOn(date: Date = new Date()): number {
  return lagosDate(date) >= FEE_RISE_DATE ? STANDARD_FEE_RATE : LAUNCH_FEE_RATE;
}

export function isLaunchFee(rate: number): boolean {
  return rate === LAUNCH_FEE_RATE;
}

// ---------------------------------------------------------------
// Budgets and rates
// ---------------------------------------------------------------
export const MIN_BUDGET: Record<CampaignType, number> = { open: 15000, verified: 30000 };

// Verified: 30% of the budget pays per post, 70% pays for views
export const POST_SHARE = 0.3;

// Per-post pay (verified only)
export const POST_RATE = { min: 300, suggested: 500 };

// Pay per 1,000 views (decided 2026-11-24, D7, open set to ₦400 the same day):
// open posts come from smaller, unverified creators, so open campaigns start lower
export const VIEW_RATE: Record<CampaignType, { min: number; suggested: number }> = {
  open: { min: 400, suggested: 400 },
  verified: { min: 700, suggested: 700 },
};

// Views under the floor earn nothing (open only; verified posts are paid
// from the first view because the post fee covers small posts, D5)
export const VIEW_FLOOR: Record<CampaignType, number> = { open: 1000, verified: 0 };

// The maximum view payout per post defaults to this many views' worth (D1)
export const DEFAULT_CAP_VIEWS = 5000;

// ---------------------------------------------------------------
// Time
// ---------------------------------------------------------------
export const END_DAYS = { min: 7, max: 30, default: 14 };
export const VIEW_WINDOW_DAYS = 14; // views count up to 14 days after each post
export const POST_FEE_UNLOCK_DAYS = 7; // the post must still be live 7 days later
export const KEEP_LIVE_DAYS = 30;

// ---------------------------------------------------------------
// Payouts (D4): monthly on the 5th, for everything earned by month-end.
// Minimum ₦1,000 until 31 January 2027, then ₦5,000; smaller balances roll over.
// ---------------------------------------------------------------
export const PAYOUT_DAY = 5;
export const LAUNCH_MIN_PAYOUT = 1000;
export const STANDARD_MIN_PAYOUT = 5000;

export function minimumPayoutOn(date: Date = new Date()): number {
  return lagosDate(date) >= FEE_RISE_DATE ? STANDARD_MIN_PAYOUT : LAUNCH_MIN_PAYOUT;
}

// The payout an amount earned on `date` goes out in: the 5th of the next month
// (Lagos dates), returned as YYYY-MM-DD
export function payoutDateFor(date: Date = new Date()): string {
  const [y, m] = lagosDate(date).split("-").map(Number) as [number, number];
  const year = m === 12 ? y + 1 : y;
  const month = m === 12 ? 1 : m + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(PAYOUT_DAY).padStart(2, "0")}`;
}

// The date `days` after a YYYY-MM-DD date, as YYYY-MM-DD
export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// Whole days from one YYYY-MM-DD date to another
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

// ---------------------------------------------------------------
// Planning a campaign
// ---------------------------------------------------------------
export interface PlanInput {
  type: CampaignType;
  budget: number;
  viewRate: number;
  // Verified only
  postRate?: number;
  // Naira; defaults to DEFAULT_CAP_VIEWS views' worth
  maxViewPayout?: number;
  // When it's paid for; decides the fee
  paidAt?: Date;
}

export type PlanField = "budget" | "postRate" | "viewRate" | "maxViewPayout";

export interface PlanError {
  field: PlanField;
  message: string;
}

export interface Plan {
  type: CampaignType;
  budget: number;
  feeRate: number;
  fee: number;
  // What the brand pays: budget + fee
  total: number;
  postRate: number;
  // Verified: creator spots. Open: null (no fixed spots)
  spots: number | null;
  postPool: number;
  viewPool: number;
  viewRate: number;
  viewFloor: number;
  maxViewPayout: number;
  // Views it takes to reach the maximum view payout
  viewCap: number;
  // How many views the view share pays for at the full rate
  paidViews: number;
  // The most one creator can earn on this campaign
  maxPerCreator: number;
  // How many creators the view share can pay: everyone at the maximum, or
  // everyone at the floor (open). Verified: the spots.
  creatorsMin: number;
  creatorsMax: number;
  errors: PlanError[];
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export function defaultMaxViewPayout(viewRate: number): number {
  return Math.round((DEFAULT_CAP_VIEWS / 1000) * viewRate);
}

// Whole naira only; anything unusable becomes 0
function money(value: number | undefined): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function planCampaign(input: PlanInput): Plan {
  const type = input.type;
  const budget = money(input.budget);
  const viewRate = money(input.viewRate);
  const postRate = type === "verified" ? money(input.postRate) : 0;
  const feeRate = feeRateOn(input.paidAt);
  const fee = Math.round(budget * feeRate);
  const errors: PlanError[] = [];

  // Budget
  const min = MIN_BUDGET[type];
  if (budget < min) {
    errors.push({
      field: "budget",
      message:
        budget > 0
          ? `Add ${naira(min - budget)} to reach the ${naira(min)} minimum for ${type} campaigns.`
          : `Enter a budget of at least ${naira(min)}.`,
    });
  }

  // Rates
  const viewMin = VIEW_RATE[type].min;
  if (viewRate < viewMin) {
    errors.push({ field: "viewRate", message: `Pay at least ${naira(viewMin)} per 1,000 views.` });
  }

  let spots: number | null = null;
  let postPool = 0;
  if (type === "verified") {
    if (postRate < POST_RATE.min) {
      errors.push({ field: "postRate", message: `Pay at least ${naira(POST_RATE.min)} per post.` });
    } else {
      const share = Math.round(budget * POST_SHARE);
      spots = Math.floor(share / postRate);
      // Leftover from the post share joins the view share
      postPool = spots * postRate;
      if (budget >= min && spots < 1) {
        errors.push({
          field: "postRate",
          message: `At ${naira(postRate)} per post this budget can't fund a single spot. Lower the rate or raise the budget.`,
        });
      }
    }
  }
  const viewPool = budget - postPool;

  // Maximum view payout per post
  const maxViewPayout = input.maxViewPayout === undefined ? defaultMaxViewPayout(viewRate) : money(input.maxViewPayout);
  if (viewRate > 0) {
    if (maxViewPayout < viewRate) {
      errors.push({
        field: "maxViewPayout",
        message: `The most a post earns from views must be at least ${naira(viewRate)} (1,000 views at your rate).`,
      });
    } else if (viewPool > 0 && maxViewPayout > viewPool) {
      errors.push({
        field: "maxViewPayout",
        message: `The most a post earns from views can't be more than the ${naira(viewPool)} set aside for views.`,
      });
    }
  }

  const viewFloor = VIEW_FLOOR[type];
  const viewCap = viewRate > 0 ? Math.floor((maxViewPayout / viewRate) * 1000) : 0;
  const paidViews = viewRate > 0 ? Math.floor((viewPool / viewRate) * 1000) : 0;

  let creatorsMin: number;
  let creatorsMax: number;
  if (type === "verified") {
    creatorsMin = creatorsMax = spots ?? 0;
  } else {
    creatorsMin = viewCap > 0 ? Math.ceil(paidViews / viewCap) : 0;
    creatorsMax = viewFloor > 0 ? Math.floor(paidViews / viewFloor) : creatorsMin;
  }

  return {
    type,
    budget,
    feeRate,
    fee,
    total: budget + fee,
    postRate,
    spots,
    postPool,
    viewPool,
    viewRate,
    viewFloor,
    maxViewPayout,
    viewCap,
    paidViews,
    maxPerCreator: postRate + maxViewPayout,
    creatorsMin,
    creatorsMax,
    errors,
  };
}

// ---------------------------------------------------------------
// Paying creators
// ---------------------------------------------------------------

// What one post's verified views earn before any share-out (D1, D5)
export function viewPayFor(views: number, plan: Pick<Plan, "viewRate" | "viewFloor" | "maxViewPayout">): number {
  const v = Math.floor(Number(views));
  if (!Number.isFinite(v) || v <= 0 || v < plan.viewFloor) return 0;
  return Math.min(Math.floor((v / 1000) * plan.viewRate), plan.maxViewPayout);
}

export interface Settlement {
  // 1 when everyone is paid in full; below 1 when views went past the share
  scale: number;
  // Final view pay per post, in the same order as the estimates
  amounts: number[];
  paid: number;
  // What's left of the view share (becomes credit for the business)
  leftover: number;
}

// Closing a campaign (D3): if the estimates add up to more than the view
// share, everyone gets the same percentage of theirs. Whole naira, rounded
// down, so the total never passes the share.
export function settleViews(estimates: number[], viewPool: number): Settlement {
  const pool = Math.max(0, Math.floor(viewPool));
  const clean = estimates.map((e) => Math.max(0, Math.floor(Number(e) || 0)));
  const total = clean.reduce((sum, e) => sum + e, 0);
  const scale = total > pool && total > 0 ? pool / total : 1;
  const amounts = clean.map((e) => (scale === 1 ? e : Math.floor(e * scale)));
  const paid = amounts.reduce((sum, a) => sum + a, 0);
  return { scale, amounts, paid, leftover: pool - paid };
}
