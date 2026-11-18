"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { campaignProgress } from "@/components/CampaignProgress";
import { taskPlatforms } from "@/components/PlatformIcon";
import { platformsForAccounts } from "@/components/ConnectAccounts";
import { PLATFORMS } from "@/lib/campaignOptions";
import type { Task } from "@/lib/types";
import CampaignRow from "./CampaignRow";
import { CampaignCard, FeaturedCard } from "./CampaignCard";
import { DAY_MS, notStartedYet } from "./campaign-utils";
import { allCampaignsHref, SORTERS, type DiscoverData } from "./discover-data";
import { DiscoverEmpty, FloatingSearch, RowsSkeleton, SeeAllLink } from "./DiscoverParts";

// Discover: browsing rows only. Sorting and filtering live on All campaigns
// (/discover/all), which every "See all" and a search open.

export default function DiscoverView({ data, loading }: { data: DiscoverData | null; loading: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const tasks = useMemo(() => data?.tasks ?? [], [data]);

  const sections = useMemo(() => {
    if (!data) return null;
    const { loadedAt: now } = data;
    const myPlatforms = platformsForAccounts(data.myPlatforms);
    const live = tasks.filter((t) => !notStartedYet(t));
    return {
      featured: [...live].sort(SORTERS.budget).slice(0, 5),
      forYou: myPlatforms.length ? live.filter((t) => taskPlatforms(t).some((p) => myPlatforms.includes(p))) : [],
      fresh: tasks.filter((t) => now - new Date(t.created_at).getTime() < 7 * DAY_MS),
      topPaying: [...live].sort(SORTERS.pay).slice(0, 12),
      almostFull: live.filter((t) => {
        const p = campaignProgress(t);
        return p && p.max > 0 && p.spotsLeft / p.max <= 0.3;
      }),
      byPlatform: PLATFORMS.map((platform) => ({
        platform,
        tasks: live.filter((t) => taskPlatforms(t).includes(platform)),
      })).filter((group) => group.tasks.length > 0),
    };
  }, [data, tasks]);

  const card = (task: Task) => (
    <CampaignCard
      key={task.id}
      task={task}
      membership={data?.membership.get(task.id)}
      spots={data?.spots.get(task.id)}
      className="w-full"
    />
  );
  // Rows preview a dozen; "See all" opens the full, filterable list
  const preview = (list: Task[]) => list.slice(0, 12).map(card);

  return (
    <div className="min-w-0">
      <header className="mb-8 animate-fade-in">
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">Discover</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Find a campaign, post about it on your own account in your own words, and get paid when the post is approved.
        </p>
      </header>

      {loading ? (
        <RowsSkeleton />
      ) : !data ? (
        <DiscoverEmpty title="Couldn't load campaigns" body="Check your connection and refresh the page." />
      ) : tasks.length === 0 || !sections ? (
        <DiscoverEmpty title="No open campaigns right now" body="New campaigns are added through the day. Check back soon." />
      ) : (
        <div className="space-y-12">
          {sections.featured.length > 0 && (
            <CampaignRow title="Featured" itemClassName="w-[90%] sm:w-[88%] lg:w-[80%]">
              {sections.featured.map((task, i) => (
                <div key={task.id} className="w-full">
                  <FeaturedCard task={task} eager={i === 0} />
                </div>
              ))}
            </CampaignRow>
          )}

          {sections.forYou.length > 0 && (
            <CampaignRow
              title="Campaigns for you"
              description="On the platforms you've connected"
              action={
                <SeeAllLink
                  href={allCampaignsHref({ socials: platformsForAccounts(data.myPlatforms).filter((p) => (PLATFORMS as readonly string[]).includes(p)) })}
                  label="See all campaigns for you"
                />
              }
            >
              {preview(sections.forYou)}
            </CampaignRow>
          )}

          {sections.fresh.length > 0 && (
            <CampaignRow
              title="New this week"
              description="Added in the last 7 days"
              action={<SeeAllLink href={allCampaignsHref({ sort: "newest" })} label="See all, newest first" />}
            >
              {preview(sections.fresh)}
            </CampaignRow>
          )}

          {sections.topPaying.length > 0 && (
            <CampaignRow
              title="Highest paying"
              description="The most per approved post"
              action={<SeeAllLink href={allCampaignsHref({ sort: "pay" })} label="See all, highest paying first" />}
            >
              {preview(sections.topPaying)}
            </CampaignRow>
          )}

          {sections.almostFull.length > 0 && (
            <CampaignRow
              title="Almost full"
              description="Few spots left: post soon"
              action={<SeeAllLink href={allCampaignsHref({ sort: "closing" })} label="See all, closing soonest first" />}
            >
              {preview(sections.almostFull)}
            </CampaignRow>
          )}

          {sections.byPlatform.map(({ platform, tasks: list }) => (
            <CampaignRow
              key={platform}
              title={`On ${platform}`}
              count={list.length}
              action={<SeeAllLink href={allCampaignsHref({ socials: [platform] })} label={`See all campaigns on ${platform}`} />}
            >
              {preview(list)}
            </CampaignRow>
          ))}

          <CampaignRow
            title="All campaigns"
            count={tasks.length}
            action={<SeeAllLink href={allCampaignsHref()} label="See all campaigns" />}
          >
            {preview(tasks)}
          </CampaignRow>
        </div>
      )}

      {/* Searching from here opens All campaigns with the search applied */}
      <FloatingSearch
        value={query}
        onChange={setQuery}
        onSubmit={(q) => q.trim() && router.push(allCampaignsHref({ q }))}
        placeholder="Search all campaigns, then press Enter"
      />
    </div>
  );
}
