import { campaignProgress } from "@/components/CampaignProgress";
import { ALL, MAX_PAID_VIEWS } from "@/lib/campaignOptions";
import { POST_FEE_UNLOCK_DAYS, VIEW_WINDOW_DAYS } from "@/lib/pricing";
import type { Task } from "@/lib/types";

// Shared helpers for Discover, the campaign page and My campaigns.

export const DAY_MS = 24 * 60 * 60 * 1000;

export function todayISO(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export function formatDate(isoDate: string): string {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00`).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "now", "5m", "3h", "2d", "1w", "2mo", "1y"
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 30) return `${Math.floor(s / (86400 * 7))}w`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo`;
  return `${Math.floor(s / (86400 * 365))}y`;
}

// ₦1.2K / ₦26.3K / ₦1.5M for tight spaces; full naira below ₦1,000
export function compactNaira(value: number | null | undefined): string {
  const n = Number(value) || 0;
  if (n < 1000) return `₦${Math.round(n).toLocaleString("en-NG")}`;
  return `₦${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
}

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// "Uyo, Akwa Ibom, Nigeria", skipping "All" levels. Campaigns from before
// screen 5 (26 Nov 2026) have no city and may name a zone.
export function targetLabel(task: Task): string {
  const city = (task as Task & { target_city?: string | null }).target_city;
  return [city, task.target_state, task.target_state && task.target_state !== ALL ? null : task.target_zone, task.target_country]
    .filter((part) => part && part !== ALL)
    .join(", ");
}

// Live, with budget left. Suspended, removed and completed campaigns are hidden.
export function isOpenCampaign(task: Task): boolean {
  return (task.status || "active") === "active" && !campaignProgress(task)?.completed;
}

export function notStartedYet(task: Task, today = todayISO()): boolean {
  return task.start_date !== null && task.start_date.slice(0, 10) > today;
}

// The one tag a card carries, most useful first
export type CampaignTag = { label: string; tone: "signal" | "dark" };

export function campaignTag(task: Task, now = Date.now()): CampaignTag | null {
  if (notStartedYet(task)) return { label: `Opens ${formatDate(task.start_date!)}`, tone: "dark" };
  const p = campaignProgress(task);
  if (p && p.max > 0 && p.spotsLeft / p.max <= 0.25) return { label: "Almost full", tone: "signal" };
  if (now - new Date(task.created_at).getTime() < 7 * DAY_MS) return { label: "New", tone: "signal" };
  return null;
}

// Plain-language submission status for creators
export const SUBMISSION_STATUS: Record<string, { label: string; tone: "warning" | "verified" | "error" | "muted" }> = {
  pending: { label: "In review", tone: "warning" },
  review: { label: "In review", tone: "warning" },
  processing: { label: "In review", tone: "warning" },
  approved: { label: "Approved", tone: "verified" },
  paid: { label: "Paid", tone: "verified" },
  rejected: { label: "Not approved", tone: "error" },
  failed: { label: "Not approved", tone: "error" },
};

export function submissionStatus(status: string | null | undefined) {
  return SUBMISSION_STATUS[String(status || "").toLowerCase()] ?? { label: status || "Submitted", tone: "muted" as const };
}

// ---------------------------------------------------------
// Campaign type and pay. Version 1 campaigns have one rate (reward, per post
// or per 1,000 views). Version 2 (decided 2026-11-22 to 24) store their own
// terms: open pays per 1,000 views, verified pays per post plus per view.

type TypedFields = {
  campaign_type?: string | null;
  pay_model?: string | null;
  reward?: number | null;
  pricing_version?: number | null;
  post_rate?: number | null;
  view_rate?: number | null;
  view_floor?: number | null;
  max_view_payout?: number | null;
};

export function isPricingV2(task: TypedFields): boolean {
  return task.pricing_version === 2;
}

export function campaignTypeOf(task: TypedFields): "open" | "verified" {
  return task.campaign_type === "verified" ? "verified" : "open";
}

export function payModelOf(task: TypedFields): "per_post" | "per_1k_views" | "post_and_views" {
  if (task.pay_model === "post_and_views") return "post_and_views";
  return task.pay_model === "per_1k_views" ? "per_1k_views" : "per_post";
}

export const CAMPAIGN_TYPE_LABEL = { open: "Open", verified: "Verified" } as const;

// "₦500/post + ₦700/1K views", "₦400/1K views", or an older "₦300/post"
export function taskRateLabel(task: TypedFields): string {
  const naira = (v: number | null | undefined) => `₦${Math.round(Number(v) || 0).toLocaleString("en-NG")}`;
  if (isPricingV2(task)) {
    return task.campaign_type === "verified"
      ? `${naira(task.post_rate)}/post + ${naira(task.view_rate)}/1K views`
      : `${naira(task.view_rate)}/1K views`;
  }
  const n = Math.round(Number(task.reward) || 0).toLocaleString("en-NG");
  return payModelOf(task) === "per_1k_views" ? `₦${n}/1K views` : `₦${n}/post`;
}

const naira = (v: number | null | undefined) => `₦${Math.round(Number(v) || 0).toLocaleString("en-NG")}`;

// The most one creator can earn on a campaign, or null when there's no limit
export function maxEarnFor(task: TypedFields): number | null {
  if (isPricingV2(task)) {
    return (task.campaign_type === "verified" ? Number(task.post_rate) || 0 : 0) + (Number(task.max_view_payout) || 0);
  }
  if (payModelOf(task) === "per_1k_views") return Math.floor((MAX_PAID_VIEWS / 1000) * (Number(task.reward) || 0));
  return Number(task.reward) || null;
}

// How a creator earns on this campaign, in one sentence
export function earnLine(task: TypedFields): string {
  if (isPricingV2(task)) {
    const floor = Number(task.view_floor) || 0;
    if (task.campaign_type === "verified") {
      return `You earn ${naira(task.post_rate)} when your post has been live ${POST_FEE_UNLOCK_DAYS} days, plus ${naira(task.view_rate)} for every 1,000 views in its first ${VIEW_WINDOW_DAYS} days, up to ${naira(maxEarnFor(task))}.`;
    }
    return `You earn ${naira(task.view_rate)} for every 1,000 views in your post's first ${VIEW_WINDOW_DAYS} days${floor ? ` once it passes ${floor.toLocaleString("en-NG")} views` : ""}, up to ${naira(maxEarnFor(task))}.`;
  }
  if (payModelOf(task) === "per_1k_views") {
    return `You earn ${naira(task.reward)} for every 1,000 verified views, from 1,000 views, up to ${naira(maxEarnFor(task))}.`;
  }
  return `You earn ${naira(task.reward)} when your post is approved.`;
}

