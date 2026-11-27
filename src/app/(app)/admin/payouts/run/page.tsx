"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Banknote, ChevronDown, Download, ExternalLink, Hourglass, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Card, EmptyState, PageHeader, PageLoader, StatCard, cn, formatNaira } from "@/components/ui";
import { FLAG_LABELS, amountToPay, bankSheet, detailSheet, type CreatorLine, type Flag, type Run } from "@/lib/payoutRun";

// The monthly payout run (tier 2 of the creator-launch build, for 5 December).
// Shows what each creator is owed on payout day, lets admins fill in missing
// views, and downloads a bank-transfer sheet and a post-by-post record. Rules:
// src/lib/payoutRun.ts. Nothing here marks anyone paid: payouts are recorded
// with Phase C of docs/plans/pricing-and-pay.md.

function dayLabel(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-NG", { day: "numeric", month: "long", timeZone: "UTC" });
}

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// The 5th of this month (if it's still ahead) and the next two, plus last month's
function paydayOptions(): string[] {
  const now = new Date(Date.now() + 3600e3);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return [-1, 0, 1, 2].map((k) => new Date(Date.UTC(y, m + k, 5)).toISOString().slice(0, 10));
}

export default function PayoutRunPage() {
  const [run, setRun] = useState<Run | null>(null);
  const [payday, setPayday] = useState<string | null>(null);
  const [early, setEarly] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (day: string | null) => {
    const res = await fetch(`/api/admin/payouts/run${day ? `?payday=${day}` : ""}`, { cache: "no-store" });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "/dashboard";
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Couldn't load the payout run.");
      return;
    }
    setError("");
    setRun(json as Run);
    if (!day) setPayday((json as Run).payday);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads once on mount; later loads follow the payday picker
    load(null);
  }, [load]);

  const totals = useMemo(() => {
    if (!run) return null;
    const paying = run.creators.filter((c) => amountToPay(c, run.minimum, early) > 0);
    return {
      paying: paying.length,
      total: paying.reduce((s, c) => s + amountToPay(c, run.minimum, early), 0),
      later: run.creators.reduce((s, c) => s + (early ? 0 : c.notDueYet), 0),
      attention: run.creators.filter((c) => c.flags.some((f) => f !== "below_minimum")).length,
    };
  }, [run, early]);

  if (error) return <EmptyState icon={AlertTriangle} title="Couldn't load the payout run" description={error} />;
  if (!run || !totals) return <PageLoader label="Working out the payout run" />;

  const stamp = `${run.payday}${early ? "-early" : ""}`;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Admin"
        title="Payout run"
        description={`Payout day ${dayLabel(run.payday)} pays what creators earned by ${dayLabel(run.through)}. Minimum ${formatNaira(run.minimum)}; smaller amounts roll over.`}
      />

      <Card className="mb-6 space-y-4 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-ink-800">
            Payout day
            <select
              value={payday ?? run.payday}
              onChange={(e) => {
                setPayday(e.target.value);
                setRun(null);
                load(e.target.value);
              }}
              className="mt-1 block h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm"
            >
              {[...new Set([run.payday, ...paydayOptions()])].sort().map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </select>
          </label>
          <Button variant="primary" icon={Download} onClick={() => download(`visibility-payout-${stamp}-bank.csv`, bankSheet(run, early))}>
            Bank transfer sheet
          </Button>
          <Button variant="secondary" icon={Download} onClick={() => download(`visibility-payout-${run.payday}-posts.csv`, detailSheet(run))}>
            Post-by-post record
          </Button>
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-ink-50 p-3.5 text-sm text-ink-700">
          <input type="checkbox" checked={early} onChange={(e) => setEarly(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>
            <span className="font-semibold text-ink-900">Also pay what&apos;s earned but not due yet.</span> By the rules, a
            post fee is due once the post is 7 days old and view pay once its campaign has closed (end date plus 14 days).
            Tick this only for a decision to pay early, such as our own launch campaign, and log it in the Decision Log.
          </span>
        </label>
      </Card>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Creators to pay" value={totals.paying} icon={Users} tone="neutral" />
        <StatCard label="Total to transfer" value={formatNaira(totals.total)} icon={Banknote} tone="success" />
        <StatCard label="Earned, not due yet" value={formatNaira(totals.later)} icon={Hourglass} tone="warning" hint="Paid on a later payout day" />
        <StatCard label="Need a look" value={totals.attention} icon={AlertTriangle} tone="warning" hint="No account, shared account or missing views" />
      </div>

      {run.creators.length === 0 ? (
        <EmptyState icon={Users} title="Nobody to pay yet" description="Approved posts on new campaigns, and balances from older ones, show here." />
      ) : (
        <div className="space-y-3">
          {run.creators.map((c) => (
            <CreatorCard key={c.id} c={c} minimum={run.minimum} early={early} onViewsSaved={() => load(run.payday)} />
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-ink-500">
        Nothing on this page marks anyone as paid, and balances from older campaigns stay until they&apos;re cleared. After
        the transfers, keep both sheets with the bank&apos;s transfer references. Paid records come with Phase C.
      </p>
    </div>
  );
}

function CreatorCard({ c, minimum, early, onViewsSaved }: { c: CreatorLine; minimum: number; early: boolean; onViewsSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const pays = amountToPay(c, minimum, early);
  const problems: Flag[] = c.flags.filter((f) => f !== "below_minimum");

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">
            {c.handle ? `@${c.handle}` : c.name || "No handle"}
            {c.verified && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">Verified</span>}
          </p>
          <p className="truncate text-xs text-ink-500">{[c.name, c.email].filter(Boolean).join(" · ")}</p>
          <p className="mt-1 text-sm text-ink-700">
            {c.bank ? (
              <>
                {c.bank.bankName} · <span className="font-mono">{c.bank.accountNumber}</span> · {c.bank.accountName}
              </>
            ) : (
              <span className="text-red-600">No payout account</span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-500">This run pays</p>
          <p className={cn("font-mono text-xl font-semibold", pays > 0 ? "text-emerald-700" : "text-ink-400")}>{formatNaira(pays)}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-ink-50 px-3 py-2">
          <dt className="text-xs text-ink-500">Due now</dt>
          <dd className="font-mono">{formatNaira(c.dueNow)}</dd>
        </div>
        <div className="rounded-lg bg-ink-50 px-3 py-2">
          <dt className="text-xs text-ink-500">Not due yet</dt>
          <dd className="font-mono">{formatNaira(c.notDueYet)}</dd>
        </div>
        <div className="rounded-lg bg-ink-50 px-3 py-2">
          <dt className="text-xs text-ink-500">Older campaigns</dt>
          <dd className="font-mono">{formatNaira(c.older)}</dd>
        </div>
        <div className="rounded-lg bg-ink-50 px-3 py-2">
          <dt className="text-xs text-ink-500">Posts</dt>
          <dd className="font-mono">{c.posts.length}</dd>
        </div>
      </dl>

      {c.flags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {c.flags.map((f) => (
            <li
              key={f}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                problems.includes(f) ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
              )}
            >
              {FLAG_LABELS[f]}
            </li>
          ))}
        </ul>
      )}

      {c.posts.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex items-center gap-1 text-sm font-medium text-ink-700 hover:text-ink-900"
          >
            <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} aria-hidden="true" />
            {open ? "Hide posts" : `Show ${c.posts.length} ${c.posts.length === 1 ? "post" : "posts"} and views`}
          </button>
          {open && (
            <ul className="mt-3 space-y-2">
              {c.posts.map((p) => (
                <PostRow key={p.id} p={p} onSaved={onViewsSaved} />
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

function PostRow({ p, onSaved }: { p: CreatorLine["posts"][number]; onSaved: () => void }) {
  const [value, setValue] = useState(p.views === null ? "" : String(p.views));
  const [saving, setSaving] = useState(false);
  const changed = value !== (p.views === null ? "" : String(p.views));

  const save = async () => {
    const views = value === "" ? null : Number(value);
    setSaving(true);
    const { error } = await supabase.rpc("set_post_views", { p_submission_id: p.id, p_views: views });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Views saved");
    onSaved();
  };

  return (
    <li className="rounded-xl border border-ink-200 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 font-medium text-ink-900">
          {p.taskTitle}
          <span className="ml-1.5 text-xs font-normal text-ink-500">
            {p.campaignType} · {p.platform ?? "—"} · posted {dayLabel(p.postedOn)}
          </span>
        </p>
        {p.postUrl && (
          <a href={p.postUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-ink-700 underline">
            Open post <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`v-${p.id}`}>
          Verified views
        </label>
        <input
          id={`v-${p.id}`}
          inputMode="numeric"
          placeholder="Views"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          className={cn("h-9 w-28 rounded-lg border px-2.5 text-right font-mono", p.views === null ? "border-amber-400" : "border-ink-200")}
        />
        {changed && (
          <Button size="sm" variant="secondary" loading={saving} onClick={save}>
            Save views
          </Button>
        )}
        <span className="text-xs text-ink-500">
          {p.postFee > 0 && `Post fee ${formatNaira(p.postFee)} (due ${dayLabel(p.postFeeDueOn!)}) · `}
          View pay {formatNaira(p.viewPay)}
          {p.viewScale < 1 && ` (${Math.round(p.viewScale * 100)}% after share-out)`} · final {dayLabel(p.viewsFinalOn)}
        </span>
      </div>
    </li>
  );
}
