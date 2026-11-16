import { campaignProgress } from "@/components/CampaignProgress";
import { ALL } from "@/lib/campaignOptions";
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

// "Ikeja, South West, Nigeria", skipping "All" levels
export function targetLabel(task: Task): string {
  return [task.target_state, task.target_zone, task.target_country]
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
