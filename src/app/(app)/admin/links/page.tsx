"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, Plus, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import ShareLinkDialog, { CopyLinkButton } from "@/components/admin/ShareLinkDialog";
import LinkFormDialog from "@/components/admin/LinkFormDialog";
import {
  ChannelTile,
  RingMark,
  Segmented,
  Switch,
  audienceLabel,
  furtherCount,
  pillButton,
  type LinkRow,
  type StatRow,
} from "@/components/admin/LinkParts";
import { PERIODS, linkUrl, percent, sinceFor, type PeriodKey } from "@/lib/trackingLinks";

// Tracking links (decided 2026-11-23): one link per place we post, so we can
// see which groups, flyers and agents bring people who sign up and go on.

function count(n: number) {
  return n.toLocaleString("en-NG");
}

// Opened → stayed → signed up → went further, for everything listed
function FunnelStrip({ opened, stayed, signedUp, further }: { opened: number; stayed: number; signedUp: number; further: number }) {
  const steps = [
    { label: "Opened", value: opened, note: "each person counted once" },
    { label: "Stayed", value: stayed, note: `${percent(stayed, opened)} of opened` },
    { label: "Signed up", value: signedUp, note: `${percent(signedUp, opened)} of opened` },
    { label: "Went further", value: further, note: "joined or paid" },
  ];
  return (
    <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] bg-line ring-1 ring-line sm:grid-cols-4">
      {steps.map((step, i) => (
        <li key={step.label} className="relative bg-surface px-5 py-5 sm:px-6">
          <p className="text-sm text-muted">{step.label}</p>
          <p className="mt-1.5 font-mono text-[2rem] leading-none tracking-tight tabular-nums">{count(step.value)}</p>
          <p className="mt-2 text-sm text-muted">{step.note}</p>
          {i < steps.length - 1 && (
            <ChevronRight
              className="absolute top-1/2 -right-[0.6rem] z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-surface p-0.5 text-muted ring-1 ring-line sm:block"
              aria-hidden="true"
            />
          )}
        </li>
      ))}
    </ol>
  );
}

// A thin track: how many of the people who opened stayed, and signed up
function MiniFunnel({ s }: { s: StatRow | undefined }) {
  const opened = s?.opened ?? 0;
  const width = (n: number) => (opened ? `${Math.max((n / opened) * 100, n ? 3 : 0)}%` : "0%");
  return (
    <div className="w-36">
      <p className="mb-1.5 text-sm text-muted">
        <span className="font-mono text-ink tabular-nums">{count(opened)}</span> opened
      </p>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-page ring-1 ring-line" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 rounded-full bg-ink/20" style={{ width: width(s?.stayed ?? 0) }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: width(s?.signed_up ?? 0) }} />
      </div>
    </div>
  );
}

function LinksSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading links">
      <div className="skeleton h-10 w-40 rounded-full" />
      <div className="skeleton h-32 rounded-[1.75rem]" />
      <div className="skeleton h-64 rounded-[1.75rem]" />
    </div>
  );
}

