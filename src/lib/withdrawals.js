// Withdrawal fee rules. The database enforces these in request_withdrawal
// (supabase/migrations/20261030_withdrawal_fee.sql); keep the two in sync.
export const WITHDRAWAL_FEE_RATE = 0.1;
export const MIN_WITHDRAWAL = 500;

// What a withdrawal of `amount` costs and pays out.
// Matches the database: fee rounded to kobo, taken out of the amount.
export function withdrawalBreakdown(amount) {
  const gross = Number(amount) || 0;
  const fee = Math.round(gross * WITHDRAWAL_FEE_RATE * 100) / 100;
  return { amount: gross, fee, net: Math.max(gross - fee, 0) };
}

// Net payout for a saved withdrawal row (older rows have no net_amount)
export function netPayout(withdrawal) {
  return Number(withdrawal.net_amount ?? withdrawal.amount) || 0;
}
