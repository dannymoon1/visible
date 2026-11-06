"use client";

import { useState, useEffect } from "react";
import { Trophy, Crown, Medal, Users, Wallet, CircleCheckBig, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { platformIcon } from "@/components/PlatformIcon";
import {
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  Badge,
  EmptyState,
  PageLoader,
  TableWrap,
  tableClasses,
  formatNaira,
  cn,
} from "@/components/ui";

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "month", label: "Last 30 days" },
  { value: "week", label: "Last 7 days" },
];

const LIMIT = 50;

// Podium styles for ranks 1–3
const PODIUM = {
  1: { icon: Crown, ring: "ring-gold-400", badge: "bg-gradient-to-br from-gold-400 to-gold-500 text-white", label: "1st" },
  2: { icon: Medal, ring: "ring-ink-300", badge: "bg-gradient-to-br from-ink-300 to-ink-400 text-white", label: "2nd" },
  3: { icon: Medal, ring: "ring-amber-600/50", badge: "bg-gradient-to-br from-amber-600 to-amber-700 text-white", label: "3rd" },
};

// Ranked creators for a period. Only public-safe fields come back
// (see supabase/migrations/20261029_leaderboard.sql).
async function fetchLeaderboard(period) {
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_period: period,
    p_limit: LIMIT,
  });

  if (error) {
    console.error("Leaderboard loading error:", error);
    // PGRST202 / 42883: the function hasn't been created yet
    const missing = error.code === "PGRST202" || error.code === "42883";
    return { rows: [], error: missing ? "missing" : error.message };
  }

  return { rows: data || [], error: null };
}