export default function AdminLinksPage() {
  const [links, setLinks] = useState<LinkRow[] | null>(null);
  const [stats, setStats] = useState<Map<string, StatRow>>(new Map());
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [showArchived, setShowArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sharing, setSharing] = useState<LinkRow | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const share = (link: LinkRow) => {
    setSharing(link);
    setShareOpen(true);
  };

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
      const { data, error } = await supabase.from("tracking_links").select("*").order("created_at", { ascending: false });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!cancelled) setLinks(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("link_stats", { p_since: sinceFor(period) }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        return;
      }
      setStats(new Map((data ?? []).map((s) => [s.link_id, s])));
    });
    return () => {
      cancelled = true;
    };
  }, [period]);

  const shown = useMemo(() => {
    const rows = (links ?? []).filter((l) => showArchived || !l.archived_at);
    // Most sign-ups first; the newest first when equal
    return [...rows].sort((a, b) => (stats.get(b.id)?.signed_up ?? 0) - (stats.get(a.id)?.signed_up ?? 0));
  }, [links, stats, showArchived]);

  if (!links) {
    return (
      <div className="mx-auto max-w-5xl font-body text-ink">
        <LinksSkeleton />
      </div>
    );
  }

  const totals = shown.reduce(
    (t, l) => {
      const s = stats.get(l.id);
      t.opened += s?.opened ?? 0;
      t.stayed += s?.stayed ?? 0;
      t.signedUp += s?.signed_up ?? 0;
      t.further += furtherCount(l.audience, s);
      return t;
    },
    { opened: 0, stayed: 0, signedUp: 0, further: 0 }
  );
  const archivedCount = links.filter((l) => l.archived_at).length;

  return (
    <div className="mx-auto max-w-5xl font-body text-ink">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="max-w-xl">
          <h1 className="font-heading text-[2.2rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[2.6rem]">Links</h1>
          <p className="mt-2 text-[1.02rem] text-pretty text-muted">
            One link for every place you post. See who opened it, who stayed and who signed up.
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className={pillButton("signal")}>
          <Plus className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.5} aria-hidden="true" />
          New link
        </button>
      </header>

      {links.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-[1.75rem] bg-surface px-6 py-16 text-center ring-1 ring-line">
          <RingMark />
          <h2 className="mt-5 font-heading text-xl font-semibold tracking-[-0.02em]">No links yet</h2>
          <p className="mt-1.5 max-w-sm text-pretty text-muted">
            Make one for the first group you&apos;ll post in. Each place gets its own link, so you can see which ones bring people in.
          </p>
          <button type="button" onClick={() => setCreating(true)} className={pillButton("ink", "mt-6")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Make your first link
          </button>
        </div>
      ) : (
        <>
          <div className="mt-9 mb-4 flex flex-wrap items-center justify-between gap-3">
            <Segmented value={period} options={PERIODS} onChange={setPeriod} label="Period" />
            {archivedCount > 0 && (
              <Switch checked={showArchived} onChange={setShowArchived} label={`Show archived (${archivedCount})`} />
            )}
          </div>

          <FunnelStrip {...totals} />

          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[1.75rem] bg-surface ring-1 ring-line">
            {shown.map((l) => {
              const s = stats.get(l.id);
              return (
                <li key={l.id} className={cn("relative flex items-center gap-4 px-4 py-4 transition-colors hover:bg-page/60 sm:px-5", l.archived_at && "opacity-60")}>
                  <ChannelTile channel={l.channel} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/links/${l.slug}`}
                      className="line-clamp-2 font-semibold break-words sm:line-clamp-1 after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:rounded-[inherit] after:focus-visible:ring-2 after:focus-visible:ring-ink after:focus-visible:ring-inset"
                    >
                      {l.label}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
                      <span className="font-mono text-ink/75">r/{l.slug}</span>
                      <span>{audienceLabel(l.audience)}</span>
                      {l.archived_at && <span className="rounded-full bg-page px-2 py-px text-xs ring-1 ring-line">Archived</span>}
                    </p>
                  </div>

                  <div className="hidden md:block">
                    <MiniFunnel s={s} />
                  </div>

                  <div className="w-16 text-right">
                    <p className="font-mono text-xl leading-none tabular-nums">{count(s?.signed_up ?? 0)}</p>
                    <p className="mt-1 text-xs text-muted">signed up</p>
                  </div>

                  <div className="relative z-10 flex items-center gap-2">
                    <CopyLinkButton url={linkUrl(l.slug)} className="hidden sm:flex" />
                    <button
                      type="button"
                      onClick={() => share(l)}
                      className="press flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      <Share2 className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Share</span>
                      <span className="sr-only sm:hidden">Share {l.label}</span>
                    </button>
                  </div>
                </li>
              );
            })}
            {shown.length === 0 && (
              <li className="px-6 py-10 text-center text-muted">Every link is archived. Switch on &ldquo;Show archived&rdquo; to see them.</li>
            )}
          </ul>
        </>
      )}

      <LinkFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(link) => {
          setLinks((cur) => [link, ...(cur ?? [])]);
          setCreating(false);
          toast.success("Link created");
          share(link);
        }}
      />

      {sharing && (
        <ShareLinkDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={linkUrl(sharing.slug)}
          message={sharing.message}
          label={sharing.label}
        />
      )}
    </div>
  );
}
