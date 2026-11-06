import { ShieldCheck } from "lucide-react";
import CreatorAvatar from "@/components/site/CreatorAvatar";
import Sparkline from "@/components/app/Sparkline";
import { ResultRows } from "@/components/app/parts";
import { CAMPAIGN, TOTALS, count, verifiedPosts } from "@/lib/demo/adiaha";

// Report: "Who came?" Views over time, the goal first, the best posts, and
// what our checks took out.
export default function CampaignReport() {
  const top = [...verifiedPosts].sort((a, b) => b.views - a.views).slice(0, 3);
  const best = top[0]?.views ?? 1;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-8">
      <div className="flex flex-col gap-6">
        <section className="rounded-[1.75rem] bg-surface p-5 ring-1 ring-line sm:p-7">
          <p className="text-muted">Your goal: website visits</p>
          <p className="mt-1 font-mono text-[3rem] leading-none tracking-[-0.03em] tabular-nums">{count(TOTALS.taps)}</p>
          <p className="mt-2 text-muted">people tapped a creator&apos;s link to adiahaskin.shop</p>

          <div className="mt-8 flex items-baseline justify-between">
            <span className="font-medium">Verified views</span>
            <span className="font-mono tabular-nums">{count(TOTALS.views)}</span>
          </div>
          <Sparkline id="report-views" values={CAMPAIGN.daily} days={["Mon", "Tue", "Wed", "Thu", "Fri"]} className="mt-3 h-28" />
        </section>

        <ResultRows title="Everything it brought you" />
      </div>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-2.5 px-1 font-heading text-lg font-semibold">Top posts</h2>
          <ol className="divide-y divide-line overflow-hidden rounded-[1.25rem] bg-surface ring-1 ring-line">
            {top.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3.5 px-4 py-3.5">
                <span className="w-4 font-mono text-sm text-muted">{i + 1}</span>
                <CreatorAvatar who={p.creator.avatar} large className="h-10 w-10" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {p.platform === "Facebook" ? p.creator.handle : `@${p.creator.handle}`}
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-page">
                    <span className="block h-full rounded-full bg-signal" style={{ width: `${(p.views / best) * 100}%` }} />
                  </span>
                </span>
                <span className="font-mono tabular-nums">{count(p.views)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 px-1 text-sm text-muted">You can invite your best creators back for your next campaign.</p>
        </section>

        <section className="rounded-[1.25rem] bg-surface p-5 ring-1 ring-line">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-page text-signal">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="font-heading text-lg leading-tight font-semibold">
              {count(CAMPAIGN.removedViews)} views failed our checks
            </p>
          </div>
          <p className="mt-3 text-muted text-pretty">
            They came from accounts outside Nigeria, all within one hour. We took them out, so they&apos;re not on your bill,
            and a standby creator took that spot.
          </p>
        </section>
      </div>
    </div>
  );
}
