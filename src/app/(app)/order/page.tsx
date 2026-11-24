"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Megaphone, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { campaignProgress } from "@/components/CampaignProgress";
import { CampaignCover, ProgressLine, StatusPill, TypeLabel } from "@/components/campaigns/CampaignCard";
import { campaignBudget, campaignStatus, campaignTypeOf, compactNaira, runsLabel, taskRateLabel } from "@/components/campaigns/campaign-utils";
import type { Task } from "@/lib/types";

// Run campaigns: the brand's hub. Every campaign you've paid for, with a way
// into each one's manage page, and the button to create a new one.

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

export default function RunCampaignsPage() {
  const [data, setData] = useState<{ tasks: Task[]; spots: Spots } | null>(null);
  const [failed, setFailed] = useState(false);

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

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">Run campaigns</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Get your business talked about by creators your customers trust. Create a campaign, then follow every post here.
          </p>
        </div>
        <CreateButton />
      </header>

      {failed ? (
        <Empty title="Couldn't load your campaigns" body="Check your connection and refresh the page." />
      ) : !data ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading your campaigns">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-28 rounded-[20px]" />
          ))}
        </div>
      ) : data.tasks.length === 0 ? (
        <Empty
          title="You haven't run a campaign yet"
          body="Choose open (anyone can join) or verified (only verified creators), write a short brief, set your rate, and pay. It takes about three minutes."
          action
        />
      ) : (
        <ul className="space-y-3">
          {data.tasks.map((task) => (
            <li key={task.id}>
              <CampaignRowItem task={task} spots={data.spots.get(task.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CampaignRowItem({ task, spots }: { task: Task; spots?: { joined: number; standby: number } }) {
  const p = campaignProgress(task);
  const verified = campaignTypeOf(task) === "verified";
  const status = campaignStatus(task.status);
  const filled = verified && task.max_participants
    ? `${spots?.joined ?? 0} of ${task.max_participants} spots filled${spots?.standby ? ` · ${spots.standby} on standby` : ""}`
    : p
      ? `${p.approved} of ${p.max} posts approved`
      : `${task.approved_count} posts approved`;

  return (
    <Link
      href={`/order/${task.id}`}
      className="group flex items-center gap-4 rounded-[20px] border border-line bg-surface p-3 pr-4 transition hover:border-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal active:scale-[0.99] sm:gap-5"
    >
      <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-[14px] bg-line sm:h-24 sm:w-40">
        <CampaignCover task={task} className="[&_p]:text-base" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <span className="flex items-center gap-1 text-muted">
            <TypeLabel task={task} /> · <span className="font-mono">{taskRateLabel(task)}</span>
          </span>
        </div>
        <h3 className="mt-1.5 truncate font-heading text-base font-semibold text-ink sm:text-lg">{task.title}</h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {filled} · {runsLabel(task)}
        </p>
        <ProgressLine task={task} className="mt-2.5 max-w-xs" />
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-mono text-lg text-ink">{compactNaira(task.budget_spent)}</p>
        <p className="text-xs text-muted">of {compactNaira(campaignBudget(task))} used</p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden="true" />
    </Link>
  );
}

function CreateButton() {
  return (
    <Link
      href="/order/new"
      className="inline-flex h-11 items-center gap-2 rounded-full bg-signal px-5 font-heading text-[15px] font-semibold text-on-signal transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal active:scale-[0.97]"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Create campaign
    </Link>
  );
}

function Empty({ title, body, action = false }: { title: string; body: string; action?: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-line bg-surface px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-page text-muted">
        <Megaphone className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-heading text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted">{body}</p>
      {action && (
        <div className="mt-6">
          <CreateButton />
        </div>
      )}
    </div>
  );
}
