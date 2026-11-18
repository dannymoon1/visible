import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Server only (uses the service-role client): import from API routes, never
// from client components.
//
// Emails every notification that hasn't been emailed yet, then marks it sent.
// Notifications themselves are written by the database (join/leave/remove,
// verified launches), so this only delivers them. Safe to call often: each
// notification is emailed at most once.
//
// Env: RESEND_API_KEY (required to send), RESEND_FROM (a sender on a verified
// domain; defaults to Resend's test sender), NEXT_PUBLIC_SITE_URL (links).

const BATCH = 100; // Resend's batch limit

export async function sendPendingEmails(admin: SupabaseClient<Database>, max = 500): Promise<number> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY is not set; notifications stay in-app only.");
    return 0;
  }

  const { data: pending, error } = await admin
    .from("notifications")
    .select("id, user_id, title, body, link")
    .is("emailed_at", null)
    .order("created_at")
    .limit(max);
  if (error) throw new Error(error.message);
  if (!pending?.length) return 0;

  const userIds = [...new Set(pending.map((n) => n.user_id))];
  const { data: people } = await admin.from("profiles").select("id, email").in("id", userIds);
  const emailOf = new Map((people ?? []).map((p) => [p.id, p.email]));

  const resend = new Resend(key);
  const from = process.env.RESEND_FROM || "Visibility Campaigns <onboarding@resend.dev>";
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://visibilitycampaigns.com").replace(/\/$/, "");
  let sent = 0;

  for (let i = 0; i < pending.length; i += BATCH) {
    const chunk = pending.slice(i, i + BATCH);
    const withEmail = chunk.filter((n) => emailOf.get(n.user_id));

    if (withEmail.length) {
      const { error: sendError } = await resend.batch.send(
        withEmail.map((n) => ({
          from,
          to: emailOf.get(n.user_id)!, // filtered above
          subject: n.title,
          html: emailHtml(n.title, n.body, n.link ? `${site}${n.link}` : site),
        }))
      );
      // Leave them pending so the next run retries
      if (sendError) throw new Error(sendError.message);
      sent += withEmail.length;
    }

    // Mark the whole chunk, including people with no email address
    await admin
      .from("notifications")
      .update({ emailed_at: new Date().toISOString() })
      .in(
        "id",
        chunk.map((n) => n.id)
      );
  }

  return sent;
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function emailHtml(title: string, body: string | null, url: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F7F7F5;font-family:Arial,Helvetica,sans-serif;color:#14161A">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <p style="margin:0 0 24px;font-weight:bold;font-size:15px">Visibility Campaigns</p>
  <div style="background:#FFFFFF;border:1px solid #E3E4E8;border-radius:20px;padding:28px">
    <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25">${escape(title)}</h1>
    ${body ? `<p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5E6470">${escape(body)}</p>` : ""}
    <a href="${escape(url)}" style="display:inline-block;background:#FF6A1A;color:#14161A;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">Open in the app</a>
  </div>
  <p style="margin:20px 0 0;font-size:12px;color:#5E6470">You're getting this because you have a Visibility Campaigns account.</p>
</div></body></html>`;
}
