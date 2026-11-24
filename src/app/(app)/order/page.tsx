"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CaretRight, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";
import { StatusPill } from "@/components/campaigns/CampaignCard";
import NewCampaignDialog from "@/components/campaigns/NewCampaignDialog";
import { RingMark, Segmented, pillButton } from "@/components/ui/AppParts";
import {
  CAMPAIGN_TYPE_LABEL,
  campaignBudget,
  campaignStatus,
  campaignTypeOf,
  compactNaira,
  runsLabel,
  taskRateLabel,
} from "@/components/campaigns/campaign-utils";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/types";

// Campaigns (the brand's "Run campaigns" hub; campaign creation plan, screen 1).
// No stat cards: a compact bar, filters, and one row per campaign drawn with
// its ring. "New campaign" opens the Open / Verified picker.

type Spots = Map<string, { joined: number; standby: number }>;

async function loadMine(): Promise<{ tasks: Task[]; spots: Spots } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Run campaigns:", error);
    return null;
  }

  const spots: Spots = new Map();
  if (data?.length) {
    const { data: counts } = await supabase.rpc("campaign_spots", { p_task_ids: data.map((t) => t.id) });
    counts?.forEach((c) => spots.set(c.task_id, { joined: c.joined, standby: c.standby }));
  }
  return { tasks: data ?? [], spots };
}

type TypeKey = "all" | "open" | "verified";
type StatusKey = "all" | "live" | "review" | "ended" | "rejected";

// Live includes paused (suspended) campaigns; ended includes removed ones
function statusKey(task: Task): Exclude<StatusKey, "all"> {
  switch (task.status) {
    case "pending_review":
      return "review";
    case "rejected":
      return "rejected";
    case "completed":
    case "removed":
      return "ended";
    default:
      return "live";
  }
}

const STATUS_LABELS: Record<StatusKey, string> = {
  all: "All",
  live: "Live",
  review: "In review",
  ended: "Ended",
  rejected: "Not approved",
};

const EMPTY_FILTERED: Record<Exclude<StatusKey, "all">, string> = {
  live: "Campaigns that are live show up here.",
  review: "Campaigns waiting for our team's check show up here.",
  ended: "Campaigns that have finished show up here.",
  rejected: "Campaigns we couldn't approve show up here.",
};

