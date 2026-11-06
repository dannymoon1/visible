import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { MiniRing } from "@/components/app/GatheringRing";
import { ScreenTitle } from "@/components/app/parts";
import { BASE, CAMPAIGN, SPOTS, TOTALS, count } from "@/lib/demo/adiaha";

// Campaigns: each one is its ring. The logo, filled in by what happened.
const PAST = {
  name: "Christmas glow",
  when: "December",
  views: 22410,
  spots: Array.from({ length: 8 }, () => ({ avatar: "makeup" as const, state: "verified" as const })),
};

export default function Campaigns() {
  return (
    <div>
      <ScreenTitle title="Campaigns">
        <Link
          href={`${BASE}/new`}
          className="press hidden h-10 items-center gap-2 rounded-full bg-ember px-4 font-heading text-sm font-semibold text-on-signal sm:inline-flex"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
          Start a campaign
        </Link>
      </ScreenTitle>

      <h2 className="mt-8 mb-2.5 px-1 text-sm text-muted">Running</h2>
      <Link
        href={`${BASE}/campaigns/${CAMPAIGN.id}`}
        className="press flex items-center gap-4 rounded-[1.25rem] bg-surface p-4 ring-1 ring-line"
      >
        <MiniRing spots={SPOTS} className="w-14 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-lg font-semibold">{CAMPAIGN.name}</span>
          <span className="block text-sm text-muted">
            {CAMPAIGN.daysLeft} days left · {count(TOTALS.views)} verified views
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
      </Link>

      <h2 className="mt-8 mb-2.5 px-1 text-sm text-muted">Finished</h2>
      <div className="flex items-center gap-4 rounded-[1.25rem] bg-surface p-4 ring-1 ring-line">
        <MiniRing spots={PAST.spots} className="w-14 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-lg font-semibold">{PAST.name}</span>
          <span className="block text-sm text-muted">
            {PAST.when} · {count(PAST.views)} verified views
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
      </div>
    </div>
  );
}
