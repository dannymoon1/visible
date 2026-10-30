"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Bot,
  RotateCw,
  Sparkles,
  Hourglass,
  Wallet,
  ShieldCheck,
  CircleCheckBig,
  ExternalLink,
  Inbox,
  BadgeCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import CampaignProgress from "@/components/CampaignProgress";
import {
  Button,
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  Badge,
  StatusBadge,
  EmptyState,
  PageLoader,
  TableWrap,
  tableClasses,
  formatNaira,
  cn,
} from "@/components/ui";

export default function AdminPanel() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [verifyingIds, setVerifyingIds] = useState([]);

  useEffect(() => {
    const protectRoute = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Admin check error:", error);
        setLoading(false);
        return;
      }

      if (profile?.is_admin) {
        setIsAdmin(true);
        await fetchSubmissions();
      } else {
        window.location.href = "/";
      }
    };

    protectRoute();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("submissions")
      .select(`
        *,
        tasks (*),
        profiles (
          email
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching submissions:", error);
    } else {
      setSubmissions(data || []);
    }

    setLoading(false);
  };

  // Runs the verification agent for one submission and shows the result
  const runVerification = async (submissionId) => {
    setVerifyingIds((previous) => [...previous, submissionId]);

    try {
      const res = await fetch("/api/submissions/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Verification error:", data.error);
        toast.error(`Verification failed: ${data.error}`);
        return;
      }

      setSubmissions((previous) =>
        previous.map((sub) =>
          sub.id === submissionId
            ? { ...sub, ...data, verification_verdict: data.verdict }
            : sub
        )
      );
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Network error while verifying.");
    } finally {
      setVerifyingIds((previous) =>
        previous.filter((id) => id !== submissionId)
      );
    }
  };

  const verifyAllPending = async () => {
    const pending = submissions.filter((sub) => sub.status === "pending");

    // One at a time to stay within platform API rate limits
    for (const sub of pending) {
      await runVerification(sub.id);
    }
  };

  const handleApprove = async (submissionId) => {
    const sub = submissions.find((s) => s.id === submissionId);

    // Funds should only go out for submissions the agent has passed
    if (sub?.verification_verdict !== "pass") {
      const reason = sub?.verification_verdict
        ? `The verification agent marked this "${sub.verification_verdict}".`
        : "This submission hasn't been verified yet.";

      if (!window.confirm(`${reason}\n\nPay anyway?`)) return;
    }

    try {
      setApprovingId(submissionId);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You are not logged in.");
        return;
      }

      const { data, error } = await supabase.rpc(
        "approve_submission",
        {
          p_submission_id: submissionId,
          p_admin_id: user.id,
        }
      );

      if (error) {
        console.error("Approval error:", error);
        toast.error(error.message);
        return;
      }

      console.log("Approval successful:", data);

      toast.success(
        `${formatNaira(data.amount)} has been credited to the user.`
      );

      // Reload ALL submissions so the approved one
      // moves from Pending to Approved.
      await fetchSubmissions();

    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("Something went wrong while approving this submission.");
    } finally {
      setApprovingId(null);
    }
  };

  if (!isAdmin || loading) {
    return <PageLoader label="Verifying authorization..." />;
  }

  // Separate submissions based on status
  const pendingSubmissions = submissions.filter(
    (sub) => sub.status === "pending"
  );

  const approvedSubmissions = submissions.filter(
    (sub) => sub.status === "approved"
  );

  // Summary figures (derived from the loaded submissions only)
  const pendingValue = pendingSubmissions.reduce(
    (total, sub) => total + Number(sub.tasks?.reward || 0),
    0
  );
  const passedCount = pendingSubmissions.filter(
    (sub) => sub.verification_verdict === "pass"
  ).length;
  const paidValue = approvedSubmissions.reduce(
    (total, sub) => total + Number(sub.tasks?.reward || 0),
    0
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Review submissions"
        description="Check engagement proofs with the verification agent, then approve and pay out rewards."
        actions={
          pendingSubmissions.length > 0 && (
            <Button
              variant="brand"
              icon={Sparkles}
              loading={verifyingIds.length > 0}
              onClick={verifyAllPending}
              disabled={verifyingIds.length > 0}
            >
              {verifyingIds.length > 0
                ? `Verifying (${verifyingIds.length})...`
                : "Verify all pending"}
            </Button>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Awaiting review"
          value={pendingSubmissions.length}
          icon={Hourglass}
          tone="warning"
          hint="Pending submissions"
        />
        <StatCard
          label="Pending payout value"
          value={formatNaira(pendingValue)}
          icon={Wallet}
          tone="gold"
          hint="If every pending proof is paid"
        />
        <StatCard
          label="Verified pass"
          value={passedCount}
          icon={ShieldCheck}
          tone="brand"
          hint="Pending and cleared by the agent"
        />
        <StatCard
          label="Approved & paid"
          value={approvedSubmissions.length}
          icon={CircleCheckBig}
          tone="success"
          hint={`${formatNaira(paidValue)} paid out`}
        />
      </div>

      {/* PENDING PROOFS */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Pending proofs"
          description="Run the verification agent before paying. Payouts without a pass verdict ask for confirmation."
          action={
            pendingSubmissions.length > 0 && (
              <Badge tone="warning" dot>
                {pendingSubmissions.length} pending
              </Badge>
            )
          }
        />

        {pendingSubmissions.length > 0 ? (
          <TableWrap>
            <table className={cn(tableClasses.table, "min-w-[960px]")}>
              <thead className={tableClasses.thead}>
                <tr>
                  <th className={tableClasses.th}>User</th>
                  <th className={tableClasses.th}>Task</th>
                  <th className={tableClasses.th}>Proof</th>
                  <th className={tableClasses.th}>Reward</th>
                  <th className={tableClasses.th}>Verification</th>
                  <th className={cn(tableClasses.th, "text-right")}>Action</th>
                </tr>
              </thead>

              <tbody>
                {pendingSubmissions.map((sub) => {
                  const isChecking = verifyingIds.includes(sub.id);

                  return (
                    <tr key={sub.id} className={tableClasses.tr}>
                      <td className={tableClasses.td}>
                        <UserCell email={sub.profiles?.email} />
                      </td>

                      <td className={cn(tableClasses.td, "max-w-[200px]")}>
                        <p className="font-medium text-ink-800">
                          {sub.tasks?.title}
                        </p>
                        {sub.tasks?.link && (
                          <a
                            href={sub.tasks.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            Sample post
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <CampaignProgress task={sub.tasks} compact className="mt-2.5" />
                      </td>

                      <td className={cn(tableClasses.td, "max-w-[240px]")}>
                        <p className="font-semibold text-ink-800">
                          {sub.social_handle
                            ? `@${sub.social_handle.replace(/^@/, "")}`
                            : "—"}
                          {sub.post_platform && (
                            <span className="font-normal text-ink-400"> · {sub.post_platform}</span>
                          )}
                        </p>
                        {sub.post_url && (
                          <a
                            href={sub.post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            Open their post
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <p className="mt-0.5 line-clamp-4 break-words text-ink-500">
                          {sub.comment_text || (
                            <span className="italic text-ink-400">
                              No post text submitted
                            </span>
                          )}
                        </p>
                      </td>

                      <td
                        className={cn(
                          tableClasses.td,
                          "tabular whitespace-nowrap font-semibold text-ink-900"
                        )}
                      >
                        {formatNaira(sub.tasks?.reward)}
                      </td>

                      <td className={cn(tableClasses.td, "w-[280px] min-w-[240px]")}>
                        <VerificationResult sub={sub} />

                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 mt-2 text-brand-600 hover:text-brand-700"
                          icon={sub.verification_verdict ? RotateCw : Bot}
                          loading={isChecking}
                          onClick={() => runVerification(sub.id)}
                          disabled={isChecking}
                        >
                          {isChecking
                            ? "Checking..."
                            : sub.verification_verdict
                            ? "Re-check"
                            : "Run check"}
                        </Button>
                      </td>

                      <td className={cn(tableClasses.td, "text-right")}>
                        <Button
                          variant="success"
                          size="sm"
                          icon={BadgeCheck}
                          loading={approvingId === sub.id}
                          onClick={() => handleApprove(sub.id)}
                          disabled={approvingId === sub.id}
                        >
                          {approvingId === sub.id
                            ? "Processing..."
                            : "Approve & Pay"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState
            icon={Inbox}
            title="All caught up"
            description="No pending submissions to review."
          />
        )}
      </Card>

      {/* APPROVED SUBMISSIONS */}
      <Card className="overflow-hidden">
        <CardHeader
          title="Approved & paid"
          description="Submissions that have been approved and credited."
        />

        {approvedSubmissions.length > 0 ? (
          <TableWrap>
            <table className={cn(tableClasses.table, "min-w-[640px]")}>
              <thead className={tableClasses.thead}>
                <tr>
                  <th className={tableClasses.th}>User</th>
                  <th className={tableClasses.th}>Task</th>
                  <th className={tableClasses.th}>Reward</th>
                  <th className={tableClasses.th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {approvedSubmissions.map((sub) => (
                  <tr key={sub.id} className={tableClasses.tr}>
                    <td className={tableClasses.td}>
                      <UserCell email={sub.profiles?.email} />
                    </td>
                    <td className={cn(tableClasses.td, "text-ink-600")}>
                      {sub.tasks?.title}
                    </td>
                    <td
                      className={cn(
                        tableClasses.td,
                        "tabular whitespace-nowrap font-semibold text-ink-900"
                      )}
                    >
                      {formatNaira(sub.tasks?.reward)}
                    </td>
                    <td className={tableClasses.td}>
                      <StatusBadge status={sub.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <EmptyState
            icon={CircleCheckBig}
            title="No payouts yet"
            description="No approved submissions yet."
          />
        )}
      </Card>
    </div>
  );
}

function UserCell({ email }) {
  const initial = (email || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-semibold text-brand-700 ring-1 ring-brand-200/60">
        {initial}
      </span>
      <span className="max-w-[200px] truncate font-medium text-ink-800" title={email}>
        {email || "Unknown user"}
      </span>
    </div>
  );
}

const VERDICT_TONES = {
  pass: "success",
  review: "warning",
  fail: "danger",
};

const FLAG_LABELS = {
  comment_not_found: "Comment not found",
  post_not_found: "Post not found",
  unverifiable: "Can't verify via API",
  api_error: "API error",
  empty_comment: "No comment",
  emoji_only: "Emoji only",
  emoji_heavy: "Emoji heavy",
  too_short: "Too short",
  generic_phrase: "Generic (\"nice post\")",
  self_promotion: "Self-promotion",
  duplicate_comment: "Copy-pasted",
};

function scoreColor(score) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function VerificationResult({ sub }) {
  if (!sub.verification_verdict) {
    return <p className="text-sm text-ink-400">Not checked yet</p>;
  }

  const flags = Array.isArray(sub.verification_flags) ? sub.verification_flags : [];
  const hasScore =
    sub.quality_score !== null && sub.quality_score !== undefined;
  const score = Math.max(0, Math.min(100, Number(sub.quality_score) || 0));

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone={VERDICT_TONES[sub.verification_verdict] || "neutral"}
          dot
          className="uppercase tracking-wide"
        >
          {sub.verification_verdict}
        </Badge>

        {hasScore && (
          <span className="tabular text-xs font-medium text-ink-500">
            Quality{" "}
            <span className="font-semibold text-ink-800">
              {sub.quality_score}
            </span>
            /100
          </span>
        )}
      </div>

      {hasScore && (
        <div className="h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-ink-100">
          <div
            className={cn("h-full rounded-full transition-all", scoreColor(score))}
            style={{ width: `${score}%` }}
          />
        </div>
      )}

      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map((flag) => (
            <Badge key={flag} tone="neutral" className="font-medium">
              {FLAG_LABELS[flag] || flag}
            </Badge>
          ))}
        </div>
      )}

      {sub.verification_summary && (
        <p className="text-xs leading-relaxed text-ink-500">
          {sub.verification_summary}
        </p>
      )}
    </div>
  );
}