// What a submitted post has earned so far: what was actually paid. Older
// per-post campaigns paid the rate on approval.
export function postEarnings(
  sub: { status?: string | null; payout_amount?: number | null },
  task: TypedFields | null | undefined
): number {
  if (sub.payout_amount !== null && sub.payout_amount !== undefined) return Number(sub.payout_amount) || 0;
  if (!task || isPricingV2(task) || payModelOf(task) !== "per_post") return 0;
  return sub.status === "approved" || sub.status === "paid" ? Number(task.reward) || 0 : 0;
}

// Shown after a creator submits a post
export function submittedMessage(task: TypedFields): string {
  if (isPricingV2(task)) {
    return task.campaign_type === "verified"
      ? `We'll check it against the brief. Your ${naira(task.post_rate)} is earned once it has been live ${POST_FEE_UNLOCK_DAYS} days, and views are counted for ${VIEW_WINDOW_DAYS} days.`
      : `We'll check it against the brief. Views are counted for ${VIEW_WINDOW_DAYS} days and paid at ${naira(task.view_rate)} per 1,000.`;
  }
  return payModelOf(task) === "per_1k_views"
    ? `We'll check it and pay ${naira(task.reward)} per 1,000 verified views when it's approved.`
    : `We'll check it and pay ${naira(task.reward)} to your balance when it's approved.`;
}

// What creators can earn in total: version 2 stores it without the fee;
// older campaigns only have the amount paid
export function campaignBudget(task: { budget?: number | null; amount_paid?: number | null }): number {
  return Number(task.budget) || Number(task.amount_paid) || 0;
}

// "Runs 3 Dec 2026 to 17 Dec 2026", "Starts 3 Dec 2026" or "Started"
export function runsLabel(task: { start_date?: string | null; end_date?: string | null }): string {
  if (task.start_date && task.end_date) return `Runs ${formatDate(task.start_date)} to ${formatDate(task.end_date)}`;
  return task.start_date ? `Starts ${formatDate(task.start_date)}` : "Started";
}

// Campaign status for the business and admins (review decided 2026-11-19)
export const CAMPAIGN_STATUS: Record<string, { label: string; tone: "verified" | "muted" | "warning" | "error" }> = {
  pending_review: { label: "In review", tone: "warning" },
  active: { label: "Live", tone: "verified" },
  completed: { label: "Completed", tone: "muted" },
  suspended: { label: "Suspended", tone: "warning" },
  rejected: { label: "Not approved", tone: "error" },
  removed: { label: "Removed", tone: "error" },
};

export function campaignStatus(status: string | null | undefined) {
  return CAMPAIGN_STATUS[String(status || "active")] ?? { label: String(status), tone: "muted" as const };
}
