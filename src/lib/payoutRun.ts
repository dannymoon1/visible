// The monthly payout run, worked out by hand until Phase B and C of
// docs/plans/pricing-and-pay.md record earnings in the database.
//
// For each creator: what's owed on payout day under the pay rules (CLAUDE.md →
// The model), what's earned but not due yet, and anything that should stop or
// slow a transfer. Used by /api/admin/payouts/run and /admin/payouts/run.
// Tests: pnpm test:payouts
//
// The rules applied:
//   - Post fee (verified campaigns): earned when the post is 7 days old
//     (approved and still live), so it's due if that day is on or before the
//     "earned by" date (the last day of the month before payout day).
//   - View pay: verified views × the campaign's rate per 1,000, nothing under
//     the floor, never more than the per-post maximum. If a campaign's view pay
//     would pass its view share, everyone's is cut by the same percentage.
//     Final when the campaign closes: its end date plus the 14 days views
//     count for. Before that it's an estimate, shown as "not due yet".
//   - Older campaigns (pricing version 1) already credited the creator's
//     balance when the post was approved; that balance is owed in full.
//   - Below the minimum, nothing is paid and the balance rolls over.

import { POST_FEE_UNLOCK_DAYS, VIEW_WINDOW_DAYS, addDays, settleViews, viewPayFor } from "./pricing.ts";
import { minimumPayout } from "./payouts.ts";

export interface RunPost {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  campaignType: "open" | "verified";
  postRate: number;
  viewRate: number;
  viewFloor: number;
  maxViewPayout: number;
  viewPool: number;
  endDate: string; // YYYY-MM-DD
  postedOn: string; // YYYY-MM-DD, Lagos
  views: number | null;
  postUrl: string | null;
  platform: string | null;
}

