"use client";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Withdrawal } from "@/lib/types";
import { CalendarCheck, Check, CreditCard, Landmark, User, Wallet, X } from "lucide-react";
import {
  accountNumberError,
  cleanAccountNumber,
  formatPayoutDate,
  minimumPayout,
  nextPayoutDate,
} from "@/lib/payouts";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  StatusBadge,
  TableWrap,
  tableClasses,
  formatNaira,
} from "@/components/ui";

// Earnings (tier 1 of the creator-launch build, 2026-11-27). Creators are paid
// monthly on the 5th and keep 100% (CLAUDE.md → Payouts), so this page no
// longer offers withdrawals or shows the old 10% withdrawal fee. It shows the
// balance, the next payout day and minimum, and the bank account we pay into.
// Bank details live in the account's metadata (bank_name, account_number,
// account_name), the same fields the profile card edits.
//
// Not changed yet: request_withdrawal() and the fee still exist in the
// database (src/lib/withdrawals.ts); they go with Phase C of
// docs/plans/pricing-and-pay.md. Requests made before this change still show
// below, and pending ones can be cancelled to return the money.

function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function EarningsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [requests, setRequests] = useState<Withdrawal[]>([]);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saved, setSaved] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const payday = nextPayoutDate();
  const minimum = minimumPayout(payday);

  const refreshData = async (uid: string): Promise<void> => {
    const [{ data: profile }, { data: history }] = await Promise.all([
      supabase.from("profiles").select("balance").eq("id", uid).single(),
      supabase.from("withdrawals").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
    ]);
    setBalance(Number(profile?.balance ?? 0));
    if (history) setRequests(history);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      setUserId(user.id);
      const meta: Record<string, unknown> = user.user_metadata || {};
      const str = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string) : "");
      setBankName(str("bank_name"));
      setAccountNumber(str("account_number"));
      setAccountName(str("account_name"));
      setSaved(Boolean(str("bank_name") && str("account_number") && str("account_name")));
      refreshData(user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveAccount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const number = cleanAccountNumber(accountNumber);
    const numberError = accountNumberError(number);
    if (numberError) {
      setAccountError(numberError);
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { bank_name: bankName.trim(), account_number: number, account_name: accountName.trim() },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAccountNumber(number);
    setSaved(true);
    toast.success("Payout account saved");
  };

  const handleCancel = async (id: string) => {
    if (!userId) return;
    setCancelingId(id);
    const { error } = await supabase.rpc("cancel_withdrawal", { withdrawal_id: id, user_id_input: userId });
    setCancelingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Request cancelled. The money is back in your balance.");
    refreshData(userId);
  };

  const below = balance !== null && balance < minimum;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Wallet"
        title="Earnings"
        description="We pay what you earn to your bank account once a month, on the 5th. You keep 100%."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          {/* Balance and next payout */}
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-medium text-ink-900">Your balance</p>
              <Wallet className="h-5 w-5 text-ink-400" aria-hidden="true" />
            </div>
            <p className="tabular mt-2 break-words font-heading text-4xl font-bold tracking-tight text-ink-950">
              {balance === null ? "…" : formatNaira(balance)}
            </p>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-ink-50 p-4">
              <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-ink-700" aria-hidden="true" />
              <div className="text-sm leading-relaxed text-ink-700">
                <p className="font-semibold text-ink-900">Paid on {formatPayoutDate(payday)}</p>
                <p className="mt-1">
                  Everything you earn by the last day of a month is paid on the 5th of the next month. No fees.
                </p>
                <p className="mt-1">
                  Minimum payout: <span className="tabular font-medium">{formatNaira(minimum)}</span>.{" "}
                  {below ? "Your balance is below it, so it rolls over to the next month." : "Smaller balances roll over to the next month."}
                </p>
              </div>
            </div>
          </Card>

          {/* Payout account */}
          <Card>
            <CardHeader
              title="Payout account"
              description="Where we send your money on the 5th. The account name must match your ID."
            />
            <form onSubmit={saveAccount} className="space-y-4 p-6">
              <Field label="Bank name" htmlFor="bankName">
                <Input
                  id="bankName"
                  type="text"
                  icon={Landmark}
                  placeholder="e.g. GTBank, Opay, Moniepoint"
                  value={bankName}
                  onChange={(e) => {
                    setBankName(e.target.value);
                    setSaved(false);
                  }}
                  required
                />
              </Field>

              <Field label="Account number" htmlFor="accountNumber" error={accountError ?? undefined}>
                <Input
                  id="accountNumber"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  icon={CreditCard}
                  placeholder="10 digits"
                  maxLength={13}
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value);
                    setAccountError(null);
                    setSaved(false);
                  }}
                  required
                  className="tabular"
                />
              </Field>

              <Field label="Account name" htmlFor="accountName">
                <Input
                  id="accountName"
                  type="text"
                  icon={User}
                  placeholder="Name on the account"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    setSaved(false);
                  }}
                  required
                />
              </Field>

              {saved ? (
                <p className="flex items-center gap-2 text-sm font-medium text-verified">
                  <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> Saved. We&apos;ll pay into this account.
                </p>
              ) : (
                <Button type="submit" variant="brand" size="lg" loading={saving} className="w-full">
                  Save payout account
                </Button>
              )}
            </form>
          </Card>
        </div>

        {/* Requests made before monthly payouts, if any */}
        {requests.length > 0 && (
          <Card className="min-w-0 self-start lg:col-span-3">
            <CardHeader title="Earlier withdrawal requests" description="Made before monthly payouts started." />
            <TableWrap>
              <table className={tableClasses.table}>
                <thead className={tableClasses.thead}>
                  <tr>
                    <th className={tableClasses.th}>Amount</th>
                    <th className={tableClasses.th}>Date</th>
                    <th className={tableClasses.th}>Status</th>
                    <th className={tableClasses.th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} className={tableClasses.tr}>
                      <td className={tableClasses.td}>
                        <span className="tabular whitespace-nowrap font-semibold text-ink-950">{formatNaira(req.amount)}</span>
                      </td>
                      <td className={tableClasses.td}>
                        <span className="whitespace-nowrap text-ink-500">{formatDay(req.created_at)}</span>
                      </td>
                      <td className={tableClasses.td}>
                        <StatusBadge status={req.status === "canceled" ? "cancelled" : req.status} />
                      </td>
                      <td className={`${tableClasses.td} text-right`}>
                        {req.status === "pending" && (
                          <Button variant="danger" size="sm" icon={X} loading={cancelingId === req.id} onClick={() => handleCancel(req.id)}>
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        )}
      </div>
    </div>
  );
}
