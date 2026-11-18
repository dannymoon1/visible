import { NextResponse } from "next/server";
import { sendPendingEmails } from "@/lib/notify";
import { getAdminClient } from "@/lib/supabaseServer";

// GET /api/cron/campaign-starts: runs daily (vercel.json, 07:00 Lagos).
// 1. Verified campaigns whose start date has come: tell every verified
//    creator (once per campaign; notify_verified_campaign sets notified_at).
// 2. Email every notification not yet emailed (catches anything the instant
//    dispatch missed).
// Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.

export const dynamic = "force-dynamic";

function lagosToday() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 10); // UTC+1, no DST
}

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 500 });

  const { data: due, error } = await admin
    .from("tasks")
    .select("id")
    .eq("campaign_type", "verified")
    .eq("status", "active")
    .is("notified_at", null)
    .lte("start_date", lagosToday());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let notified = 0;
  for (const task of due ?? []) {
    const { data: count, error: notifyError } = await admin.rpc("notify_verified_campaign", { p_task_id: task.id });
    if (notifyError) console.error("Notify", task.id, notifyError.message);
    else notified += count ?? 0;
  }

  let emailed = 0;
  try {
    emailed = await sendPendingEmails(admin);
  } catch (e) {
    console.error("Cron email dispatch:", e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ campaigns: due?.length ?? 0, notified, emailed });
}
