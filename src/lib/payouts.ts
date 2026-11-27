// Creator payouts as decided (CLAUDE.md → Payouts, 2026-11-23): everything
// earned by the last day of a month is paid on the 5th of the next month, with
// no fee. The minimum is ₦1,000 until 31 January 2027, then ₦5,000; smaller
// balances roll over. Dates are Nigerian time (WAT, UTC+1).
// Tests: pnpm test:payouts

export const PAYOUT_DAY = 5;
export const LAUNCH_MINIMUM = 1000;
export const STANDARD_MINIMUM = 5000;
// Last day of the launch minimum, in Lagos time
const LAUNCH_MINIMUM_ENDS = Date.UTC(2027, 1, 1) - 60 * 60 * 1000; // 1 Feb 2027 00:00 WAT

// Today's calendar date in Lagos
function lagosDate(now: Date) {
  const lagos = new Date(now.getTime() + 60 * 60 * 1000);
  return { y: lagos.getUTCFullYear(), m: lagos.getUTCMonth(), d: lagos.getUTCDate() };
}

// The next payout day, as a date (midday UTC so it reads the same everywhere).
// On the 5th itself, that day's payout is still the next one.
export function nextPayoutDate(now = new Date()): Date {
  const { y, m, d } = lagosDate(now);
  return d <= PAYOUT_DAY ? new Date(Date.UTC(y, m, PAYOUT_DAY, 12)) : new Date(Date.UTC(y, m + 1, PAYOUT_DAY, 12));
}

// The minimum that applies on a given payout day
export function minimumPayout(on = nextPayoutDate()): number {
  return on.getTime() < LAUNCH_MINIMUM_ENDS ? LAUNCH_MINIMUM : STANDARD_MINIMUM;
}

export function formatPayoutDate(date: Date): string {
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "long", timeZone: "Africa/Lagos" });
}

// Nigerian account numbers (NUBAN) are 10 digits
export function cleanAccountNumber(value: string): string {
  return value.replace(/\D/g, "");
}
export function accountNumberError(value: string): string | null {
  return /^\d{10}$/.test(value) ? null : "Account numbers have 10 digits";
}
