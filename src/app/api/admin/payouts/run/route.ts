import { NextResponse } from "next/server";
import { getAdminClient, getSessionUser } from "@/lib/supabaseServer";
import { lagosDate } from "@/lib/pricing";
import { nextPayoutDate } from "@/lib/payouts";
import { buildRun, earnedByFor, type Bank, type RunCreator, type RunPost } from "@/lib/payoutRun";

// GET /api/admin/payouts/run?payday=2026-12-05 — the monthly payout run for
// admins (/admin/payouts/run). Server-side because payout bank details live in
// each account's metadata, which only the service role can read.
// Rules and maths: src/lib/payoutRun.ts.

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

function str(meta: Record<string, unknown>, key: string): string {
  return typeof meta[key] === "string" ? (meta[key] as string).trim() : "";
}

export async function GET(req: Request): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401, headers: NO_STORE });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 500, headers: NO_STORE });

  const { data: me } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403, headers: NO_STORE });

  const asked = new URL(req.url).searchParams.get("payday");
  const payday = asked && /^\d{4}-\d{2}-05$/.test(asked) ? asked : nextPayoutDate().toISOString().slice(0, 10);
  const through = earnedByFor(payday);

  // Approved posts on version-2 campaigns. Posts approved after the "earned by"
  // date still show, as not due yet, so nothing is missed.
  const { data: subs, error: subsError } = await admin
    .from("submissions")
    .select(
      "id, user_id, task_id, created_at, verified_views, post_url, post_platform, tasks!inner(id, title, campaign_type, post_rate, view_rate, view_floor, max_view_payout, view_pool, end_date, pricing_version)"
    )
    .eq("status", "approved")
    .eq("tasks.pricing_version", 2);
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500, headers: NO_STORE });

  const posts: RunPost[] = (subs ?? [])
    .filter((s) => s.user_id && s.task_id && s.tasks)
    .map((s) => {
      const t = s.tasks!;
      return {
        id: s.id,
        userId: s.user_id!,
        taskId: s.task_id!,
        taskTitle: t.title,
        campaignType: t.campaign_type === "verified" ? "verified" : "open",
        postRate: Number(t.post_rate) || 0,
        viewRate: Number(t.view_rate) || 0,
        viewFloor: Number(t.view_floor) || 0,
        maxViewPayout: Number(t.max_view_payout) || 0,
        viewPool: Number(t.view_pool) || 0,
        endDate: t.end_date ?? payday,
        postedOn: lagosDate(new Date(s.created_at)),
        views: s.verified_views,
        postUrl: s.post_url,
        platform: s.post_platform,
      };
    });

  // Everyone with a post here, or money credited by older campaigns
  const ids = [...new Set(posts.map((p) => p.userId))];
  const [withPosts, withBalance] = await Promise.all([
    ids.length
      ? admin.from("profiles").select("id, username, email, balance, is_verified_creator").in("id", ids)
      : Promise.resolve({ data: [], error: null }),
    admin.from("profiles").select("id, username, email, balance, is_verified_creator").gt("balance", 0),
  ]);
  if (withPosts.error || withBalance.error) {
    return NextResponse.json({ error: (withPosts.error ?? withBalance.error)!.message }, { status: 500, headers: NO_STORE });
  }
  const profiles = new Map([...(withPosts.data ?? []), ...(withBalance.data ?? [])].map((p) => [p.id, p]));

  const creators: RunCreator[] = await Promise.all(
    [...profiles.values()].map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      const meta: Record<string, unknown> = data.user?.user_metadata ?? {};
      const bank: Bank | null =
        str(meta, "bank_name") && str(meta, "account_number") && str(meta, "account_name")
          ? { bankName: str(meta, "bank_name"), accountNumber: str(meta, "account_number"), accountName: str(meta, "account_name") }
          : null;
      return {
        id: p.id,
        handle: p.username,
        name: str(meta, "full_name") || str(meta, "first_name"),
        email: p.email,
        verified: p.is_verified_creator,
        balance: Number(p.balance) || 0,
        bank,
      };
    })
  );

  return NextResponse.json(buildRun(posts, creators, through, payday), { headers: NO_STORE });
}
