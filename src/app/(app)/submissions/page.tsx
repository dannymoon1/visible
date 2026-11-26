"use client";

import { createElement, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Clock3, Compass, ExternalLink, X, type LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { platformIcon } from "@/components/PlatformIcon";
import { campaignHref, CampaignCover, StatusPill } from "@/components/campaigns/CampaignCard";
import { DAY_MS, formatDate, submissionStatus, timeAgo,
  maxEarnFor,
  postEarnings,
} from "@/components/campaigns/campaign-utils";
import { formatNaira } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Submission, Task } from "@/lib/types";

// Submissions: every post this creator has sent in, with how each one did and
// what the checks found. Charts follow the dataviz skill: thin marks, one
// series per chart (no legend needed), status colours only with labels.

type Row = Submission & { task: Task | null };
type Tone = "verified" | "warning" | "error";

interface Loaded {
  rows: Row[];
  now: number;
}

async function loadSubmissions(): Promise<Loaded | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: subs, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Submissions:", error);
    return null;
  }

  const ids = [...new Set((subs ?? []).map((s) => s.task_id).filter((id): id is string => Boolean(id)))];
  const { data: tasks } = ids.length ? await supabase.from("tasks").select("*").in("id", ids) : { data: [] as Task[] };
  const byId = new Map((tasks ?? []).map((t) => [t.id, t]));

  return {
    rows: (subs ?? []).map((s) => ({ ...s, task: s.task_id ? (byId.get(s.task_id) ?? null) : null })),
    now: Date.now(),
  };
}

// In review, approved/paid, or not approved: the three states creators care about
function toneOf(row: Row): Tone {
  const t = submissionStatus(row.status).tone;
  return t === "muted" ? "warning" : t;
}

// Only what has actually been paid (version-2 posts are paid in stages)
const earnedBy = (rows: Row[]) => rows.reduce((sum, r) => sum + postEarnings(r, r.task), 0);

// What the checks found, in words a creator can act on
const FLAG_ADVICE: Record<string, { label: string; tip: string }> = {
  too_short: { label: "Too short", tip: "Say a bit more: what you liked, or why your followers should care." },
  generic_phrase: { label: "Generic wording", tip: "Swap stock phrases like “nice product” for your own experience." },
  emoji_heavy: { label: "Mostly emoji", tip: "Keep emoji as seasoning; the words should carry the post." },
  emoji_only: { label: "Emoji only", tip: "Posts need words. Emoji alone can't be approved." },
  empty_comment: { label: "No text sent", tip: "Paste your post's caption exactly as published." },
  self_promotion: { label: "Self-promotion", tip: "Keep the focus on the business, not your own page or links." },
  duplicate_comment: { label: "Repeated text", tip: "Write each post fresh; copied captions are flagged." },
  post_not_found: { label: "Post not found", tip: "Check the link opens your post and that the post is public." },
  comment_not_found: { label: "Post not found", tip: "Check the link opens your post and that the post is public." },
  unverifiable: { label: "Checked by hand", tip: "We couldn't check this platform automatically, so a person reviews it." },
  api_error: { label: "Check failed", tip: "Our check hit an error; the team reviews these by hand." },
};

function flagsOf(row: Row): string[] {
  return Array.isArray(row.verification_flags)
    ? row.verification_flags.filter((f): f is string => typeof f === "string")
    : [];
}

