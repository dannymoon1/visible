"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { WITHDRAWAL_FEE_RATE, MIN_WITHDRAWAL, withdrawalBreakdown, netPayout } from "@/lib/withdrawals";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Building2,
  Clock,
  CreditCard,
  History,
  Landmark,
  ShieldCheck,
  User,
  Wallet,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeader,
  StatusBadge,
  TableWrap,
  tableClasses,
  formatNaira,
} from "@/components/ui";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WithdrawPage() {
  const [balance, setBalance] = useState(0);
  const [requests, setRequests] = useState([]);
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [userId, setUserId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState(null);

  useEffect(() => {
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);

        // Pre-fill bank details saved in the user's profile
        const meta = user.user_metadata || {};
        if (meta.bank_name) setBankName(meta.bank_name);
        if (meta.account_number) setAccountNumber(meta.account_number);
        if (meta.account_name) setAccountName(meta.account_name);

        refreshData(user.id);
        setupRealtimeSubscription(user.id);
      }
    };
    setup();
  }, []);

  // --- REALTIME LISTENER ---
  const setupRealtimeSubscription = (id) => {
    const channel = supabase
      .channel('withdrawal-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'withdrawals',
          filter: `user_id=eq.${id}`,
        },
        (payload) => {
          console.log("Change detected!", payload);

          // Trigger Toasts based on what the AI Agent did
          if (payload.new.status === 'approved') {
            toast.success("Withdrawal approved", {
              description: "AI verified your funds. Check your email for details."
            });
          } else if (payload.new.status === 'canceled' && payload.new.verification_details) {
            toast.error("Withdrawal Canceled", {
              description: `Reason: ${payload.new.verification_details.replace('_', ' ')}`
            });
          }

          // Refresh the UI to show new balance and status
          refreshData(id);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const refreshData = async (uid) => {
    const currentId = uid || userId;
    if (!currentId) return;

    // 1. Fetch Balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', currentId)
      .single();
    if (profile) setBalance(profile.balance);

    // 2. Fetch History
    const { data: history } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', currentId)
      .order('created_at', { ascending: false });
    if (history) setRequests(history);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const bankInfo = `${bankName} | ${accountNumber} | ${accountName}`;

      const { error } = await supabase.rpc('request_withdrawal', {
        user_id_input: userId,
        amount_input: parseFloat(amount),
        bank_info: bankInfo
      });

      if (error) {
        toast.error(error.message);
      } else {
        const { net, fee } = withdrawalBreakdown(amount);
        toast.success("Withdrawal requested", {
          description: `You'll receive ${formatNaira(net)} after the ${formatNaira(fee)} fee.`,
        });
        setAmount("");
        setBankName("");
        setAccountNumber("");
        setAccountName("");
        refreshData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    setCancelingId(id);
    try {
      const { error } = await supabase.rpc('cancel_withdrawal', {
        withdrawal_id: id,
        user_id_input: userId
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.warning("Withdrawal canceled.");
        refreshData();
      }
    } finally {
      setCancelingId(null);
    }
  };

  const pendingTotal = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const breakdown = withdrawalBreakdown(amount);
  const feePercent = `${WITHDRAWAL_FEE_RATE * 100}%`;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Wallet"
        title="Withdraw funds"
        description="Move your earnings to your bank account. Every request is verified before payout."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left column: balance + form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Hero balance card */}
          <div className="relative overflow-hidden rounded-2xl border border-gold-400/20 bg-gradient-to-br from-ink-800 to-ink-900 p-6 shadow-lifted">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />

            <div className="relative flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-300">
                Available Balance
              </p>
              <Wallet className="h-5 w-5 text-gold-300/80" />
            </div>

            <p className="tabular relative mt-4 break-words font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {formatNaira(balance)}
            </p>

            <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs">
              <span className="flex items-center gap-1.5 text-ink-300">
                <Clock className="h-3.5 w-3.5" />
                Pending:{" "}
                <span className="tabular font-semibold text-white">
                  {formatNaira(pendingTotal)}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-ink-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Verified payouts
              </span>
            </div>
          </div>

          {/* Withdrawal form */}
          <Card>
            <CardHeader
              title="Request a withdrawal"
              description={`Minimum withdrawal is ${formatNaira(MIN_WITHDRAWAL)}. A ${feePercent} platform fee applies.`}
            />
            <form onSubmit={handleWithdraw} className="space-y-4 p-6">
              <Field label="Amount" htmlFor="amount" hint="This amount comes off your balance; the fee is taken from it.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-ink-500">
                    ₦
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    min={MIN_WITHDRAWAL}
                    step="any"
                    placeholder="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    required
                    className="tabular pl-9 text-base font-semibold"
                  />
                </div>
              </Field>

              {/* Live fee breakdown */}
              <dl className="space-y-2 rounded-xl border border-ink-200 bg-ink-50/60 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Withdrawal amount</dt>
                  <dd className="tabular font-medium text-ink-800">{formatNaira(breakdown.amount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-500">Platform fee ({feePercent})</dt>
                  <dd className="tabular font-medium text-red-600">
                    {breakdown.fee > 0 ? `− ${formatNaira(breakdown.fee)}` : formatNaira(0)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-ink-200 pt-2">
                  <dt className="font-semibold text-ink-800">You&apos;ll receive</dt>
                  <dd className="tabular font-display text-lg font-semibold text-emerald-600">
                    {formatNaira(breakdown.net)}
                  </dd>
                </div>
              </dl>

              <Field label="Bank name" htmlFor="bankName">
                <Input
                  id="bankName"
                  type="text"
                  icon={Landmark}
                  placeholder="e.g. GTBank"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  required
                />
              </Field>

              <Field label="Account number" htmlFor="accountNumber">
                <Input
                  id="accountNumber"
                  type="text"
                  inputMode="numeric"
                  icon={CreditCard}
                  placeholder="10 digits"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  required
                  className="tabular"
                />
              </Field>

              <Field label="Account name" htmlFor="accountName">
                <Input
                  id="accountName"
                  type="text"
                  icon={User}
                  placeholder="Name on account"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  required
                />
              </Field>

              <Button
                type="submit"
                variant="brand"
                size="lg"
                loading={submitting}
                iconRight={ArrowUpRight}
                className="w-full"
              >
                Request Withdrawal
              </Button>
            </form>
          </Card>
        </div>

        {/* Right column: history */}
        <Card className="min-w-0 self-start lg:col-span-3">
          <CardHeader
            title="Recent activity"
            description="Your withdrawal requests and their status."
          />
          {requests.length === 0 ? (
            <EmptyState
              icon={History}
              title="No withdrawals yet"
              description="When you request a withdrawal, it will appear here with its live status."
            />
          ) : (
            <TableWrap>
              <table className={tableClasses.table}>
                <thead className={tableClasses.thead}>
                  <tr>
                    <th className={tableClasses.th}>You receive</th>
                    <th className={tableClasses.th}>Bank details</th>
                    <th className={tableClasses.th}>Date</th>
                    <th className={tableClasses.th}>Status</th>
                    <th className={tableClasses.th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(req => (
                    <tr key={req.id} className={tableClasses.tr}>
                      <td className={tableClasses.td}>
                        <span className="tabular block whitespace-nowrap font-semibold text-ink-950">
                          {formatNaira(netPayout(req))}
                        </span>
                        {Number(req.fee) > 0 && (
                          <span className="tabular block whitespace-nowrap text-xs text-ink-400">
                            of {formatNaira(req.amount)} · {formatNaira(req.fee)} fee
                          </span>
                        )}
                      </td>
                      <td className={tableClasses.td}>
                        <div className="flex min-w-[180px] items-start gap-2">
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                          <span className="text-ink-600">{req.bank_details}</span>
                        </div>
                      </td>
                      <td className={tableClasses.td}>
                        <span className="whitespace-nowrap text-ink-500">
                          {formatDate(req.created_at)}
                        </span>
                      </td>
                      <td className={tableClasses.td}>
                        <StatusBadge
                          status={req.status === "canceled" ? "cancelled" : req.status}
                        />
                      </td>
                      <td className={`${tableClasses.td} text-right`}>
                        {req.status === 'pending' && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={X}
                            loading={cancelingId === req.id}
                            onClick={() => handleCancel(req.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  );
}
