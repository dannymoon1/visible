"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AllCampaignsView from "@/components/campaigns/AllCampaignsView";
import {
  filtersFromParams,
  filtersToQuery,
  loadDiscover,
  type CatalogueFilters,
  type DiscoverData,
} from "@/components/campaigns/discover-data";

// /discover/all — every open campaign with sort, category, budget and social
// filters. The filters live in the URL (?sort=pay&social=TikTok,Instagram).

function AllCampaigns() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const filters = useMemo(() => filtersFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);

  // replace, not push: each tweak shouldn't add a history entry
  const onFiltersChange = useCallback(
    (next: CatalogueFilters) => router.replace(`${pathname}${filtersToQuery(next)}`, { scroll: false }),
    [router, pathname]
  );

  return <AllCampaignsView data={data} loading={loading} filters={filters} onFiltersChange={onFiltersChange} />;
}

// useSearchParams needs a Suspense boundary so the route can still prerender
export default function AllCampaignsPage() {
  return (
    <Suspense fallback={null}>
      <AllCampaigns />
    </Suspense>
  );
}
