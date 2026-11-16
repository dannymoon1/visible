"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Compass, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { campaignProgress } from "@/components/CampaignProgress";
import { getSocialAccounts } from "@/components/ConnectAccounts";
import { taskPlatforms } from "@/components/PlatformIcon";
import CampaignRow from "@/components/campaigns/CampaignRow";
import { CampaignCard, FeaturedCard } from "@/components/campaigns/CampaignCard";
import { DAY_MS, isOpenCampaign, notStartedYet } from "@/components/campaigns/campaign-utils";
import { PLATFORMS } from "@/lib/campaignOptions";
import type { Task } from "@/lib/types";

interface DiscoverData {
  tasks: Task[];
  joined: Set<string>;
  myPlatforms: string[];
  loadedAt: number;
}

async function loadDiscover(): Promise<DiscoverData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [tasksRes, subsRes] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("submissions").select("task_id").eq("user_id", user.id),
  ]);

  if (tasksRes.error) {
    console.error("Discover: tasks", tasksRes.error);
    return null;
  }

  const joined = new Set<string>();
  subsRes.data?.forEach((s) => s.task_id && joined.add(s.task_id));

  return {
    tasks: (tasksRes.data ?? []).filter(isOpenCampaign),
    joined,
    myPlatforms: Object.keys(getSocialAccounts(user)),
    loadedAt: Date.now(),
  };
}

const matches = (task: Task, q: string) =>
  [task.title, task.description, task.content_type, ...taskPlatforms(task)]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(q));

export default function DiscoverPage() {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadDiscover().then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // "/" jumps to search, like most catalogues
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key !== "/" || target?.closest("input, textarea, select, [contenteditable]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sections = useMemo(() => {
    if (!data) return null;
    const { tasks, myPlatforms, loadedAt: now } = data;
    const live = tasks.filter((t) => !notStartedYet(t));

    const featured = [...live]
      .sort((a, b) => (Number(b.amount_paid) || 0) - (Number(a.amount_paid) || 0))
      .slice(0, 5);

    const forYou = myPlatforms.length
      ? live.filter((t) => taskPlatforms(t).some((p) => myPlatforms.includes(p)))
      : [];

    const fresh = tasks.filter((t) => now - new Date(t.created_at).getTime() < 7 * DAY_MS);

    const topPaying = [...live]
      .sort((a, b) => (Number(b.reward) || 0) - (Number(a.reward) || 0))
      .slice(0, 12);

    const almostFull = live.filter((t) => {
      const p = campaignProgress(t);
      return p && p.max > 0 && p.spotsLeft / p.max <= 0.3;
    });

    const byPlatform = PLATFORMS.map((platform) => ({
      platform,
      tasks: live.filter((t) => taskPlatforms(t).includes(platform)),
    })).filter((group) => group.tasks.length > 0);

    return { featured, forYou, fresh, topPaying, almostFull, byPlatform };
  }, [data]);

  const q = query.trim().toLowerCase();
  const results = q && data ? data.tasks.filter((t) => matches(t, q)) : null;
  const joined = data?.joined ?? new Set<string>();

  const card = (task: Task) => <CampaignCard key={task.id} task={task} joined={joined.has(task.id)} className="w-full" />;

  return (
    <div>
      <header className="mb-8 animate-fade-in">
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">Discover</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Find a campaign, post about it on your own account in your own words, and get paid when the post is approved.
        </p>
      </header>

      {loading ? (
        <DiscoverSkeleton />
      ) : !data ? (
        <Empty title="Couldn't load campaigns" body="Check your connection and refresh the page." />
      ) : results ? (
        <section aria-live="polite">
          <h2 className="mb-4 font-heading text-xl font-semibold tracking-[-0.02em] text-ink">
            {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{query.trim()}&rdquo;
          </h2>
          {results.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{results.map(card)}</div>
          ) : (
            <Empty title="No campaigns match" body="Try a platform like TikTok, or a type like Video." />
          )}
        </section>
      ) : data.tasks.length === 0 || !sections ? (
        <Empty title="No open campaigns right now" body="New campaigns are added through the day. Check back soon." />
      ) : (
        <div className="space-y-12">
          {sections.featured.length > 0 && (
            <CampaignRow title="Featured" itemClassName="w-[92%] lg:w-[88%]">
              {sections.featured.map((task, i) => (
                <div key={task.id} className="w-full">
                  <FeaturedCard task={task} eager={i === 0} />
                </div>
              ))}
            </CampaignRow>
          )}

          {sections.forYou.length > 0 && (
            <CampaignRow title="Campaigns for you" description="On the platforms you've connected">
              {sections.forYou.map(card)}
            </CampaignRow>
          )}

          {sections.fresh.length > 0 && (
            <CampaignRow title="New this week" description="Added in the last 7 days">
              {sections.fresh.map(card)}
            </CampaignRow>
          )}

          {sections.topPaying.length > 0 && (
            <CampaignRow title="Highest paying" description="The most per approved post">
              {sections.topPaying.map(card)}
            </CampaignRow>
          )}

          {sections.almostFull.length > 0 && (
            <CampaignRow title="Almost full" description="Few spots left: post soon">
              {sections.almostFull.map(card)}
            </CampaignRow>
          )}

          {sections.byPlatform.map(({ platform, tasks }) => (
            <CampaignRow key={platform} title={`On ${platform}`} count={tasks.length}>
              {tasks.map(card)}
            </CampaignRow>
          ))}

          <section aria-labelledby="all-campaigns">
            <h2 id="all-campaigns" className="mb-4 font-heading text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
              All campaigns
              <span className="ml-2 font-mono text-sm font-medium text-muted">{data.tasks.length}</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.tasks.map(card)}</div>
          </section>
        </div>
      )}

      {/* Floating search: sticks to the bottom of the screen, centred on the content column */}
      <div className="pointer-events-none sticky bottom-5 z-30 mt-12 flex justify-center">
        <label className="pointer-events-auto flex h-12 w-full max-w-md items-center gap-3 rounded-full border border-line bg-surface/90 pr-2 pl-4 shadow-[0_12px_40px_-12px_rgb(20_22_26/0.35)] backdrop-blur-xl focus-within:border-signal">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted" aria-hidden="true" />
          <span className="sr-only">Search campaigns</span>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Search campaigns, e.g. TikTok"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-line/60 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden rounded-md border border-line px-2 py-0.5 font-mono text-xs text-muted sm:block">/</kbd>
          )}
        </label>
      </div>
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-[28px] border border-line bg-surface px-6 py-16 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-page text-muted">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="font-heading text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      <Link href="/tasks" className="mt-5 text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4">
        Go to my campaigns
      </Link>
    </div>
  );
}

function DiscoverSkeleton() {
  return (
    <div className="space-y-12" aria-busy="true" aria-label="Loading campaigns">
      <div className="skeleton h-[300px] rounded-[28px] sm:h-[340px]" />
      {[0, 1].map((row) => (
        <div key={row}>
          <div className="skeleton mb-4 h-6 w-48" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-[300px] rounded-[20px]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
