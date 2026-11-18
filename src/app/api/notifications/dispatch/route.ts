import { NextResponse } from "next/server";
import { sendPendingEmails } from "@/lib/notify";
import { getAdminClient, getSessionUser } from "@/lib/supabaseServer";

// POST /api/notifications/dispatch
// Emails notifications the database has just written (a standby spot opened,
// a creator was removed or verified). Any signed-in user may trigger it: it
// only delivers notifications that already exist, each at most once.

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const admin = getAdminClient();
  if (!admin) return NextResponse.json({ error: "Notifications are not configured." }, { status: 500 });

  try {
    const sent = await sendPendingEmails(admin, 100);
    return NextResponse.json({ sent });
  } catch (error) {
    console.error("Notification dispatch:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't send emails right now." }, { status: 502 });
  }
}
