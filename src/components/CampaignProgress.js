"use client";

import { formatNaira, cn } from "@/components/ui";

// Budget progress for a campaign: approved engagements out of the spots
// the budget pays for. Renders nothing for older uncapped tasks.
export function campaignProgress(task) {
  const max = Number(task?.max_participants) || 0;
  if (!max) return null;

  const approved = Math.min(Number(task.approved_count) || 0, max);
  const budget = Number(task.amount_paid) || max * Number(task.reward || 0);
  const spent = Number(task.budget_spent) || approved * Number(task.reward || 0);

  return {
    approved,
    max,
    spotsLeft: max - approved,
    budget,
    spent,
    percent: Math.round((approved / max) * 100),
    completed: task.status === "completed" || approved >= max,
  };
}

export default function CampaignProgress({ task, compact = false, className }) {
  const p = campaignProgress(task);
  if (!p) return null;

  const barColor = p.completed
    ? "bg-emerald-500"
    : p.percent >= 80
    ? "bg-gradient-to-r from-gold-400 to-gold-500"
    : "bg-gradient-to-r from-brand-500 to-brand-600";

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold text-ink-700">
          {p.completed ? (
            <span className="text-emerald-600">Campaign completed</span>
          ) : (
            <>
              <span className="tabular">{p.approved}</span> of{" "}
              <span className="tabular">{p.max}</span> spots filled
            </>
          )}
        </span>
        <span className="tabular font-medium text-ink-400">{p.percent}%</span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={p.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${p.approved} of ${p.max} spots filled`}
        className={cn("w-full overflow-hidden rounded-full bg-ink-100", compact ? "h-1.5" : "h-2")}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", barColor)}
          style={{ width: `${Math.max(p.percent, p.approved > 0 ? 3 : 0)}%` }}
        />
      </div>

      {!compact && (
        <p className="tabular mt-1.5 text-xs text-ink-400">
          {formatNaira(p.spent)} of {formatNaira(p.budget)} budget used
          {!p.completed && ` · ${p.spotsLeft} ${p.spotsLeft === 1 ? "spot" : "spots"} left`}
        </p>
      )}
    </div>
  );
}
