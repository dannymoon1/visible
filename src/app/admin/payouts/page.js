"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Wallet,
  Banknote,
  Hourglass,
  History,
  Inbox,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  Skeleton,
  TableWrap,
  tableClasses,
  formatNaira,
  cn,
} from "@/components/ui";

export default function AdminPayouts() {
  const [requests, setRequests] = useState([]);
  const [view, setView] = useState('pending'); // 'pending' or 'history'
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);
  const [isProcessing, setIsProcessing] = useState(null); // Stores the ID of the withdrawal being paid
  const itemsPerPage = 20;

  // Inside your AdminPayouts component
useEffect(() => {
  const protectRoute = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user?.id)
      .single();

    if (!profile?.is_admin) {
      window.location.href = "/"; // Kick them out if not admin! 🚫
    }
  };
  protectRoute();
}, []);
  useEffect(() => {
    fetchAdminData();
    fetchTotalPending();
  }, [view, page]);

  const fetchAdminData = async () => {
    setLoading(true);
    const from = page * itemsPerPage;
    const to = from + itemsPerPage - 1;

    let query = supabase
      .from('withdrawals')
      .select('*, profiles!left(username)')
      .range(from, to);

    if (view === 'pending') {
      // FIFO: Oldest first to process fairly ⏳
      query = query.eq('status', 'pending').order('created_at', { ascending: true });
    } else {
      // Newest first to see recent activity 📜
      query = query.in('status', ['completed', 'rejected']).order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    
    if (!error) setRequests(data);
    
    setLoading(false);
  };
const fetchTotalPending = async () => {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('amount')
    .eq('status', 'pending');

  if (data) {
    const sum = data.reduce((acc, curr) => acc + curr.amount, 0);
    setTotalPending(sum);
  }
};



const handlePayout = async (withdrawal) => {
  // 1. Disable the button immediately to prevent double-clicks 🖱️🚫
  setIsProcessing(withdrawal.id); 

  try {
    // 2. Call the secure SQL function we created
    // This handles: status -> 'completed' AND profile balance deduction
    const { error: rpcError } = await supabase.rpc('process_payout', {
      withdrawal_id: withdrawal.id,
      user_id: withdrawal.user_id,
      amount_to_subtract: withdrawal.amount
    });

    if (rpcError) throw rpcError;

    // 3. Success! Now we refresh the local state
    toast.success("Payout successful! User balance deducted.");
    
    // This removes the item from the current 'pending' list and updates the Queue Size
    await fetchAdminData(); 
    
    // This updates the 'Total Pending Payouts' header
    await fetchTotalPending();

  } catch (err) {
    console.error("Payout Error:", err);
    toast.error(err.message || "An error occurred during payout.");
  } finally {
    setIsProcessing(null); // Re-enable buttons for other requests
  }
};
  // const handleApprove = async (id) => {
  //   const { error } = await supabase.rpc('approve_withdrawal', { withdrawal_id: id });
  //   if (error) alert(error.message);
  //   else {
  //     alert("Marked as Paid! ✅");
  //     fetchAdminData();
  //     fetchTotalPending();
  //   }
  // };

  const handleReject = async (withdrawal) => {
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  setIsProcessing(withdrawal.id);

  try {
    const { error } = await supabase.rpc('reject_payout', { 
      withdrawal_id: withdrawal.id, 
      user_id: withdrawal.user_id,
      amount_to_refund: withdrawal.amount,
      reason: reason 
    });

    if (error) throw error;

    toast.success("Payout rejected and amount refunded.");
    
    // These calls refresh the UI, move the item to history, 
    // and update the queue size automatically.
    await fetchAdminData();
    await fetchTotalPending();

  } catch (err) {
    toast.error(err.message);
  } finally {
    setIsProcessing(null);
  }
};
  const tabs = [
    { id: "pending", label: "Pending", icon: Hourglass },
    { id: "history", label: "History", icon: History },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Payout management"
        description="Process withdrawal requests in the order they arrived, and review completed or rejected payouts."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total pending payouts"
          value={formatNaira(totalPending)}
          icon={Wallet}
          tone="gold"
          hint="Across all pending withdrawals"
        />
        <StatCard
          label={view === "pending" ? "Queue size" : "Records on this page"}
          value={`${requests.length} ${requests.length === 1 ? "request" : "requests"}`}
          icon={view === "pending" ? Banknote : History}
          tone={view === "pending" ? "warning" : "neutral"}
          hint={`Page ${page + 1}`}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title={view === "pending" ? "Withdrawal queue" : "Payout history"}
          description={
            view === "pending"
              ? "Oldest first, so requests are processed fairly."
              : "Most recent completed and rejected requests."
          }
          action={
            <div
              role="tablist"
              className="inline-flex rounded-xl bg-ink-100 p-1"
            >
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => { setView(tab.id); setPage(0); }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
                      active
                        ? "bg-white text-ink-900 shadow-soft"
                        : "text-ink-500 hover:text-ink-800"
                    )}
                  >
                    <TabIcon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          }
        />

        {loading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={view === "pending" ? Inbox : History}
            title={view === "pending" ? "Queue is clear" : "No history yet"}
            description={`No ${view} requests found.`}
          />
        ) : (
          <TableWrap>
            <table className={cn(tableClasses.table, "min-w-[760px]")}>
              <thead className={tableClasses.thead}>
                <tr>
                  <th className={tableClasses.th}>User</th>
                  <th className={tableClasses.th}>Amount</th>
                  <th className={tableClasses.th}>Bank details</th>
                  <th className={tableClasses.th}>Requested</th>
                  <th className={tableClasses.th}>Status</th>
                  {view === "pending" && (
                    <th className={cn(tableClasses.th, "text-right")}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const username = req.profiles?.username;
                  return (
                    <tr key={req.id} className={tableClasses.tr}>
                      <td className={tableClasses.td}>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-semibold text-brand-700 ring-1 ring-brand-200/60">
                            {(username || "?").charAt(0).toUpperCase()}
                          </span>
                          <span className="max-w-[180px] truncate font-medium text-ink-800">
                            {username || "Unknown user"}
                          </span>
                        </div>
                      </td>
                      <td
                        className={cn(
                          tableClasses.td,
                          "tabular whitespace-nowrap font-semibold text-ink-950"
                        )}
                      >
                        {formatNaira(req.amount)}
                      </td>
                      <td className={cn(tableClasses.td, "max-w-[260px]")}>
                        <p className="whitespace-pre-line break-words text-ink-600">
                          {req.bank_details}
                        </p>
                      </td>
                      <td className={cn(tableClasses.td, "whitespace-nowrap text-ink-500")}>
                        {req.created_at
                          ? new Date(req.created_at).toLocaleDateString("en-NG", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className={tableClasses.td}>
                        <StatusBadge status={req.status} />
                      </td>
                      {view === "pending" && (
                        <td className={tableClasses.td}>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Copy}
                              onClick={() => { navigator.clipboard.writeText(req.bank_details); toast.success("Bank details copied"); }}
                            >
                              Copy
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              icon={Check}
                              loading={isProcessing === req.id}
                              onClick={() => handlePayout(req)}
                              disabled={isProcessing === req.id} // Prevents double-submissions
                            >
                              {isProcessing === req.id ? "Processing..." : "Mark as paid"}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              icon={X}
                              onClick={() => handleReject(req)}
                            >
                              Reject
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-between gap-3 border-t border-ink-100 px-6 py-4">
          <Button
            variant="secondary"
            size="sm"
            icon={ChevronLeft}
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="tabular text-sm font-medium text-ink-500">
            Page {page + 1}
          </span>
          <Button
            variant="secondary"
            size="sm"
            iconRight={ChevronRight}
            disabled={requests.length < itemsPerPage}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </Card>
    </div>
  );
}
