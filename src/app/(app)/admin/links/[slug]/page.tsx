"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ArrowLeft, CornerDownRight, PenLine, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import type { Database } from "@/lib/database.types";
import ShareLinkDialog, { CopyLinkButton } from "@/components/admin/ShareLinkDialog";
import LinkFormDialog from "@/components/admin/LinkFormDialog";
import {
  ChannelTile,
  MessageBubble,
  RingMark,
  Segmented,
  audienceLabel,
  formatDate,
  pillButton,
  type LinkRow,
  type StatRow,
} from "@/components/admin/LinkParts";
import { PERIODS, channelLabel, displayUrl, linkUrl, percent, sinceFor, type PeriodKey } from "@/lib/trackingLinks";

// One tracking link: how far the people who opened it got, opens by day,
// and everyone who signed up through it.

type SignupRow = Database["public"]["Functions"]["link_signups"]["Returns"][number];

interface Step {
  label: string;
  count: number;
}

function count(n: number) {
  return n.toLocaleString("en-NG");
}

function stepsFor(audience: string, s: StatRow | undefined): Step[] {
  const n = (k: keyof StatRow) => Number(s?.[k] ?? 0);
  const top = [
    { label: "Opened the link", count: n("opened") },
    { label: "Stayed", count: n("stayed") },
  ];
  if (audience === "businesses") {
    return [
      ...top,
      { label: "Tapped sign up or start campaign", count: n("cta_clicks") },
      { label: "Signed up", count: n("signed_up") },
      { label: "Opened the campaign builder", count: n("builder_views") },
      { label: "Paid for a campaign", count: n("paid_campaign") },
    ];
  }
  return [
    ...top,
    { label: "Signed up", count: n("signed_up") },
    { label: "Joined a campaign", count: n("joined_campaign") },
    { label: "Submitted a post", count: n("posted") },
    { label: "Had a post approved", count: n("approved") },
  ];
}

