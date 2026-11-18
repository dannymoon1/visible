"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Search, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, EmptyState, PageHeader, PageLoader, StatCard, TableWrap, cn, tableClasses } from "@/components/ui";
import type { Profile } from "@/lib/types";

// Verified creators (decided 2026-11-18): admins switch creators on here.
// Only verified creators can join verified campaigns. The full per-platform
// checks in CLAUDE.md (followers, views, account age, ID) can replace this.

type Row = Pick<Profile, "id" | "username" | "email" | "created_at" | "is_verified_creator" | "is_admin"> & {
  approved: number;
  posts: number;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "verified", label: "Verified" },
  { key: "unverified", label: "Not verified" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

export default function AdminCreatorsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user?.id ?? "").maybeSingle();
      if (!me?.is_admin) {
        window.location.href = "/dashboard";
        return;
      }

      const [profilesRes, subsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, email, created_at, is_verified_creator, is_admin")
          .order("created_at", { ascending: false }),
        supabase.from("submissions").select("user_id, status"),
      ]);
      if (profilesRes.error) {
        toast.error(profilesRes.error.message);
        return;
      }

      const posts = new Map<string, { posts: number; approved: number }>();
      subsRes.data?.forEach((s) => {
        if (!s.user_id) return;
        const c = posts.get(s.user_id) ?? { posts: 0, approved: 0 };
        c.posts += 1;
        if (s.status === "approved" || s.status === "paid") c.approved += 1;
        posts.set(s.user_id, c);
      });

      if (!cancelled) {
        setRows(
          (profilesRes.data ?? []).map((p) => ({ ...p, posts: posts.get(p.id)?.posts ?? 0, approved: posts.get(p.id)?.approved ?? 0 }))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (filter === "all" || (filter === "verified") === r.is_verified_creator) &&
        (!q || [r.username, r.email].some((v) => v?.toLowerCase().includes(q)))
    );
  }, [rows, query, filter]);

  const toggle = async (row: Row) => {
    const next = !row.is_verified_creator;
    setSavingId(row.id);
    const { error } = await supabase.rpc("set_creator_verified", { p_user_id: row.id, p_verified: next });
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((cur) => cur?.map((r) => (r.id === row.id ? { ...r, is_verified_creator: next } : r)) ?? null);
    const name = row.username ? `@${row.username}` : row.email || "Creator";
    toast.success(next ? `${name} is now a verified creator. We've let them know.` : `${name} is no longer verified.`);
  };

  if (!rows) return <PageLoader label="Loading creators" />;

  const verifiedCount = rows.filter((r) => r.is_verified_creator).length;

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Creators"
        description="Switch on Verified creator for people you trust. Only verified creators can join verified campaigns; they're emailed when one starts."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Creators" value={rows.length} icon={Users} tone="neutral" />
        <StatCard label="Verified" value={verifiedCount} icon={BadgeCheck} tone="success" />
        <StatCard label="With an approved post" value={rows.filter((r) => r.approved > 0).length} icon={BadgeCheck} tone="brand" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 px-6 py-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <label htmlFor="creator-search" className="sr-only">
              Search creators
            </label>
            <input
              id="creator-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by username or email"
              className="h-10 w-full rounded-xl border border-ink-200 pr-3 pl-9 text-sm outline-none focus:border-ink-400"
            />
          </div>
          <div className="flex gap-1 rounded-full border border-ink-200 p-1" role="tablist" aria-label="Filter creators">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "h-8 rounded-full px-3 text-sm font-medium",
                  filter === f.key ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <EmptyState icon={Users} title="No creators match" description="Try another name or filter." />
        ) : (
          <TableWrap>
            <table className={tableClasses.table}>
              <thead className={tableClasses.thead}>
                <tr>
                  <th className={tableClasses.th}>Creator</th>
                  <th className={tableClasses.th}>Joined</th>
                  <th className={cn(tableClasses.th, "text-right")}>Posts</th>
                  <th className={cn(tableClasses.th, "text-right")}>Approved</th>
                  <th className={cn(tableClasses.th, "text-right")}>Verified creator</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className={tableClasses.tr}>
                    <td className={tableClasses.td}>
                      <p className="flex items-center gap-1.5 font-medium text-ink-900">
                        {r.username ? `@${r.username}` : "No username"}
                        {r.is_verified_creator && <BadgeCheck className="h-4 w-4 text-emerald-600" aria-label="Verified" />}
                        {r.is_admin && <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600">Admin</span>}
                      </p>
                      <p className="text-xs text-ink-400">{r.email}</p>
                    </td>
                    <td className={cn(tableClasses.td, "text-ink-500")}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className={cn(tableClasses.td, "text-right font-mono")}>{r.posts}</td>
                    <td className={cn(tableClasses.td, "text-right font-mono")}>{r.approved}</td>
                    <td className={cn(tableClasses.td, "text-right")}>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={r.is_verified_creator}
                        aria-label={`Verified creator: ${r.username ?? r.email ?? "creator"}`}
                        disabled={savingId === r.id}
                        onClick={() => toggle(r)}
                        className={cn(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60",
                          r.is_verified_creator ? "bg-emerald-600" : "bg-ink-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                            r.is_verified_creator ? "translate-x-5" : "translate-x-0.5"
                          )}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