function relativeDate(iso) {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function LeaderboardPage() {
  const [period, setPeriod] = useState("all");
  // Keyed by period so switching tabs shows the loader until fresh data arrives
  const [result, setResult] = useState({ period: null, rows: [], error: null });

  useEffect(() => {
    let cancelled = false;

    fetchLeaderboard(period).then((data) => {
      if (!cancelled) setResult({ period, ...data });
    });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const loading = result.period !== period;
  const ranked = result.rows.filter((row) => row.rank <= LIMIT);
  const me = result.rows.find((row) => row.is_me);
  const podium = ranked.filter((row) => row.rank <= 3).slice(0, 3);

  const totalEarnings = ranked.reduce((sum, row) => sum + Number(row.total_earnings || 0), 0);
  const totalPosts = ranked.reduce((sum, row) => sum + Number(row.approved_posts || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Community"
        title="Leaderboard"
        description="Top creators ranked by their total approved earnings."
        actions={
          <div className="inline-flex rounded-xl border border-ink-200 bg-white p-1 shadow-soft" role="tablist">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                role="tab"
                aria-selected={period === p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "rounded-lg px-3.5 py-1.5 text-sm font-semibold transition",
                  period === p.value
                    ? "bg-ink-950 text-white shadow-soft"
                    : "text-ink-500 hover:text-ink-900"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <PageLoader label="Loading leaderboard" />
      ) : result.error ? (
        <Card>
          <EmptyState
            icon={Trophy}
            title={result.error === "missing" ? "Leaderboard isn't set up yet" : "Couldn't load the leaderboard"}
            description={
              result.error === "missing"
                ? "Run supabase/migrations/20261029_leaderboard.sql in the Supabase SQL Editor."
                : result.error
            }
          />
        </Card>
      ) : ranked.length === 0 ? (
        <Card>
          <EmptyState
            icon={Trophy}
            title="No rankings yet"
            description="Creators appear here once their first post is approved. Yours could be first."
          />
        </Card>
      ) : (
        <div className="space-y-8 animate-fade-in">
          {/* ============ YOUR RANK ============ */}
          {me && (
            <Card className="relative overflow-hidden border-brand-200 bg-gradient-to-r from-brand-50 to-white p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="tabular flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 font-display text-lg font-semibold text-white shadow-brand">
                    #{me.rank}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Your rank</p>
                    <p className="font-semibold text-ink-900">
                      {me.rank === 1
                        ? "You're the top creator. Keep it up!"
                        : `${me.rank - 1} ${me.rank - 1 === 1 ? "creator" : "creators"} ahead of you`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-8">
                  <MiniStat label="Approved posts" value={me.approved_posts} />
                  <MiniStat label="Earned" value={formatNaira(me.total_earnings)} highlight />
                </div>
              </div>
            </Card>
          )}

          {/* ============ PODIUM ============ */}
          <div className="grid gap-4 md:grid-cols-3">
            {podium.map((row) => (
              <PodiumCard key={`${row.rank}-${row.display_name}`} row={row} />
            ))}
          </div>

          {/* ============ STATS ============ */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Ranked creators" value={ranked.length} icon={Users} tone="brand" hint="With at least 1 approved post" />
            <StatCard label="Approved posts" value={totalPosts} icon={CircleCheckBig} tone="success" hint="Across ranked creators" />
            <StatCard label="Total earned" value={formatNaira(totalEarnings)} icon={Wallet} tone="gold" hint="Paid out to ranked creators" />
          </div>

          {/* ============ FULL TABLE ============ */}
          <Card className="overflow-hidden">
            <CardHeader
              title="Rankings"
              description={`Top ${Math.min(ranked.length, LIMIT)} creators · ${PERIODS.find((p) => p.value === period).label.toLowerCase()}`}
            />
            <TableWrap>
              <table className={cn(tableClasses.table, "min-w-[760px]")}>
                <thead className={tableClasses.thead}>
                  <tr>
                    <th className={cn(tableClasses.th, "w-16")}>Rank</th>
                    <th className={tableClasses.th}>Creator</th>
                    <th className={cn(tableClasses.th, "text-right")}>Approved posts</th>
                    <th className={cn(tableClasses.th, "text-right")}>Approval rate</th>
                    <th className={cn(tableClasses.th, "text-right")}>Campaigns</th>
                    <th className={tableClasses.th}>Platforms</th>
                    <th className={tableClasses.th}>Last approved</th>
                    <th className={cn(tableClasses.th, "text-right")}>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr
                      key={`${row.rank}-${row.display_name}-${row.username}`}
                      className={cn(tableClasses.tr, row.is_me && "bg-brand-50/60")}
                    >
                      <td className={tableClasses.td}>
                        <RankBadge rank={row.rank} />
                      </td>
                      <td className={tableClasses.td}>
                        <div className="flex items-center gap-3">
                          <Avatar name={row.display_name} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-semibold text-ink-900">
                              <span className="truncate">{row.display_name}</span>
                              {row.is_me && <Badge tone="brand">You</Badge>}
                            </p>
                            {row.username && (
                              <p className="truncate text-xs text-ink-400">@{row.username}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={cn(tableClasses.td, "tabular text-right font-medium text-ink-800")}>
                        {row.approved_posts}
                      </td>
                      <td className={cn(tableClasses.td, "text-right")}>
                        <ApprovalRate value={row.approval_rate} />
                      </td>
                      <td className={cn(tableClasses.td, "tabular text-right text-ink-700")}>
                        {row.campaigns}
                      </td>
                      <td className={tableClasses.td}>
                        <PlatformIcons platforms={row.platforms} />
                      </td>
                      <td className={cn(tableClasses.td, "whitespace-nowrap text-ink-500")}>
                        {relativeDate(row.last_approved_at)}
                      </td>
                      <td className={cn(tableClasses.td, "tabular whitespace-nowrap text-right font-semibold text-emerald-600")}>
                        {formatNaira(row.total_earnings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------

function PodiumCard({ row }) {
  const style = PODIUM[row.rank] || PODIUM[3];
  const Icon = style.icon;

  return (
    <Card
      className={cn(
        "relative overflow-hidden p-6 text-center ring-2 transition-all hover:shadow-lifted",
        style.ring,
        row.rank === 1 && "md:-translate-y-2"
      )}
    >
      {row.rank === 1 && (
        <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-gold-100 blur-3xl" />
      )}
      <div className="relative">
        <span className={cn("mx-auto flex h-10 w-10 items-center justify-center rounded-full shadow-soft", style.badge)}>
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">{style.label}</p>

        <div className="mt-4 flex justify-center">
          <Avatar name={row.display_name} size="lg" />
        </div>
        <p className="mt-3 flex items-center justify-center gap-2 font-semibold text-ink-900">
          <span className="truncate">{row.display_name}</span>
          {row.is_me && <Badge tone="brand">You</Badge>}
        </p>
        {row.username && <p className="truncate text-xs text-ink-400">@{row.username}</p>}

        <p className="tabular mt-4 font-display text-3xl font-semibold tracking-tight text-emerald-600">
          {formatNaira(row.total_earnings)}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {row.approved_posts} approved {Number(row.approved_posts) === 1 ? "post" : "posts"} ·{" "}
          {row.campaigns} {Number(row.campaigns) === 1 ? "campaign" : "campaigns"}
        </p>
        <div className="mt-3 flex justify-center">
          <PlatformIcons platforms={row.platforms} />
        </div>
      </div>
    </Card>
  );
}

function RankBadge({ rank }) {
  const style = PODIUM[rank];
  if (style) {
    return (
      <span className={cn("tabular flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-soft", style.badge)}>
        {rank}
      </span>
    );
  }
  return <span className="tabular pl-2.5 font-semibold text-ink-500">{rank}</span>;
}

function Avatar({ name, size = "md" }) {
  const initial = String(name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 font-semibold text-white shadow-soft",
        size === "lg" ? "h-16 w-16 text-2xl" : "h-9 w-9 text-sm"
      )}
    >
      {initial}
    </span>
  );
}

function ApprovalRate({ value }) {
  if (value === null || value === undefined) return <span className="text-ink-300">—</span>;
  const rate = Number(value);
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 font-medium",
        rate >= 80 ? "text-emerald-600" : rate >= 50 ? "text-amber-600" : "text-red-600"
      )}
    >
      {rate >= 80 && <TrendingUp className="h-3.5 w-3.5" />}
      {rate}%
    </span>
  );
}

function PlatformIcons({ platforms }) {
  if (!platforms?.length) return <span className="text-xs text-ink-300">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {platforms.map((name) => {
        const Icon = platformIcon(name);
        return (
          <span
            key={name}
            title={name}
            className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-100 text-ink-600"
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="sr-only">{name}</span>
          </span>
        );
      })}
    </span>
  );
}

function MiniStat({ label, value, highlight }) {
  return (
    <div className="text-right">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className={cn("tabular font-display text-xl font-semibold", highlight ? "text-emerald-600" : "text-ink-900")}>
        {value}
      </p>
    </div>
  );
}