const RANGES = [
  { key: "all", label: "All time", days: Infinity },
  { key: "30", label: "30 days", days: 30 },
  { key: "7", label: "7 days", days: 7 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

export default function SubmissionsPage() {
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [range, setRange] = useState<RangeKey>("all");

  useEffect(() => {
    let cancelled = false;
    loadSubmissions().then((result) => {
      if (cancelled) return;
      if (result) setData(result);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const days = RANGES.find((r) => r.key === range)?.days ?? Infinity;
    return data.rows.filter((r) => data.now - new Date(r.created_at).getTime() <= days * DAY_MS);
  }, [data, range]);

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">Submissions</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Every post you&apos;ve sent in, how it did, and what our checks found.
          </p>
        </div>
        {data && data.rows.length > 0 && (
          <Segmented value={range} onChange={setRange} options={RANGES} label="Time range" />
        )}
      </header>

      {failed ? (
        <Empty title="Couldn't load your submissions" body="Check your connection and refresh the page." />
      ) : !data ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading submissions">
          <div className="skeleton h-24 rounded-[20px]" />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="skeleton h-64 rounded-[20px]" />
            <div className="skeleton h-64 rounded-[20px]" />
          </div>
          <div className="skeleton h-80 rounded-[20px]" />
        </div>
      ) : data.rows.length === 0 ? (
        <Empty
          title="No submissions yet"
          body="Pick a campaign on Discover, post about it on your own account, and submit the link. Your results show up here."
          action
        />
      ) : rows.length === 0 ? (
        <Empty title="Nothing in this time range" body="Try a longer range to see older posts." />
      ) : (
        <div className="space-y-6">
          <Summary rows={rows} />
          <div className="grid gap-6 lg:grid-cols-2">
            <StatusBreakdown rows={rows} />
            <WeeklyChart rows={rows} now={data.now} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <PlatformBreakdown rows={rows} />
            <QualityFeedback rows={rows} />
          </div>
          <SubmissionList rows={rows} now={data.now} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// Headline numbers: stat tiles, not charts

function Summary({ rows }: { rows: Row[] }) {
  const approved = rows.filter((r) => toneOf(r) === "verified").length;
  const rejected = rows.filter((r) => toneOf(r) === "error").length;
  const decided = approved + rejected;
  const scored = rows.filter((r) => r.quality_score !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, r) => s + Number(r.quality_score), 0) / scored.length)
    : null;

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
      <Tile label="Posts submitted" value={String(rows.length)} />
      <Tile label="Approved" value={String(approved)} />
      <Tile
        label="Approval rate"
        value={decided ? `${Math.round((approved / decided) * 100)}%` : "—"}
        hint={decided ? `of ${decided} reviewed` : "None reviewed yet"}
      />
      <Tile label="Earned" value={formatNaira(earnedBy(rows))} />
      <Tile
        label="Avg quality score"
        value={avgScore === null ? "—" : `${avgScore}/100`}
        hint={avgScore === null ? "Not scored yet" : avgScore >= 60 ? "Passes our checks" : "Below the 60 pass mark"}
        className="col-span-2 sm:col-span-1"
      />
    </dl>
  );
}

function Tile({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className={cn("bg-surface p-4 sm:p-5", className)}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 truncate font-mono text-xl text-ink sm:text-2xl">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

// ---------------------------------------------------------
// Where posts stand: one segmented bar, status colours with icon + label + count

const STATUS_META: Record<Tone, { label: string; bar: string; icon: LucideIcon; iconClass: string }> = {
  verified: { label: "Approved", bar: "bg-verified", icon: Check, iconClass: "bg-verified/12 text-verified" },
  warning: { label: "In review", bar: "bg-warning", icon: Clock3, iconClass: "bg-warning/12 text-warning" },
  error: { label: "Not approved", bar: "bg-error", icon: X, iconClass: "bg-error/12 text-error" },
};

function StatusBreakdown({ rows }: { rows: Row[] }) {
  const counts = (["verified", "warning", "error"] as const).map((tone) => ({
    tone,
    count: rows.filter((r) => toneOf(r) === tone).length,
  }));

  return (
    <Panel title="Where your posts stand" description={`${rows.length} ${rows.length === 1 ? "post" : "posts"}`}>
      {/* 2px surface gap between segments; rounded ends only at the bar's two edges */}
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[4px]" role="img" aria-label={counts.map((c) => `${STATUS_META[c.tone].label} ${c.count}`).join(", ")}>
        {counts
          .filter((c) => c.count > 0)
          .map((c) => (
            <div key={c.tone} className={STATUS_META[c.tone].bar} style={{ flexGrow: c.count }} title={`${STATUS_META[c.tone].label}: ${c.count}`} />
          ))}
      </div>

      <ul className="mt-5 space-y-3">
        {counts.map(({ tone, count }) => {
          const meta = STATUS_META[tone];
          const Icon = meta.icon;
          return (
            <li key={tone} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2.5 text-ink">
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", meta.iconClass)}>
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />
                </span>
                {meta.label}
              </span>
              <span className="font-mono text-ink">
                {count}
                <span className="ml-2 text-muted">{rows.length ? Math.round((count / rows.length) * 100) : 0}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------
// Posts per week: single-series columns, hover/focus tooltip, table view

const WEEKS = 8;

function startOfWeek(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d.getTime();
}

function WeeklyChart({ rows, now }: { rows: Row[]; now: number }) {
  const [showTable, setShowTable] = useState(false);
  const thisWeek = startOfWeek(now);
  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const start = thisWeek - (WEEKS - 1 - i) * 7 * DAY_MS;
    const inWeek = rows.filter((r) => startOfWeek(new Date(r.created_at).getTime()) === start);
    return {
      start,
      label: new Date(start).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
      posts: inWeek.length,
      approved: inWeek.filter((r) => toneOf(r) === "verified").length,
    };
  });
  const max = Math.max(1, ...weeks.map((w) => w.posts));
  const total = weeks.reduce((s, w) => s + w.posts, 0);

  return (
    <Panel
      title="Posts per week"
      description={`${total} in the last ${WEEKS} weeks`}
      action={
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-xs font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          {showTable ? "Show chart" : "View as table"}
        </button>
      }
    >
      {showTable ? (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="pb-2 font-medium">Week of</th>
              <th className="pb-2 text-right font-medium">Posts</th>
              <th className="pb-2 text-right font-medium">Approved</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.start} className="border-t border-line">
                <td className="py-1.5 text-ink">{w.label}</td>
                <td className="py-1.5 text-right font-mono text-ink">{w.posts}</td>
                <td className="py-1.5 text-right font-mono text-ink">{w.approved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div>
          <div className="relative flex h-44 items-end gap-[2px] border-b border-line">
            {/* Recessive gridline at the max */}
            <span className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden="true" />
            <span className="pointer-events-none absolute top-0 right-0 -translate-y-full pb-0.5 font-mono text-[11px] text-muted" aria-hidden="true">
              {max}
            </span>
            {weeks.map((w, i) => (
              <button
                key={w.start}
                type="button"
                aria-label={`Week of ${w.label}: ${w.posts} ${w.posts === 1 ? "post" : "posts"}, ${w.approved} approved`}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                <span
                  className={cn(
                    "w-full max-w-9 rounded-t-[4px] transition-colors",
                    i === WEEKS - 1 ? "bg-signal" : "bg-ink/75 group-hover:bg-ink group-focus-visible:bg-ink"
                  )}
                  style={{ height: w.posts ? `${(w.posts / max) * 100}%` : "2px", opacity: w.posts ? 1 : 0.25 }}
                />
                {/* Tooltip */}
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-full z-10 mb-2 hidden w-max rounded-xl bg-[#14161A] px-3 py-2 text-left text-xs text-[#F2F3F5] shadow-lg group-hover:block group-focus-visible:block",
                    i < 2 ? "left-0" : i > WEEKS - 3 ? "right-0" : "left-1/2 -translate-x-1/2"
                  )}
                >
                  <span className="block text-[#9AA1AD]">Week of {w.label}</span>
                  <span className="mt-0.5 block font-mono">
                    {w.posts} {w.posts === 1 ? "post" : "posts"} · {w.approved} approved
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-[2px] font-mono text-[11px] text-muted">
            {weeks.map((w, i) => (
              <span key={w.start} className={cn("flex-1 text-center", i % 2 === 1 && "max-sm:invisible")}>
                {i === WEEKS - 1 ? "This wk" : w.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------
// By platform: horizontal bars, values in ink beside the mark

function PlatformBreakdown({ rows }: { rows: Row[] }) {
  const groups = new Map<string, Row[]>();
  rows.forEach((r) => {
    const key = r.post_platform || "Other";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  const list = [...groups.entries()]
    .map(([platform, items]) => {
      const approved = items.filter((r) => toneOf(r) === "verified").length;
      const decided = approved + items.filter((r) => toneOf(r) === "error").length;
      return { platform, posts: items.length, approved, rate: decided ? Math.round((approved / decided) * 100) : null, earned: earnedBy(items) };
    })
    .sort((a, b) => b.posts - a.posts);
  const max = Math.max(1, ...list.map((g) => g.posts));

  return (
    <Panel title="By platform" description="Posts, approval rate and earnings on each platform">
      <ul className="space-y-4">
        {list.map((g) => {
          const Icon = platformIcon(g.platform);
          return (
            <li key={g.platform}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-ink">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {g.platform}
                </span>
                <span className="font-mono text-xs text-muted">
                  {g.rate === null ? "not reviewed" : `${g.rate}% approved`} · {formatNaira(g.earned)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1">
                  <div className="h-full rounded-r-[4px] bg-ink/75" style={{ width: `${(g.posts / max) * 100}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-sm text-ink">
                  {g.posts} {g.posts === 1 ? "post" : "posts"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ---------------------------------------------------------
// Quality feedback: the flags our checks raised most, with what to do

function QualityFeedback({ rows }: { rows: Row[] }) {
  const counts = new Map<string, number>();
  rows.forEach((r) =>
    new Set(flagsOf(r).map((f) => FLAG_ADVICE[f]?.label ?? f)).forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1))
  );
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const tipFor = (label: string) => Object.values(FLAG_ADVICE).find((a) => a.label === label)?.tip;

  return (
    <Panel title="What our checks found" description="The issues flagged most often on your posts">
      {top.length === 0 ? (
        <div className="flex items-start gap-3 rounded-2xl bg-page p-4 text-sm">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-verified/12 text-verified">
            <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden="true" />
          </span>
          <p className="text-ink">
            No issues flagged. Keep following each brief and writing in your own words.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {top.map(([label, count]) => (
            <li key={label} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-ink">{label}</span>
                <span className="font-mono text-xs text-muted">
                  {count} {count === 1 ? "post" : "posts"}
                </span>
              </div>
              {tipFor(label) && <p className="mt-0.5 text-sm text-muted">{tipFor(label)}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

// ---------------------------------------------------------
// Every submission, expandable for the full check result

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "warning", label: "In review" },
  { key: "verified", label: "Approved" },
  { key: "error", label: "Not approved" },
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number]["key"];

function SubmissionList({ rows, now }: { rows: Row[]; now: number }) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const shown = rows.filter((r) => filter === "all" || toneOf(r) === filter);

  return (
    <Panel
      title="All submissions"
      description={`${shown.length} of ${rows.length}`}
      action={<Segmented value={filter} onChange={setFilter} options={STATUS_FILTERS} label="Filter by status" small />}
      flush
    >
      {shown.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((row) => (
            <SubmissionItem
              key={row.id}
              row={row}
              now={now}
              open={open === row.id}
              onToggle={() => setOpen((cur) => (cur === row.id ? null : row.id))}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function SubmissionItem({ row, now, open, onToggle }: { row: Row; now: number; open: boolean; onToggle: () => void }) {
  const s = submissionStatus(row.status);
  const flags = flagsOf(row);
  const panelId = `sub-${row.id}`;

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-page/60 focus-visible:bg-page focus-visible:outline-none"
      >
        <div className="relative hidden h-12 w-16 shrink-0 overflow-hidden rounded-[10px] bg-line sm:block">
          {row.task && <CampaignCover task={row.task} className="[&_p]:hidden" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink">{row.task?.title ?? "Campaign no longer available"}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted">
            {createElement(platformIcon(row.post_platform || ""), { className: "h-3.5 w-3.5 shrink-0", "aria-hidden": true })}
            {row.social_handle ? `@${row.social_handle}` : row.post_platform || "Post"}
            <span aria-hidden="true">·</span>
            {timeAgo(row.created_at, now)} ago
          </p>
        </div>
        <span className="hidden w-16 text-right font-mono text-sm text-ink md:block" title="Quality score">
          {row.quality_score ?? "—"}
          <span className="text-muted">/100</span>
        </span>
        <span
          className={cn("hidden w-24 text-right font-mono text-sm sm:block", postEarnings(row, row.task) ? "text-ink" : "text-muted")}
          title={postEarnings(row, row.task) ? "Earned" : "The most this post can earn"}
        >
          {postEarnings(row, row.task) ? formatNaira(postEarnings(row, row.task)) : row.task ? `≤ ${formatNaira(maxEarnFor(row.task))}` : "—"}
        </span>
        <StatusPill tone={s.tone}>{s.label}</StatusPill>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open && (
        <div id={panelId} className="animate-fade-in space-y-4 border-t border-line bg-page/50 px-5 py-5 text-sm">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Fact label="Submitted">{formatDate(row.created_at)}</Fact>
            <Fact label="Checked">{row.verified_at ? formatDate(row.verified_at) : "Not yet"}</Fact>
            <Fact label="Paid">{row.paid_at ? formatDate(row.paid_at) : "—"}</Fact>
            <Fact label="Quality score">{row.quality_score === null ? "Not scored" : `${row.quality_score}/100`}</Fact>
          </dl>

          {row.verification_summary && (
            <div>
              <p className="mb-1 text-xs text-muted">What the check found</p>
              <p className="leading-relaxed text-ink">{row.verification_summary}</p>
            </div>
          )}

          {flags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {flags.map((f) => (
                <li key={f} className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink" title={FLAG_ADVICE[f]?.tip}>
                  {FLAG_ADVICE[f]?.label ?? f.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          )}

          {row.comment_text && (
            <div>
              <p className="mb-1 text-xs text-muted">Your post&apos;s text</p>
              <blockquote className="rounded-xl border border-line bg-surface p-3 whitespace-pre-line text-ink">{row.comment_text}</blockquote>
            </div>
          )}

          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {row.post_url && (
              <a href={row.post_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-ink underline decoration-signal decoration-2 underline-offset-4">
                Open your post <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
            {row.task && (
              <Link href={campaignHref(row.task)} className="inline-flex items-center gap-1.5 font-medium text-ink underline decoration-signal decoration-2 underline-offset-4">
                View campaign <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------
// Shared bits

function Panel({
  title,
  description,
  action,
  flush = false,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-line bg-surface">
      <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", flush ? "pb-4" : "pb-5")}>
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className={flush ? "border-t border-line" : "px-5 pb-5"}>{children}</div>
    </section>
  );
}

function Segmented<K extends string>({
  value,
  onChange,
  options,
  label,
  small = false,
}: {
  value: K;
  onChange: (key: K) => void;
  options: ReadonlyArray<{ key: K; label: string }>;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-surface p-1 [scrollbar-width:none]" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "shrink-0 rounded-full font-medium transition",
            small ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm",
            value === o.key ? "bg-ink text-page" : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
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
