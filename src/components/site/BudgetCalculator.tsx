"use client";

import { useState } from "react";
import { cn, formatNaira } from "@/lib/cn";
import { MIN_BUDGET, verifiedCampaign, openCampaign } from "@/lib/campaignMath";

const PRESETS = [5000, 20000, 50000, 100000];

type CampaignType = "verified" | "open";

const TYPES: Array<{ id: CampaignType; label: string }> = [
  { id: "verified", label: "Verified" },
  { id: "open", label: "Open" },
];

export default function BudgetCalculator() {
  const [budget, setBudget] = useState(20000);
  const [type, setType] = useState<CampaignType>("verified");

  const tooLow = budget < MIN_BUDGET;
  const verified = verifiedCampaign(budget);
  const open = openCampaign(budget);

  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-surface p-5 sm:p-8 lg:grid-cols-2 lg:gap-10">
      <div className="space-y-6">
        <div>
          <label htmlFor="budget" className="text-sm font-medium text-muted">
            Your budget
          </label>
          <div className="mt-2 flex items-center rounded-xl border border-line bg-page px-4 focus-within:border-signal">
            <span className="font-mono text-xl text-muted">₦</span>
            <input
              id="budget"
              type="number"
              inputMode="numeric"
              min={MIN_BUDGET}
              step={1000}
              value={budget || ""}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="h-14 w-full bg-transparent px-2 font-mono text-2xl outline-none"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setBudget(amount)}
                className={cn(
                  "rounded-full border px-3 py-1.5 font-mono text-sm transition",
                  budget === amount ? "border-ink bg-ink text-page" : "border-line text-muted hover:border-muted"
                )}
              >
                {formatNaira(amount)}
              </button>
            ))}
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-muted">Campaign type</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-page p-1">
            {TYPES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={type === id}
                onClick={() => setType(id)}
                className={cn(
                  "rounded-lg py-2.5 font-heading text-sm font-semibold transition",
                  type === id ? "bg-surface text-ink shadow-sm" : "text-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">
            {type === "verified"
              ? "Only verified creators, a fixed number of spots."
              : "Anyone can join. You pay per 1,000 verified views."}
          </p>
        </fieldset>
      </div>

      <div className="rounded-xl bg-page p-5 sm:p-6" aria-live="polite">
        {tooLow ? (
          <p className="text-warning">The smallest budget is {formatNaira(MIN_BUDGET)}.</p>
        ) : type === "verified" ? (
          <dl className="space-y-4">
            <Row big label="Creator spots" value={verified.spots} />
            <Row label="Paid to creators (70%)" value={formatNaira(verified.creatorMoney)} />
            <Row label="Shared equally per post" value={`${formatNaira(verified.equalPerPost)} each`} />
            <Row label="Shared by verified views" value={formatNaira(verified.viewPool)} />
            <Row label="Our fee (30%)" value={formatNaira(verified.ourFee)} />
          </dl>
        ) : (
          <dl className="space-y-4">
            <Row big label="Verified views you buy" value={open.views.toLocaleString("en-NG")} />
            <Row label="Posts that will share them" value={`${open.minPosts} to ${open.maxPosts}`} />
            <Row label="Paid to creators (₦700 per 1,000)" value={formatNaira(open.creatorMoney)} />
            <Row label="Most one post can earn" value={formatNaira(open.maxPerPost)} />
            <Row label="Our fee (30%)" value={formatNaira(open.ourFee)} />
          </dl>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  label: string;
  value: string | number;
  big?: boolean;
}

function Row({ label, value, big }: RowProps) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", big && "border-b border-line pb-4")}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn("font-mono text-right", big ? "text-3xl" : "text-base")}>{value}</dd>
    </div>
  );
}
