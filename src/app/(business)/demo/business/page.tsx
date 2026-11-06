import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GatheringRing } from "@/components/app/GatheringRing";
import Sparkline from "@/components/app/Sparkline";
import { LivePill, PostImage, ResultRows, StatusChip } from "@/components/app/parts";
import { BASE, BUSINESS, CAMPAIGN, POSTS, SPOTS, TOTALS, count } from "@/lib/demo/adiaha";

// Home: "How am I doing?" The live campaign is the hero, drawn as its ring.
export default function BusinessHome() {
  const posted = SPOTS.filter((s) => s.state === "posted" || s.state === "verified").length;
  const verified = SPOTS.filter((s) => s.state === "verified").length;
  const campaign = `${BASE}/campaigns/${CAMPAIGN.id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="rounded-[1.75rem] bg-surface p-5 ring-1 ring-line sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <LivePill daysLeft={CAMPAIGN.daysLeft} />
            <span className="text-sm text-muted">Goal: {CAMPAIGN.goal.toLowerCase()}</span>
          </div>

          <h1 className="mt-5 font-heading text-[2rem] leading-[1.02] font-semibold tracking-[-0.03em] sm:text-[2.6rem]">
            {CAMPAIGN.name}
          </h1>

          <div className="mt-6 grid items-center gap-6 sm:grid-cols-[13rem_1fr] sm:gap-8">
            <GatheringRing
              spots={SPOTS}
              className="mx-auto w-[min(15rem,70vw)] sm:w-full"
              centre={<span className="font-heading text-2xl font-semibold">{BUSINESS.initial}</span>}
            />
            <div>
              <p className="text-muted">Verified views so far</p>
              <p className="mt-1 font-mono text-[2.6rem] leading-none tracking-[-0.03em] tabular-nums">{count(TOTALS.views)}</p>
              <Sparkline id="home-views" values={CAMPAIGN.daily} className="mt-4 h-16" />
              <p className="mt-4 text-sm text-muted">
                {posted} of {CAMPAIGN.spots} creators have posted. {verified} verified so far.
              </p>
            </div>
          </div>

          <Link
            href={campaign}
            className="press mt-6 flex items-center justify-between rounded-2xl bg-page px-4 py-3.5 font-medium"
          >
            Open campaign
            <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
          </Link>
        </section>

        <ResultRows />
      </div>

      <section className="min-w-0">
        <div className="mb-2.5 flex items-baseline justify-between px-1">
          <h2 className="font-heading text-lg font-semibold">Latest posts</h2>
          <Link href={campaign} className="text-sm text-muted hover:text-ink">
            See all
          </Link>
        </div>
        {/* Phones: swipe sideways. Desktop: a column */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {POSTS.slice(0, 4).map((p) => (
            <li key={p.id} className="w-[11.5rem] shrink-0 snap-start lg:w-auto">
              <Link
                href={campaign}
                className="press flex flex-col overflow-hidden rounded-[1.25rem] bg-surface ring-1 ring-line lg:flex-row lg:items-center lg:gap-3 lg:p-2"
              >
                <span className="relative block aspect-[4/5] lg:w-16 lg:shrink-0 lg:overflow-hidden lg:rounded-xl">
                  <PostImage name={p.image} />
                </span>
                <span className="block p-3 lg:min-w-0 lg:flex-1 lg:p-0">
                  <span className="block truncate text-sm font-semibold">
                    {p.platform === "Facebook" ? p.creator.handle : `@${p.creator.handle}`}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {p.platform} · {count(p.views)} views
                  </span>
                  <StatusChip status={p.status} className="mt-2" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
