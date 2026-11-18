"use client";

import { useEffect, useState } from "react";
import DiscoverView from "@/components/campaigns/DiscoverView";
import { loadDiscover, type DiscoverData } from "@/components/campaigns/discover-data";

export default function DiscoverPage() {
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

  return <DiscoverView data={data} loading={loading} />;
}