// Each step as a bar against everyone who opened, with who dropped off between
function Funnel({ steps }: { steps: Step[] }) {
  const base = steps[0]?.count ?? 0;
  return (
    <ol>
      {steps.map((step, i) => {
        const prev = steps[i - 1];
        const dropped = prev ? Math.max(prev.count - step.count, 0) : 0;
        const width = base ? Math.max((step.count / base) * 100, step.count ? 1.5 : 0) : 0;
        const last = i === steps.length - 1;
        return (
          <li key={step.label}>
            {prev && dropped > 0 && (
              <p className="flex items-center gap-1.5 py-2 pl-1 text-sm text-muted">
                <CornerDownRight className="h-3.5 w-3.5" aria-hidden="true" />
                {count(dropped)} {i === 1 ? "left quickly" : "stopped here"}
              </p>
            )}
            {(!prev || dropped === 0) && i > 0 && <div className="h-4" />}
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium">{step.label}</span>
              <span className="shrink-0">
                <span className="font-mono text-lg tabular-nums">{count(step.count)}</span>
                {i > 0 && <span className="ml-2 inline-block w-10 text-right font-mono text-sm text-muted">{percent(step.count, base)}</span>}
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-page ring-1 ring-line">
              <div
                className={cn("h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]", last ? "bg-signal" : "bg-ink")}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

interface DayCount {
  key: string;
  label: string;
  count: number;
}

// First opens per day for the last 30 days, oldest first
function bucketByDay(dates: string[], now: number): DayCount[] {
  const counts = new Map<string, number>();
  dates.forEach((d) => {
    const key = d.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const out: DayCount[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    out.push({ key, label: day.toLocaleDateString("en-NG", { day: "numeric", month: "short" }), count: counts.get(key) ?? 0 });
  }
  return out;
}

function OpensByDay({ days }: { days: DayCount[] }) {
  const max = Math.max(...days.map((d) => d.count), 1);
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const best = days.reduce((a, b) => (b.count > a.count ? b : a), days[0] ?? { label: "", count: 0, key: "" });
  return (
    <div>
      <p className="text-sm text-muted">
        {total ? (
          <>
            <span className="font-mono text-ink tabular-nums">{count(total)}</span> new {total === 1 ? "person" : "people"} in 30 days. Busiest: {best.label} (
            <span className="font-mono tabular-nums">{best.count}</span>)
          </>
        ) : (
          "Nobody has opened it in the last 30 days."
        )}
      </p>
      <div className="mt-4 flex h-24 items-end gap-[3px]" role="img" aria-label="New people who opened the link each day, last 30 days">
        {days.map((d) => (
          <div
            key={d.key}
            title={`${d.label}: ${d.count}`}
            className={cn("flex-1 rounded-[3px]", d.count ? "bg-ink" : "bg-line/70")}
            style={{ height: `${d.count ? Math.max((d.count / max) * 100, 8) : 4}%` }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{days[0]?.label}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function Initials({ name }: { name: string }) {
  const letters = name.replace(/^@/, "").slice(0, 2).toUpperCase();
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-page font-heading text-sm font-semibold ring-1 ring-line" aria-hidden="true">
      {letters || "?"}
    </span>
  );
}

function Progress({ p }: { p: SignupRow }) {
  const chips = [
    p.campaigns_joined > 0 && `Joined ${p.campaigns_joined}`,
    p.posts > 0 && `Posted ${p.posts}`,
    p.approved_posts > 0 && `Approved ${p.approved_posts}`,
    p.campaigns_paid > 0 && `Paid for ${p.campaigns_paid}`,
  ].filter(Boolean) as string[];
  if (!chips.length) return <span className="text-sm text-muted">Not started yet</span>;
  return (
    <span className="flex flex-wrap justify-end gap-1.5">
      {chips.map((c) => (
        <span key={c} className="rounded-full bg-page px-2.5 py-0.5 text-xs font-medium ring-1 ring-line">
          {c}
        </span>
      ))}
    </span>
  );
}

export default function AdminLinkPage() {
  const { slug } = useParams<{ slug: string }>();
  const [link, setLink] = useState<LinkRow | null | undefined>(undefined);
  const [stats, setStats] = useState<StatRow | undefined>();
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [openDays, setOpenDays] = useState<DayCount[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [sharing, setSharing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editKey, setEditKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();
      if (!me?.is_admin) {
        window.location.href = "/dashboard";
        return;
      }
      const { data, error } = await supabase.from("tracking_links").select("*").eq("slug", slug).maybeSingle();
      if (error) toast.error(error.message);
      if (cancelled) return;
      setLink(data ?? null);
      if (!data) return;

      const now = Date.now();
      const since = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [signupsRes, opensRes] = await Promise.all([
        supabase.rpc("link_signups", { p_link_id: data.id }),
        supabase.from("link_events").select("created_at").eq("link_id", data.id).eq("event", "click").gte("created_at", since),
      ]);
      if (cancelled) return;
      setSignups(signupsRes.data ?? []);
      setOpenDays(bucketByDay((opensRes.data ?? []).map((r) => r.created_at), now));
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const linkId = link?.id;
  useEffect(() => {
    if (!linkId) return;
    let cancelled = false;
    supabase.rpc("link_stats", { p_since: sinceFor(period) }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        return;
      }
      setStats((data ?? []).find((s) => s.link_id === linkId));
    });
    return () => {
      cancelled = true;
    };
  }, [period, linkId]);

  if (link === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 font-body" aria-busy="true" aria-label="Loading link">
        <div className="skeleton h-10 w-72 rounded-full" />
        <div className="skeleton h-28 rounded-[1.75rem]" />
        <div className="skeleton h-80 rounded-[1.75rem]" />
      </div>
    );
  }

  if (link === null) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-20 text-center font-body text-ink">
        <RingMark />
        <h1 className="mt-5 font-heading text-xl font-semibold">No link ends with &ldquo;{slug}&rdquo;</h1>
        <p className="mt-1.5 text-muted">Check the spelling, or pick it from the list.</p>
        <Link href="/admin/links" className={pillButton("ink", "mt-6")}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All links
        </Link>
      </div>
    );
  }

  const url = linkUrl(link.slug);
  const opensTotal = stats?.opens_total ?? 0;
  const opened = stats?.opened ?? 0;

  const toggleArchive = async () => {
    const archived_at = link.archived_at ? null : new Date().toISOString();
    const { data, error } = await supabase.from("tracking_links").update({ archived_at }).eq("id", link.id).select().single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setLink(data);
    toast.success(archived_at ? "Archived. It still works for anyone who has it." : "Restored");
  };

  return (
    <div className="mx-auto max-w-5xl font-body text-ink">
      <Link href="/admin/links" className="press -ml-2 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted hover:bg-surface hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All links
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-5">
        <div className="flex min-w-0 items-start gap-4">
          <ChannelTile channel={link.channel} className="h-14 w-14 rounded-[1.1rem]" />
          <div className="min-w-0">
            <h1 className="font-heading text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-[2.3rem]">{link.label}</h1>
            <p className="mt-2 flex flex-wrap gap-1.5 text-sm">
              {[audienceLabel(link.audience), channelLabel(link.channel), `Made ${formatDate(link.created_at)}`].map((chip) => (
                <span key={chip} className="rounded-full bg-surface px-2.5 py-0.5 text-muted ring-1 ring-line">
                  {chip}
                </span>
              ))}
              {link.archived_at && <span className="rounded-full bg-ink px-2.5 py-0.5 text-white">Archived</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={toggleArchive} className={pillButton("ghost")}>
            {link.archived_at ? <ArchiveRestore className="h-4 w-4" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
            {link.archived_at ? "Restore" : "Archive"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditKey((k) => k + 1);
              setEditing(true);
            }}
            className={pillButton("quiet")}
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
          <button type="button" onClick={() => setSharing(true)} className={pillButton("ink")}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </button>
        </div>
      </header>

      {/* The link as a ticket: the thing people actually receive */}
      <section className="relative mt-8 flex flex-col overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line sm:flex-row">
        <div className="min-w-0 flex-1 px-6 py-5">
          <p className="text-sm text-muted">{link.audience === "businesses" ? "Opens the homepage" : "Opens the sign-up page"}</p>
          <p className="mt-1 font-mono text-[1.35rem] break-all sm:text-[1.6rem]">{displayUrl(link.slug)}</p>
        </div>
        <div
          className="relative mx-6 border-t-2 border-dashed border-line sm:mx-0 sm:my-5 sm:border-t-0 sm:border-l-2"
          aria-hidden="true"
        >
          <span className="absolute -top-[0.7rem] -left-[2.15rem] h-5 w-5 rounded-full bg-page ring-1 ring-line sm:-top-[2.05rem] sm:-left-[0.7rem]" />
          <span className="absolute -top-[0.7rem] -right-[2.15rem] h-5 w-5 rounded-full bg-page ring-1 ring-line sm:top-auto sm:-bottom-[2.05rem] sm:-left-[0.7rem]" />
        </div>
        <div className="flex items-center justify-between gap-6 px-6 py-5 sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="font-mono text-2xl leading-none tabular-nums">{count(opened)}</p>
            <p className="mt-1 text-sm text-muted">
              {opened === 1 ? "person" : "people"} opened it{opensTotal > opened ? `, ${count(opensTotal)} opens in all` : ""}
            </p>
          </div>
          <CopyLinkButton url={url} className="h-11 w-11" />
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
        <section className="rounded-[1.75rem] bg-surface p-6 ring-1 ring-line">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-[-0.01em]">How far people got</h2>
              <p className="text-sm text-muted">Each person counts once at each step.</p>
            </div>
            <Segmented value={period} options={PERIODS} onChange={setPeriod} label="Period" />
          </div>
          <Funnel steps={stepsFor(link.audience, stats)} />
        </section>

        <div className="space-y-6">
          <section className="rounded-[1.75rem] bg-surface p-6 ring-1 ring-line">
            <h2 className="mb-1 font-heading text-lg font-semibold tracking-[-0.01em]">Opens by day</h2>
            <OpensByDay days={openDays} />
          </section>

          <section className="rounded-[1.75rem] bg-surface p-6 ring-1 ring-line">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold tracking-[-0.01em]">What people receive</h2>
              <button
                type="button"
                onClick={() => {
                  setEditKey((k) => k + 1);
                  setEditing(true);
                }}
                className="press rounded-full px-3 py-1 text-sm font-medium text-muted hover:bg-page hover:text-ink"
              >
                Edit message
              </button>
            </div>
            <MessageBubble message={link.message} url={url} />
          </section>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 px-1 font-heading text-lg font-semibold tracking-[-0.01em]">
          People who signed up <span className="font-mono text-base font-normal text-muted">{signups.length}</span>
        </h2>
        {signups.length === 0 ? (
          <div className="rounded-[1.75rem] bg-surface px-6 py-10 text-center ring-1 ring-line">
            <p className="font-medium">No sign-ups yet</p>
            <p className="mt-1 text-sm text-muted">Anyone who signs up within 30 days of opening this link shows up here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
            {signups.map((p) => {
              const name = p.username ? `@${p.username}` : p.email ?? "No username";
              return (
                <li key={p.user_id} className="flex items-center gap-3.5 px-5 py-3.5">
                  <Initials name={p.username ?? p.email ?? ""} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{name}</p>
                    <p className="truncate text-sm text-muted">
                      {p.username && p.email ? `${p.email}, ` : ""}joined {formatDate(p.created_at)}
                    </p>
                  </div>
                  <Progress p={p} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <LinkFormDialog
        key={editKey}
        open={editing}
        link={link}
        onClose={() => setEditing(false)}
        onSaved={(saved) => {
          setLink(saved);
          setEditing(false);
          toast.success("Changes saved");
        }}
      />
      <ShareLinkDialog open={sharing} onClose={() => setSharing(false)} url={url} message={link.message} label={link.label} />
    </div>
  );
}
