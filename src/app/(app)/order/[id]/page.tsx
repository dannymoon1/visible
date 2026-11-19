"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, ExternalLink, Loader2, UserMinus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dispatchNotificationEmails } from "@/components/NotificationBell";
import { campaignProgress } from "@/components/CampaignProgress";
import { CampaignCover, ProgressLine, StatusPill, TypeLabel } from "@/components/campaigns/CampaignCard";
import {
  campaignStatus,
  campaignTypeOf,
  compactNaira,
  formatDate,
  submissionStatus,
  taskRateLabel,
  timeAgo,
} from "@/components/campaigns/campaign-utils";
import { cn } from "@/lib/cn";
import type { Database, Task } from "@/lib/types";

// Manage one campaign: how it's doing, and (for the owner or an admin) who
// joined. Removing a creator frees their spot for the next one on standby.

type Person = Database["public"]["Functions"]["get_campaign_participants"]["Returns"][number];

interface Loaded {
  task: Task;
  people: Person[];
}

async function load(id: string): Promise<Loaded | "missing" | "forbidden" | "error"> {
  const { data: task, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (error) return "error";
  if (!task) return "missing";

  const { data: people, error: peopleError } = await supabase.rpc("get_campaign_participants", { p_task_id: id });
  if (peopleError) return /manager/i.test(peopleError.message) ? "forbidden" : "error";
  return { task, people: people ?? [] };
}

export default function ManageCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<Loaded | "missing" | "forbidden" | "error" | null>(null);

  const refresh = useCallback(() => load(id).then(setState), [id]);

  useEffect(() => {
    let cancelled = false;
    load(id).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!state) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading campaign">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton h-40 rounded-[28px]" />
        <div className="skeleton h-64 rounded-[20px]" />
      </div>
    );
  }

  if (typeof state === "string") {
    const copy = {
      missing: ["This campaign doesn't exist", "It may have been removed."],
      forbidden: ["You can't manage this campaign", "Only the business that created it, or an admin, can see its creators."],
      error: ["Couldn't load this campaign", "Check your connection and refresh the page."],
    }[state];
    return (
      <div className="flex flex-col items-center rounded-[28px] border border-line bg-surface px-6 py-16 text-center">
        <p className="font-heading text-lg font-semibold text-ink">{copy[0]}</p>
        <p className="mt-1 text-sm text-muted">{copy[1]}</p>
        <BackLink className="mt-5" />
      </div>
    );
  }

  const { task, people } = state;
  const verified = campaignTypeOf(task) === "verified";
  const p = campaignProgress(task);
  const status = campaignStatus(task.status);
  const joined = people.filter((x) => x.status === "joined");
  const standby = people.filter((x) => x.status === "standby");
  const gone = people.filter((x) => x.status === "left" || x.status === "removed");
  const posted = people.filter((x) => x.submission_status).length;

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink className="mb-6" />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-[20px] bg-line sm:w-56">
          <CampaignCover task={task} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            <TypeLabel task={task} />
            <span aria-hidden="true">·</span>
            <span className="font-mono">{taskRateLabel(task)}</span>
          </div>
          <h1 className="mt-2 font-heading text-3xl leading-tight font-semibold tracking-[-0.03em] text-ink">{task.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Created {formatDate(task.created_at)} · {task.start_date ? `Starts ${formatDate(task.start_date)}` : "Live"}
            {verified && task.notified_at && ` · Verified creators told ${timeAgo(task.notified_at)} ago`}
          </p>
          <Link
            href={`/discover/${task.id}`}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
          >
            See it as creators do <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <ReviewBanner task={task} />

      {/* Overview: one grouped strip */}
      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-4">
        <Stat label="Budget used" value={`${compactNaira(task.budget_spent)} / ${compactNaira(task.amount_paid)}`}>
          <ProgressLine task={task} className="mt-2" />
        </Stat>
        <Stat
          label={verified ? "Spots filled" : "Creators joined"}
          value={verified && task.max_participants ? `${joined.length} / ${task.max_participants}` : String(joined.length)}
        />
        <Stat label="Posted" value={String(posted)} />
        <Stat label="Approved" value={p ? `${p.approved} / ${p.max}` : String(task.approved_count)} />
      </dl>

      {/* Creators */}
      <section className="mt-10">
        <h2 className="font-heading text-xl font-semibold tracking-[-0.02em] text-ink">Creators</h2>
        <p className="mt-1 text-sm text-muted">
          {verified
            ? "In the order they joined. Remove someone and the first creator on standby takes the spot."
            : "Everyone who has joined. Our team checks each post before it's paid."}
        </p>

        {people.length === 0 ? (
          <p className="mt-4 rounded-[20px] border border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            No one has joined yet.{verified && !task.notified_at ? " Verified creators are told when the campaign starts." : ""}
          </p>
        ) : (
          <div className="mt-4 space-y-6">
            <Group title="Joined" count={joined.length}>
              {joined.map((x, i) => (
                <PersonRow key={x.user_id} person={x} index={i + 1} taskId={task.id} canRemove={task.status === "active"} onDone={refresh} />
              ))}
            </Group>
            {verified && standby.length > 0 && (
              <Group title="Standby" count={standby.length} hint="Next in line moves up when a spot frees.">
                {standby.map((x, i) => (
                  <PersonRow key={x.user_id} person={x} index={i + 1} taskId={task.id} canRemove={task.status === "active"} onDone={refresh} />
                ))}
              </Group>
            )}
            {gone.length > 0 && (
              <Group title="Left or removed" count={gone.length}>
                {gone.map((x) => (
                  <PersonRow key={x.user_id} person={x} taskId={task.id} canRemove={false} onDone={refresh} />
                ))}
              </Group>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function PersonRow({
  person,
  index,
  taskId,
  canRemove,
  onDone,
}: {
  person: Person;
  index?: number;
  taskId: string;
  canRemove: boolean;
  onDone: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const sub = person.submission_status ? submissionStatus(person.submission_status) : null;
  const paid = sub?.tone === "verified";
  const name = person.username ? `@${person.username}` : "Creator";

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("remove_participant", { p_task_id: taskId, p_user_id: person.user_id });
    setBusy(false);
    setConfirming(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${name} was removed.`);
    // The removed creator (and anyone moved up from standby) gets an email
    dispatchNotificationEmails();
    onDone();
  };

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
      {index !== undefined && <span className="w-6 shrink-0 font-mono text-sm text-muted">{index}</span>}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-medium text-ink">
          {name}
          {person.is_verified_creator && <BadgeCheck className="h-4 w-4 shrink-0 text-verified" aria-label="Verified creator" />}
        </p>
        <p className="text-xs text-muted">
          {person.status === "left" ? "Left" : person.status === "removed" ? "Removed" : "Joined"} {timeAgo(person.joined_at)} ago
        </p>
      </div>
      {sub ? (
        <span className="flex items-center gap-2">
          <StatusPill tone={sub.tone}>{sub.label}</StatusPill>
          {person.post_url && (
            <a href={person.post_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-ink" aria-label={`Open ${name}'s post`}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </span>
      ) : (
        (person.status === "joined" || person.status === "standby") && (
          <StatusPill tone="muted">{person.status === "standby" ? "On standby" : "Not posted yet"}</StatusPill>
        )
      )}
      {canRemove && !paid && (person.status === "joined" || person.status === "standby") && (
        confirming ? (
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-error px-3.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Remove
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="h-9 px-2 text-sm font-medium text-muted hover:text-ink">
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm font-medium text-ink hover:border-muted/50"
          >
            <UserMinus className="h-4 w-4" aria-hidden="true" />
            Remove
          </button>
        )
      )}
    </li>
  );
}

// Where the campaign is in our review (decided 2026-11-19)
function ReviewBanner({ task }: { task: Task }) {
  if (task.status === "pending_review") {
    return (
      <div className="mt-6 rounded-[20px] border border-warning/40 bg-warning/8 px-5 py-4">
        <p className="font-medium text-ink">Our team is checking this campaign</p>
        <p className="mt-1 text-sm text-muted">
          Creators can&apos;t see it yet. We check every campaign before it goes live, usually within a day, and may tidy the brief.
          You&apos;ll get a notification and an email when it&apos;s approved.
        </p>
      </div>
    );
  }
  if (task.status === "rejected") {
    return (
      <div className="mt-6 rounded-[20px] border border-error/40 bg-error/8 px-5 py-4">
        <p className="font-medium text-ink">This campaign wasn&apos;t approved</p>
        {task.review_note && <p className="mt-1 text-sm text-ink">{task.review_note}</p>}
        <p className="mt-1 text-sm text-muted">Your payment will be refunded. Reply to our email if you have questions.</p>
      </div>
    );
  }
  if (task.review_note && task.reviewed_at) {
    return (
      <div className="mt-6 rounded-[20px] border border-line bg-surface px-5 py-4">
        <p className="text-xs text-muted">Note from our team · approved {timeAgo(task.reviewed_at)} ago</p>
        <p className="mt-1 text-sm text-ink">{task.review_note}</p>
      </div>
    );
  }
  return null;
}

function Group({ title, count, hint, children }: { title: string; count: number; hint?: string; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">
        {title} <span className="font-mono text-muted">{count}</span>
        {hint && <span className="ml-2 font-normal text-muted">{hint}</span>}
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-surface">{children}</ul>
    </div>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  return (
    <div className="bg-surface p-4">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 truncate font-mono text-lg text-ink">{value}</dd>
      {children}
    </div>
  );
}

function BackLink({ className }: { className?: string }) {
  return (
    <Link href="/order" className={cn("inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink", className)}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Run campaigns
    </Link>
  );
}
