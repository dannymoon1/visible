import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import CampaignTabs from "@/components/app/CampaignTabs";
import { LivePill } from "@/components/app/parts";
import { BASE, CAMPAIGN } from "@/lib/demo/adiaha";

export default function CampaignLayout({ children }: { children: ReactNode }) {
  const base = `${BASE}/campaigns/${CAMPAIGN.id}`;
  return (
    <div>
      <Link href={`${BASE}/campaigns`} className="-ml-1 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Campaigns
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-[1.9rem] leading-[1.05] font-semibold tracking-[-0.025em] sm:text-[2.4rem]">
            {CAMPAIGN.name}
          </h1>
          <p className="mt-1 text-muted">
            Started {CAMPAIGN.startedAgo} · Goal: {CAMPAIGN.goal.toLowerCase()}
          </p>
        </div>
        <LivePill daysLeft={CAMPAIGN.daysLeft} />
      </div>
      <CampaignTabs base={base} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
