"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { taskPlatforms } from "@/components/PlatformIcon";
import { PLATFORMS } from "@/lib/campaignOptions";
import { applyFilters, DEFAULT_FILTERS, type CatalogueFilters, type DiscoverData } from "./discover-data";
import { CampaignGrid, DiscoverEmpty, FilterToolbar, FloatingSearch, GridSkeleton } from "./DiscoverParts";

// All campaigns: the full catalogue with sort, category, budget and social
// filters. Filters arrive from and are written back to the URL by the page,
// so "See all" links, the back button and shared links keep them.

export default function AllCampaignsView({
  data,
  loading,
  filters,
  onFiltersChange,
}: {
  data: DiscoverData | null;
  loading: boolean;
  filters: CatalogueFilters;
  onFiltersChange: (next: CatalogueFilters) => void;
}) {
  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  // Search text is local so typing stays smooth; it's pushed to the URL as it changes
  const [query, setQuery] = useState(filters.q);

  // Only offer platforms that some campaign actually has (plus any already chosen)
  const platforms = useMemo(
    () => PLATFORMS.filter((p) => filters.socials.includes(p) || tasks.some((t) => taskPlatforms(t).includes(p))),
    [tasks, filters.socials]
  );

  const current = { ...filters, q: query };
  const results = useMemo(() => applyFilters(tasks, { ...filters, q: query }), [tasks, filters, query]);
  const filtered =
    query.trim() !== "" ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    filters.type !== "all" ||
    filters.budget !== "any" ||
    filters.socials.length > 0;

  const setSearch = (q: string) => {
    setQuery(q);
    onFiltersChange({ ...filters, q });
  };
  const resetAll = () => {
    setQuery("");
    onFiltersChange(DEFAULT_FILTERS);
  };

  return (
    <div className="min-w-0">
      <Link href="/discover" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Discover
      </Link>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1 animate-fade-in">
        <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-4xl">All campaigns</h1>
        {data && (
          <p className="text-sm text-muted" aria-live="polite">
            <span className="font-mono text-ink">{results.length}</span> of {tasks.length}{" "}
            {tasks.length === 1 ? "campaign" : "campaigns"}
            {query.trim() && <> matching &ldquo;{query.trim()}&rdquo;</>}
          </p>
        )}
      </header>

      {data && tasks.length > 0 && (
        <div className="mb-8">
          <FilterToolbar filters={current} onChange={onFiltersChange} platforms={platforms} />
        </div>
      )}

      {loading ? (
        <GridSkeleton />
      ) : !data ? (
        <DiscoverEmpty title="Couldn't load campaigns" body="Check your connection and refresh the page." />
      ) : tasks.length === 0 ? (
        <DiscoverEmpty title="No open campaigns right now" body="New campaigns are added through the day. Check back soon." />
      ) : results.length === 0 ? (
        <DiscoverEmpty
          title="No campaigns match"
          body="Try fewer filters, another platform or a different search."
          action={
            filtered ? (
              <button
                type="button"
                onClick={resetAll}
                className="text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
              >
                Clear all filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <CampaignGrid tasks={results} joined={data.joined} />
      )}

      <FloatingSearch value={query} onChange={setSearch} />
    </div>
  );
}
