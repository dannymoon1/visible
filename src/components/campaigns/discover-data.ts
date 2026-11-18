import { supabase } from "@/lib/supabase";
import { getSocialAccounts } from "@/components/ConnectAccounts";
import { campaignProgress } from "@/components/CampaignProgress";
import { taskPlatforms } from "@/components/PlatformIcon";
import type { Task } from "@/lib/types";
import { campaignTypeOf, isOpenCampaign } from "./campaign-utils";

// Data and catalogue rules shared by Discover (/discover) and All campaigns
// (/discover/all).

export interface DiscoverData {
  tasks: Task[];
  joined: Set<string>;
  myPlatforms: string[];
  loadedAt: number;
}

export async function loadDiscover(): Promise<DiscoverData | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [tasksRes, subsRes] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("submissions").select("task_id").eq("user_id", user.id),
  ]);

  if (tasksRes.error) {
    console.error("Discover: tasks", tasksRes.error);
    return null;
  }

  const joined = new Set<string>();
  subsRes.data?.forEach((s) => s.task_id && joined.add(s.task_id));

  return {
    tasks: (tasksRes.data ?? []).filter(isOpenCampaign),
    joined,
    myPlatforms: Object.keys(getSocialAccounts(user)),
    loadedAt: Date.now(),
  };
}

// ---------------------------------------------------------
// Sort and filter options (keys are what the URL carries)

export const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "newest", label: "Newest" },
  { key: "pay", label: "Highest pay per post" },
  { key: "budget", label: "Biggest budget" },
  { key: "spots", label: "Most spots left" },
  { key: "closing", label: "Closing soon" },
] as const;
export type SortKey = (typeof SORTS)[number]["key"];

export const BUDGETS = [
  { key: "any", label: "Any", min: 0, max: Infinity },
  { key: "u10", label: "Under ₦10K", min: 0, max: 10_000 },
  { key: "10-50", label: "₦10K – ₦50K", min: 10_000, max: 50_000 },
  { key: "50-200", label: "₦50K – ₦200K", min: 50_000, max: 200_000 },
  { key: "200", label: "₦200K and up", min: 200_000, max: Infinity },
] as const;
export type BudgetKey = (typeof BUDGETS)[number]["key"];

export const budgetOf = (t: Task) => campaignProgress(t)?.budget ?? (Number(t.amount_paid) || 0);
const spotsLeftOf = (t: Task) => campaignProgress(t)?.spotsLeft ?? Infinity;
const fillOf = (t: Task) => {
  const p = campaignProgress(t);
  return p && p.max ? p.spotsLeft / p.max : 1;
};

export const SORTERS: Record<Exclude<SortKey, "recommended">, (a: Task, b: Task) => number> = {
  newest: (a, b) => b.created_at.localeCompare(a.created_at),
  pay: (a, b) => (Number(b.reward) || 0) - (Number(a.reward) || 0),
  budget: (a, b) => budgetOf(b) - budgetOf(a),
  spots: (a, b) => spotsLeftOf(b) - spotsLeftOf(a),
  closing: (a, b) => fillOf(a) - fillOf(b),
};

export const TYPES = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "verified", label: "Verified" },
] as const;
export type TypeKey = (typeof TYPES)[number]["key"];

export interface CatalogueFilters {
  q: string;
  sort: SortKey;
  type: TypeKey;
  budget: BudgetKey;
  socials: string[];
}

export const DEFAULT_FILTERS: CatalogueFilters = { q: "", sort: "recommended", type: "all", budget: "any", socials: [] };

const matchesQuery = (task: Task, q: string) =>
  [task.title, task.description, ...taskPlatforms(task)]
    .filter(Boolean)
    .some((field) => String(field).toLowerCase().includes(q));

export function applyFilters(tasks: Task[], f: CatalogueFilters): Task[] {
  const q = f.q.trim().toLowerCase();
  const range = BUDGETS.find((b) => b.key === f.budget) ?? BUDGETS[0];
  const list = tasks.filter(
    (t) =>
      (!q || matchesQuery(t, q)) &&
      (f.type === "all" || campaignTypeOf(t) === f.type) &&
      (f.budget === "any" || (budgetOf(t) >= range.min && budgetOf(t) < range.max)) &&
      (f.socials.length === 0 || taskPlatforms(t).some((p) => f.socials.includes(p)))
  );
  return f.sort === "recommended" ? list : [...list].sort(SORTERS[f.sort]);
}

// URL <-> filters. Unknown values fall back to the defaults.
export function filtersFromParams(params: URLSearchParams): CatalogueFilters {
  const sort = params.get("sort");
  const budget = params.get("budget");
  const type = params.get("type");
  return {
    q: params.get("q") ?? "",
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "recommended",
    type: TYPES.some((t) => t.key === type) ? (type as TypeKey) : "all",
    budget: BUDGETS.some((b) => b.key === budget) ? (budget as BudgetKey) : "any",
    socials: (params.get("social") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  };
}

export function filtersToQuery(f: CatalogueFilters): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.sort !== "recommended") params.set("sort", f.sort);
  if (f.type !== "all") params.set("type", f.type);
  if (f.budget !== "any") params.set("budget", f.budget);
  if (f.socials.length) params.set("social", f.socials.join(","));
  const s = params.toString();
  return s ? `?${s}` : "";
}

export const allCampaignsHref = (f: Partial<CatalogueFilters> = {}) =>
  `/discover/all${filtersToQuery({ ...DEFAULT_FILTERS, ...f })}`;