export interface Bank {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface RunCreator {
  id: string;
  handle: string | null;
  name: string;
  email: string | null;
  verified: boolean;
  // Credited by older campaigns and not yet paid out
  balance: number;
  bank: Bank | null;
}

export interface PostLine extends RunPost {
  postFee: number;
  postFeeDueOn: string | null;
  viewPay: number; // after any share-out cut
  viewScale: number; // 1 = paid in full
  viewsFinalOn: string;
  dueNow: number;
  notDueYet: number;
}

export type Flag = "no_bank" | "bad_account" | "shared_account" | "missing_views" | "below_minimum";

export interface CreatorLine extends RunCreator {
  posts: PostLine[];
  older: number;
  dueNow: number; // older + post amounts due by the rules
  notDueYet: number; // earned, but not due by the rules yet
  flags: Flag[];
}

export interface Run {
  through: string;
  payday: string;
  minimum: number;
  creators: CreatorLine[];
}

export const FLAG_LABELS: Record<Flag, string> = {
  no_bank: "No payout account",
  bad_account: "Account number isn't 10 digits",
  shared_account: "Account number used by another creator",
  missing_views: "Posts missing views",
  below_minimum: "Below the minimum: rolls over",
};

const naira = (n: number) => Math.max(0, Math.floor(Number(n) || 0));

export function buildRun(posts: RunPost[], creators: RunCreator[], through: string, payday: string): Run {
  const minimum = minimumPayout(new Date(`${payday}T12:00:00Z`));

  // Share-out per campaign, over every approved post with views
  const scaleOf = new Map<string, number>();
  const byTask = new Map<string, RunPost[]>();
  posts.forEach((p) => byTask.set(p.taskId, [...(byTask.get(p.taskId) ?? []), p]));
  byTask.forEach((list, taskId) => {
    const estimates = list.map((p) => (p.views === null ? 0 : viewPayFor(p.views, p)));
    scaleOf.set(taskId, settleViews(estimates, list[0]!.viewPool).scale);
  });

  const lines: PostLine[] = posts.map((p) => {
    const viewScale = scaleOf.get(p.taskId) ?? 1;
    const estimate = p.views === null ? 0 : viewPayFor(p.views, p);
    const viewPay = viewScale === 1 ? estimate : Math.floor(estimate * viewScale);
    const postFee = p.campaignType === "verified" ? naira(p.postRate) : 0;
    const postFeeDueOn = postFee > 0 ? addDays(p.postedOn, POST_FEE_UNLOCK_DAYS) : null;
    const viewsFinalOn = addDays(p.endDate, VIEW_WINDOW_DAYS);
    const feeDue = postFeeDueOn !== null && postFeeDueOn <= through;
    const viewsDue = p.views !== null && viewsFinalOn <= through;
    const dueNow = (feeDue ? postFee : 0) + (viewsDue ? viewPay : 0);
    return {
      ...p,
      postFee,
      postFeeDueOn,
      viewPay,
      viewScale,
      viewsFinalOn,
      dueNow,
      notDueYet: postFee + viewPay - dueNow,
    };
  });

  // Account numbers used by more than one creator
  const accountUsers = new Map<string, number>();
  creators.forEach((c) => {
    const n = c.bank?.accountNumber;
    if (n) accountUsers.set(n, (accountUsers.get(n) ?? 0) + 1);
  });

  const out: CreatorLine[] = creators.map((c) => {
    const mine = lines.filter((l) => l.userId === c.id);
    const older = naira(c.balance);
    const dueNow = older + mine.reduce((s, l) => s + l.dueNow, 0);
    const notDueYet = mine.reduce((s, l) => s + l.notDueYet, 0);
    const flags: Flag[] = [];
    if (!c.bank) flags.push("no_bank");
    else if (!/^\d{10}$/.test(c.bank.accountNumber)) flags.push("bad_account");
    if (c.bank && (accountUsers.get(c.bank.accountNumber) ?? 0) > 1) flags.push("shared_account");
    if (mine.some((l) => l.views === null)) flags.push("missing_views");
    if (dueNow > 0 && dueNow < minimum) flags.push("below_minimum");
    return { ...c, posts: mine, older, dueNow, notDueYet, flags };
  });

  out.sort((a, b) => b.dueNow + b.notDueYet - (a.dueNow + a.notDueYet));
  return { through, payday, minimum, creators: out.filter((c) => c.dueNow + c.notDueYet > 0 || c.posts.length > 0) };
}

// What this run pays a creator. With `early`, amounts earned but not due yet
// are included (for paying our own launch campaign before Phase B exists).
// Zero when there's no usable account, accounts are shared, or it's under the minimum.
export function amountToPay(c: CreatorLine, minimum: number, early: boolean): number {
  const total = c.dueNow + (early ? c.notDueYet : 0);
  if (c.flags.some((f) => f === "no_bank" || f === "bad_account" || f === "shared_account")) return 0;
  return total >= minimum ? total : 0;
}

// The month before payout day ends on the "earned by" date
export function earnedByFor(payday: string): string {
  const [y, m] = payday.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------
// CSV for the bank and for our records

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Quote anything with a comma, quote or line break; stop spreadsheets
  // treating text as a formula
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function bankSheet(run: Run, early: boolean): string {
  const month = new Date(`${run.payday}T12:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  const rows: unknown[][] = [["Account name", "Account number", "Bank", "Amount (NGN)", "Narration", "Handle", "Email"]];
  run.creators.forEach((c) => {
    const amount = amountToPay(c, run.minimum, early);
    if (amount > 0 && c.bank) {
      rows.push([c.bank.accountName, c.bank.accountNumber, c.bank.bankName, amount, `Visibility payout ${month}`, c.handle ?? "", c.email]);
    }
  });
  return toCsv(rows);
}

export function detailSheet(run: Run): string {
  const rows: unknown[][] = [
    ["Handle", "Email", "Campaign", "Type", "Platform", "Post", "Posted", "Views", "Post fee", "Post fee due", "View pay", "Share-out %", "Views final", "Due now", "Not due yet"],
  ];
  run.creators.forEach((c) => {
    if (c.older > 0) rows.push([c.handle ?? "", c.email, "Older campaigns (balance)", "", "", "", "", "", "", "", "", "", "", c.older, 0]);
    c.posts.forEach((p) =>
      rows.push([
        c.handle ?? "",
        c.email,
        p.taskTitle,
        p.campaignType,
        p.platform,
        p.postUrl,
        p.postedOn,
        p.views ?? "missing",
        p.postFee,
        p.postFeeDueOn ?? "",
        p.viewPay,
        Math.round(p.viewScale * 100),
        p.viewsFinalOn,
        p.dueNow,
        p.notDueYet,
      ])
    );
  });
  return toCsv(rows);
}
