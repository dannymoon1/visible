"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { campaignHref, CampaignCover, PlatformIcons, ProgressLine, StatusPill } from "@/components/campaigns/CampaignCard";
import { submissionStatus, timeAgo } from "@/components/campaigns/campaign-utils";
import { formatNaira } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/types";

// My campaigns: every campaign this creator has joined, is on standby for,
// or has posted on. Finding new ones happens on Discover.

interface Joined {
  task: Task;
  participant: "joined" | "standby" | null;
  submission: string | null;
  payout: number | null;
  at: string; // when they posted, else when they joined
}

async function loadMyCampaigns(): Promise<Joined[] | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [subsRes, partsRes] = await Promise.all([
    supabase.from("submissions").select("task_id, status, created_at, payout_amount").eq("user_id", user.id),
    supabase
      .from("campaign_participants")
      .select("task_id, status, joined_at")
      .eq("user_id", user.id)
      .in("status", ["joined", "standby"]),
  ]);

  if (subsRes.error || partsRes.error) {
    console.error("My campaigns:", subsRes.error ?? partsRes.error);
    return null;
  }

  const byTask = new Map<string, Omit<Joined, "task">>();
  partsRes.data?.forEach((p) =>
    byTask.set(p.task_id, {
      participant: p.status === "standby" ? "standby" : "joined",
      submission: null,
      payout: null,
      at: p.joined_at,
    })
  );
  subsRes.data?.forEach((s) => {
    if (!s.task_id) return;
    const prev = byTask.get(s.task_id);
    byTask.set(s.task_id, {
      participant: prev?.participant ?? "joined",
      submission: s.status || "pending",
      payout: s.payout_amount,
      at: s.created_at,
    });
  });

  const ids = [...byTask.keys()];
  if (!ids.length) return [];

  const { data: tasks, error: taskError } = await supabase.from("tasks").select("*").in("id", ids);
  if (taskError) {
    console.error("My campaigns: tasks", taskError);
    return null;
  }

  return (tasks ?? [])
    .flatMap((task) => {
      const m = byTask.get(task.id);
      return m ? [{ task, ...m }] : [];
    })
    .sort((x, y) => y.at.localeCompare(x.at));
}

// Joined but not posted is the creator's to-do; after posting, the review status
function statusOf(j: Joined) {
  if (j.submission) return { ...submissionStatus(j.submission), key: submissionStatus(j.submission).tone };
  if (j.participant === "standby") return { label: "On standby", tone: "muted" as const, key: "standby" };
  return { label: "Not posted yet", tone: "muted" as const, key: "todo" };
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "todo", label: "Not posted yet" },
  { key: "warning", label: "In review" },
  { key: "verified", label: "Approved" },
  { key: "error", label: "Not approved" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function MyCampaignsPage() {
  const [items, setItems] = useState<Joined[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    let cancelled = false;
    loadMyCampaigns().then((result) => {
      if (cancelled) return;
      if (result) setItems(result);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const key = (j: Joined) => statusOf(j).key;
  const toPost = items?.filter((j) => key(j) === "todo").length ?? 0;
  const approved = items?.filter((j) => key(j) === "verified") ?? [];
  // Views-paid posts record their payout; per-post ones earn the rate
  const earned = approved.reduce((sum, j) => sum + (j.payout ?? (Number(j.task.reward) || 0)), 0);
  const shown = items?.filter((j) => filter === "all" || key(j) === filter) ?? [];

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">Campaigns</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">The campaigns you&apos;ve joined, what&apos;s left to post, and where each post is in review.</p>
        </div>
        <Link
          href="/discover"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-signal px-5 font-heading text-[15px] font-semibold text-on-signal transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal active:scale-[0.97]"
        >
          <Compass className="h-4 w-4" aria-hidden="true" />
          Find campaigns
        </Link>
      </header>

      {failed ? (
        <Empty title="Couldn't load your campaigns" body="Check your connection and refresh the page." />
      ) : !items ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading your campaigns">
          <div className="skeleton h-20 rounded-[20px]" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-[20px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty
          title="You haven't joined a campaign yet"
          body="Pick one on Discover and tap Join. Then post about it on your own account and submit the link."
          action
        />
      ) : (
        <>
          {/* Summary: one grouped strip rather than separate stat cards */}
          <dl className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-[20px] border border-line bg-line">
            <Summary label="Joined" value={String(items.length)} />
            <Summary label="Not posted yet" value={String(toPost)} />
            <Summary label="Earned" value={formatNaira(earned)} />
          </dl>

          <div className="mb-4 flex gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 [scrollbar-width:none] sm:w-fit" role="tablist" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm font-medium transition",
                  filter === f.key ? "bg-ink text-page" : "text-muted hover:text-ink"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {shown.length ? (
            <ul className="space-y-3">
              {shown.map((j) => (
                <li key={j.task.id}>
                  <JoinedRow item={j} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[20px] border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
              Nothing here yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function JoinedRow({ item }: { item: Joined }) {
  const { task } = item;
  const s = statusOf(item);
  const closed = task.status === "suspended" || task.status === "removed";

  return (
    <Link
      href={campaignHref(task)}
      className="group flex items-center gap-4 rounded-[20px] border border-line bg-surface p-3 pr-4 transition hover:border-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal active:scale-[0.99] sm:gap-5"
    >
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-[14px] bg-line sm:h-24 sm:w-40">
        <CampaignCover task={task} className="[&_p]:text-base" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={s.tone}>{s.label}</StatusPill>
          {closed && <StatusPill tone="muted">Campaign {task.status}</StatusPill>}
        </div>
        <h3 className="mt-1.5 truncate font-heading text-base font-semibold text-ink sm:text-lg">{task.title}</h3>
        <p className="mt-0.5 flex items-center gap-2 text-sm text-muted">
          <span className="truncate">
            {item.submission ? "Posted" : "Joined"} {timeAgo(item.at)} ago
          </span>
          <PlatformIcons task={task} className="text-muted [&_svg]:h-3.5 [&_svg]:w-3.5" />
        </p>
        <ProgressLine task={task} className="mt-2.5 max-w-xs" />
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-mono text-lg text-ink">{formatNaira(task.reward)}</p>
        <p className="text-xs text-muted">per post</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
    </Link>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 truncate font-mono text-lg text-ink sm:text-xl">{value}</dd>
    </div>
  );
}

function Empty({ title, body, action = false }: { title: string; body: string; action?: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-line bg-surface px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-page text-muted">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-heading text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && (
        <Link
          href="/discover"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-signal px-5 font-heading text-[15px] font-semibold text-on-signal transition hover:brightness-105 active:scale-[0.97]"
        >
          Discover campaigns
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