export default function RunCampaignsPage() {
  const [data, setData] = useState<{ tasks: Task[]; spots: Spots } | null>(null);
  const [failed, setFailed] = useState(false);
  const [type, setType] = useState<TypeKey>("all");
  const [status, setStatus] = useState<StatusKey>("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadMine().then((result) => {
      if (cancelled) return;
      if (result) setData(result);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const ofType = useMemo(() => tasks.filter((t) => type === "all" || campaignTypeOf(t) === type), [tasks, type]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ofType.filter((t) => (status === "all" || statusKey(t) === status) && (!q || t.title.toLowerCase().includes(q)));
  }, [ofType, status, query]);

  const typeCount = (k: TypeKey) => (k === "all" ? tasks.length : tasks.filter((t) => campaignTypeOf(t) === k).length);
  const statusCount = (k: StatusKey) => (k === "all" ? ofType.length : ofType.filter((t) => statusKey(t) === k).length);
  const statusOptions = (["all", "live", "review", "ended", "rejected"] as const)
    .filter((k) => k !== "rejected" || statusCount("rejected") > 0)
    .map((k) => ({
      key: k,
      label: (
        <>
          {STATUS_LABELS[k]}
          <span className="font-mono text-xs text-muted tabular-nums">{statusCount(k)}</span>
        </>
      ),
    }));

  const newButton = (
    <button type="button" onClick={() => setCreating(true)} className={pillButton("signal", "h-10 px-4")}>
      <Plus weight="bold" className="h-4 w-4" aria-hidden="true" />
      New campaign
    </button>
  );

  return (
    <div className="font-body text-ink">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-[1.75rem] leading-none font-semibold tracking-[-0.03em]">Campaigns</h1>
        {newButton}
      </header>

      {failed ? (
        <Empty title="Couldn't load your campaigns" body="Check your connection and refresh the page." />
      ) : !data ? (
        <div className="mt-8 space-y-3" aria-busy="true" aria-label="Loading your campaigns">
          <div className="skeleton h-10 w-72 rounded-full" />
          <div className="skeleton h-56 rounded-[1.5rem]" />
        </div>
      ) : tasks.length === 0 ? (
        <Empty
          title="No campaigns yet"
          body="Get your business talked about by creators your customers already follow. It takes about three minutes."
          action={newButton}
        />
      ) : (
        <>
          {/* Type tabs */}
          <nav className="-mx-1 mt-6 flex gap-1 overflow-x-auto border-b border-line px-1" aria-label="Campaign type">
            {(["all", "open", "verified"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  setType(k);
                  setStatus("all");
                }}
                aria-current={type === k ? "page" : undefined}
                className={cn(
                  "relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[0.95rem] font-medium transition-colors",
                  type === k ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
                )}
              >
                {k === "all" ? "All campaigns" : CAMPAIGN_TYPE_LABEL[k]}
                <span className="font-mono text-xs text-muted tabular-nums">{typeCount(k)}</span>
              </button>
            ))}
          </nav>

          {/* Status and search */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="-mx-1 max-w-full overflow-x-auto px-1 py-0.5">
              <Segmented value={status} options={statusOptions} onChange={setStatus} label="Status" />
            </div>
            <label className="relative w-full sm:w-64">
              <span className="sr-only">Search campaigns</span>
              <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search campaigns"
                className="h-10 w-full rounded-full bg-surface pr-4 pl-10 text-sm ring-1 ring-line transition-[box-shadow] placeholder:text-muted/80 focus:ring-2 focus:ring-ink focus:outline-none"
              />
            </label>
          </div>

          {shown.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-[1.5rem] bg-surface px-6 py-14 text-center ring-1 ring-line">
              <RingMark className="h-12 w-12" />
              <p className="mt-4 font-heading text-lg font-semibold tracking-[-0.01em]">
                {query ? "No campaigns match" : status === "all" ? "No campaigns here yet" : `No ${STATUS_LABELS[status].toLowerCase()} campaigns`}
              </p>
              <p className="mt-1 text-sm text-muted">
                {query ? "Try another name." : status === "all" ? "Campaigns of this type show up here." : EMPTY_FILTERED[status]}
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[1.5rem] bg-surface ring-1 ring-line">
              {shown.map((task) => (
                <li key={task.id}>
                  <CampaignRow task={task} spots={data.spots.get(task.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <NewCampaignDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

// One campaign: its ring (spots filled, or budget used), name, status, terms
function CampaignRow({ task, spots }: { task: Task; spots?: { joined: number; standby: number } }) {
  const verified = campaignTypeOf(task) === "verified";
  const status = campaignStatus(task.status);
  const budget = campaignBudget(task);
  const spent = Number(task.budget_spent) || 0;
  const max = Number(task.max_participants) || 0;
  const joined = spots?.joined ?? 0;

  const share = verified && max ? joined / max : budget ? spent / budget : 0;
  const filled = Math.min(8, Math.round(share * 8));
  const progress = verified && max ? `${joined} of ${max}` : `${task.approved_count ?? 0}`;
  const progressLabel = verified && max ? (spots?.standby ? `spots filled, ${spots.standby} waiting` : "spots filled") : "posts approved";

  return (
    <Link
      href={`/order/${task.id}`}
      className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-page/70 focus-visible:bg-page focus-visible:outline-none sm:px-5"
    >
      <RingMark filled={filled} className="h-11 w-11 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{task.title}</p>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
          <span>{CAMPAIGN_TYPE_LABEL[campaignTypeOf(task)]}</span>
          <span className="font-mono text-[0.8rem]">{taskRateLabel(task)}</span>
          <span>{runsLabel(task)}</span>
        </p>
      </div>

      <div className="hidden w-32 shrink-0 text-right md:block">
        <p className="font-mono text-ink tabular-nums">{progress}</p>
        <p className="text-xs text-muted">{progressLabel}</p>
      </div>
      <div className="hidden w-28 shrink-0 text-right sm:block">
        <p className="font-mono text-ink tabular-nums">{compactNaira(spent)}</p>
        <p className="text-xs text-muted">of {compactNaira(budget)} used</p>
      </div>
      <CaretRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-[1.75rem] bg-surface px-6 py-16 text-center ring-1 ring-line sm:py-20">
      <RingMark className="h-16 w-16" />
      <h2 className="mt-5 font-heading text-xl font-semibold tracking-[-0.02em]">{title}</h2>
      <p className="mt-1.5 max-w-sm text-pretty text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
