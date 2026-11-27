import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { sendPendingEmails } from "@/lib/notify";
import {
  type Platform,
  PLATFORMS,
  BRIEF_MAX,
  LANGUAGES,
  CAMPAIGN_TYPES,
  NAME_MAX,
  MAX_REFERENCE_LINKS,
  type CampaignType,
} from "@/lib/campaignOptions";
import { END_DAYS, PRICING_VERSION, addDays, daysBetween, lagosDate, planCampaign, type Plan } from "@/lib/pricing";
import { isContactType, normalizeContact, type ContactType } from "@/lib/campaignContact";
import { checkPlace, placeColumns, type Place } from "@/lib/campaignPlaces";

// Creates a campaign ONLY after Paystack confirms the payment.
// The budget is what Paystack actually received, never a number from the
// browser, and each payment reference can fund exactly one campaign.
//
// Pricing version 2 (decided 2026-11-22 to 24; plan: docs/plans/pricing-and-pay.md, step A6).
// The browser sends only the brand's inputs: type, budget, rates and the most
// a post can earn from views. The server works out spots, shares and the fee
// with src/lib/pricing.ts, fixes the fee by when Paystack recorded the
// payment, and only saves when Paystack received at least budget + fee.
//
// No admin review (decided 2026-11-24, built 2026-11-28): a campaign whose
// brand confirmed our rules in the Review step is saved live ('active') and
// shown to creators from its start date. Admins are told, so they can pause
// or remove one that breaks the rules. Without the confirmation (an old
// browser tab) it waits for an admin instead, rather than refusing a payment.
interface Campaign {
  campaignName: string;
  description: string;
  platforms: Platform[];
  // Where customers are (screen 5): a Nigerian city or state, or anywhere
  place: Place;
  languages: string[];
  referenceLinks: string[];
  // How customers reach the business (screen 4, decided 2026-11-25)
  contactType: ContactType;
  contactValue: string;
  startDate: string;
  // Last day creators can post, 7 to 30 days after the start (plan A3)
  endDate: string;
  bannerUrl: string | null;
  campaignType: CampaignType;
  // The brand's pay inputs; everything else is worked out from these
  budget: number;
  postRate: number;
  viewRate: number;
  maxViewPayout: number;
  // Ticked "This campaign follows the rules" in the Review step
  rulesAccepted: boolean;
}

type SanitizeResult = { campaign: Campaign; error?: undefined } | { campaign?: undefined; error: string };

// Paystack's transaction object is untrusted JSON; fields are read with prop()
type PaystackResult = { data: unknown; error?: undefined } | { data?: undefined; error: string };

type AdminClient = SupabaseClient<Database>;

interface SavedTask {
  id: string;
  created_by: string | null;
  amount_paid: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// value[key] for objects, undefined otherwise (like optional chaining on JSON)
function prop(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // 1. Who is asking (middleware skips /api routes, so check here)
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    if (!process.env.PAYSTACK_SECRET_KEY || !process.env.SUPABASE_SECRET_KEY) {
      console.error("PAYSTACK_SECRET_KEY or SUPABASE_SECRET_KEY is missing.");
      return NextResponse.json({ error: "Campaign service is not configured." }, { status: 500 });
    }

    const body: unknown = await req.json();
    // A null body threw on property access before; keep that 500 path
    if (body === null) throw new TypeError("Invalid request body");
    const reference = String(prop(body, "reference") || "").trim();
    if (!reference || reference.length > 100) {
      return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
    }

    // 2. Validate the campaign before touching Paystack
    const { campaign, error: invalid } = sanitizeCampaign(prop(body, "campaign"), user.id);
    if (invalid !== undefined) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    // A missing URL makes createClient throw (caught below), as before
    const admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY
    );

    // 3. Already saved? (Paystack's callback can fire twice; retries are safe)
    const existing = await findByReference(admin, reference);
    if (existing) return alreadySaved(existing, user.id);

    // 4. Ask Paystack what really happened
    const payment = await verifyWithPaystack(reference);
    if (payment.error !== undefined) {
      return NextResponse.json({ error: payment.error }, { status: 402 });
    }

    const { data } = payment;
    if (String(prop(prop(data, "customer"), "email") || "").toLowerCase() !== String(user.email || "").toLowerCase()) {
      return NextResponse.json({ error: "This payment was made by a different account." }, { status: 403 });
    }
    const paidBy = prop(prop(data, "metadata"), "user_id");
    if (paidBy && paidBy !== user.id) {
      return NextResponse.json({ error: "This payment was made by a different account." }, { status: 403 });
    }

    // 5. Work out the plan again, with the fee fixed by when Paystack recorded
    //    the payment (a payment at 23:59 on 31 January keeps the launch fee),
    //    and check Paystack received at least budget + fee (it reports kobo)
    const paidAtRaw = String(prop(data, "paid_at") || prop(data, "paidAt") || "");
    const paidAt = Number.isNaN(Date.parse(paidAtRaw)) ? new Date() : new Date(paidAtRaw);
    const plan = planFor(campaign, paidAt);
    if (plan.errors.length) {
      return NextResponse.json({ error: plan.errors[0]?.message ?? "Check the budget and rates." }, { status: 400 });
    }
    const amountPaid = Number(prop(data, "amount")) / 100;
    if (!(amountPaid >= plan.total)) {
      return NextResponse.json(
        {
          error: `This campaign costs ₦${plan.total.toLocaleString("en-NG")} (₦${plan.budget.toLocaleString("en-NG")} budget + ₦${plan.fee.toLocaleString("en-NG")} fee); the payment was ₦${amountPaid.toLocaleString("en-NG")}.`,
        },
        { status: 400 }
      );
    }

    // 6. Save. The unique index on payment_reference stops double-spending
    //    even if two requests race past step 3. The database also checks the
    //    version-2 terms add up (migration 20261124000000_campaign_pricing).
    const verified = campaign.campaignType === "verified";
    const status = campaign.rulesAccepted ? "active" : "pending_review";
    const { data: task, error } = await admin
      .from("tasks")
      .insert({
        title: campaign.campaignName,
        // The campaign brief (content type and content details were retired 2026-11-18)
        description: campaign.description,
        campaign_type: campaign.campaignType,
        // Pay terms, version 2. reward stays empty so the old approval can't
        // pay these posts (step B1 adds version-2 earning)
        pricing_version: PRICING_VERSION,
        pay_model: verified ? "post_and_views" : "per_1k_views",
        budget: plan.budget,
        fee_rate: plan.feeRate,
        fee_amount: plan.fee,
        post_rate: verified ? plan.postRate : null,
        view_rate: plan.viewRate,
        view_floor: plan.viewFloor,
        max_view_payout: plan.maxViewPayout,
        post_pool: plan.postPool,
        view_pool: plan.viewPool,
        // Verified: the spots. Open: no fixed number
        max_participants: verified ? plan.spots : null,
        // Kept for older screens that read a single platform
        platform: campaign.platforms.join(", "),
        platforms: campaign.platforms,
        ...placeColumns(campaign.place),
        languages: campaign.languages,
        reference_links: campaign.referenceLinks,
        contact_type: campaign.contactType,
        contact_value: campaign.contactValue,
        start_date: campaign.startDate,
        end_date: campaign.endDate,
        banner_url: campaign.bannerUrl,
        created_by: user.id,
        amount_paid: amountPaid,
        payment_reference: reference,
        // Live without admin review (decided 2026-11-24) once the brand has
        // confirmed the rules; otherwise an admin checks it first
        status,
        rules_accepted_at: campaign.rulesAccepted ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        const saved = await findByReference(admin, reference);
        if (saved) return alreadySaved(saved, user.id);
      }
      console.error("Campaign insert error:", error.message);
      return NextResponse.json({ error: "Payment verified, but the campaign couldn't be saved." }, { status: 500 });
    }

    // 7. Live: tell the brand, admins (who can pause or remove it) and, once it
    //    has started, verified creators. Waiting: ask admins to review it.
    //    A failed notice never undoes a saved, paid campaign.
    if (status === "active") {
      await announceLive(admin, task.id, campaign, user.id).catch((e) =>
        console.error("Announce live:", e instanceof Error ? e.message : e)
      );
    } else {
      await notifyAdmins(admin, task.id, campaign.campaignName).catch((e) =>
        console.error("Notify admins:", e instanceof Error ? e.message : e)
      );
    }

    return NextResponse.json({
      id: task.id,
      amountPaid,
      budget: plan.budget,
      fee: plan.fee,
      status,
      startDate: campaign.startDate,
    });
  } catch (error) {
    console.error("Campaign creation error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// ---------------------------------------------------------------

async function getUser() {
  const cookieStore = await cookies();
  // A missing URL/key makes createServerClient throw (caught by POST), as before
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Not needed: this route only reads the session
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// "16 Dec" for notices
function dayLabel(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" });
}

async function announceLive(admin: AdminClient, taskId: string, campaign: Campaign, brandId: string): Promise<void> {
  const started = campaign.startDate <= lagosDate();
  const { data: admins, error } = await admin.from("profiles").select("id").eq("is_admin", true);
  if (error) throw new Error(error.message);

  const { error: insertError } = await admin.from("notifications").insert([
    {
      user_id: brandId,
      kind: "campaign_live",
      title: started
        ? `Your campaign is live: ${campaign.campaignName}`
        : `Paid: ${campaign.campaignName} goes live on ${dayLabel(campaign.startDate)}`,
      body: started
        ? "Creators can find it on Discover now. You'll see each post and its views here."
        : "Creators will see it on Discover from that day.",
      link: `/order/${taskId}`,
    },
    // Admins don't approve any more, but they can still pause or remove it
    ...(admins ?? [])
      .filter((a) => a.id !== brandId)
      .map((a) => ({
        user_id: a.id,
        kind: "campaign_live_admin",
        title: `New campaign ${started ? "live" : `starting ${dayLabel(campaign.startDate)}`}: ${campaign.campaignName}`,
        body: "Paid and live without review. Pause or remove it if it breaks the rules.",
        link: "/admin/campaigns?status=active",
      })),
  ]);
  if (insertError) throw new Error(insertError.message);

  // Verified campaigns that have started: tell verified creators now. Later
  // starts are picked up by the daily job (/api/cron/campaign-starts).
  if (started && campaign.campaignType === "verified") {
    const { error: notifyError } = await admin.rpc("notify_verified_campaign", { p_task_id: taskId });
    if (notifyError) console.error("Notify verified creators:", notifyError.message);
  }

  await sendPendingEmails(admin);
}

async function notifyAdmins(admin: AdminClient, taskId: string, title: string): Promise<void> {
  const { data: admins, error } = await admin.from("profiles").select("id").eq("is_admin", true);
  if (error) throw new Error(error.message);
  if (!admins?.length) return;
  const { error: insertError } = await admin.from("notifications").insert(
    admins.map((a) => ({
      user_id: a.id,
      kind: "campaign_review",
      title: `New campaign to review: ${title}`,
      body: "It's paid and waiting for your check before creators can see it.",
      link: `/admin/campaigns?status=pending_review&open=${taskId}`,
    }))
  );
  if (insertError) throw new Error(insertError.message);
  await sendPendingEmails(admin);
}

async function verifyWithPaystack(reference: string): Promise<PaystackResult> {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    }
  );
  const json: unknown = await res.json().catch(() => ({}));
  const data = prop(json, "data");

  if (!res.ok || !prop(json, "status") || !data) {
    return { error: "We couldn't find this payment with Paystack." };
  }
  if (prop(data, "status") !== "success") {
    return { error: `Payment was not completed (status: ${String(prop(data, "status"))}).` };
  }
  if (prop(data, "currency") !== "NGN") {
    return { error: "Payment must be made in Naira." };
  }
  return { data };
}

async function findByReference(admin: AdminClient, reference: string): Promise<SavedTask | null> {
  const { data } = await admin
    .from("tasks")
    .select("id, created_by, amount_paid")
    .eq("payment_reference", reference)
    .maybeSingle();
  return data;
}

function alreadySaved(task: SavedTask, userId: string): NextResponse {
  if (task.created_by !== userId) {
    return NextResponse.json({ error: "This payment has already been used." }, { status: 409 });
  }
  return NextResponse.json({
    id: task.id,
    amountPaid: Number(task.amount_paid),
    alreadySaved: true,
  });
}

// The plan for a campaign's pay inputs, with the fee as of `paidAt`
function planFor(campaign: Pick<Campaign, "campaignType" | "budget" | "postRate" | "viewRate" | "maxViewPayout">, paidAt: Date): Plan {
  return planCampaign({
    type: campaign.campaignType,
    budget: campaign.budget,
    viewRate: campaign.viewRate,
    postRate: campaign.campaignType === "verified" ? campaign.postRate : undefined,
    maxViewPayout: campaign.maxViewPayout,
    paidAt,
  });
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const text = (value: unknown, max: number): string => String(value ?? "").trim().slice(0, max);

const isPlatform = (value: unknown): value is Platform =>
  (PLATFORMS as readonly unknown[]).includes(value);

const isLanguage = (value: unknown): value is string => (LANGUAGES as unknown[]).includes(value);

// Server-side copy of the order page's rules; never trust the browser's
function sanitizeCampaign(input: unknown, userId: string): SanitizeResult {
  if (!isRecord(input)) return { error: "Missing campaign details." };

  // Validated below, then narrowed to Platform[] / string[]
  const platforms: unknown[] = Array.isArray(input.platforms) ? [...new Set<unknown>(input.platforms)] : [];
  const languages: unknown[] = Array.isArray(input.languages) ? [...new Set<unknown>(input.languages)] : [];

  const campaign: Omit<Campaign, "platforms" | "languages"> = {
    campaignName: text(input.campaignName, NAME_MAX),
    description: text(input.description, BRIEF_MAX),
    place: { city: null, state: null },
    referenceLinks: Array.isArray(input.referenceLinks)
      ? input.referenceLinks.map((l: unknown) => text(l, 500)).filter(Boolean)
      : [],
    contactType: isContactType(input.contactType) ? input.contactType : "whatsapp",
    contactValue: text(input.contactValue, 300),
    startDate: text(input.startDate, 10),
    endDate: text(input.endDate, 10),
    bannerUrl: input.bannerUrl ? text(input.bannerUrl, 500) : null,
    campaignType: (CAMPAIGN_TYPES as readonly unknown[]).includes(input.campaignType) ? (input.campaignType as CampaignType) : "open",
    budget: Math.round(Number(input.budget)),
    postRate: Math.round(Number(input.postRate)),
    viewRate: Math.round(Number(input.viewRate)),
    maxViewPayout: Math.round(Number(input.maxViewPayout)),
    rulesAccepted: input.rulesAccepted === true,
  };

  if (!(CAMPAIGN_TYPES as readonly unknown[]).includes(input.campaignType)) return { error: "Choose open or verified." };

  if (!campaign.campaignName) return { error: "Campaign name is required." };
  if (!campaign.description) return { error: "Campaign brief is required." };

  if (!platforms.length) return { error: "Select at least 1 platform." };
  if (!platforms.every(isPlatform)) return { error: "Unknown platform selected." };

  if (!languages.length) return { error: "Select at least 1 language." };
  if (!languages.every(isLanguage)) return { error: "Unknown language selected." };

  if (!isContactType(input.contactType)) return { error: "Add how customers can reach you." };
  const contact = normalizeContact(campaign.contactType, campaign.contactValue);
  if (contact.value === undefined) return { error: contact.error };
  campaign.contactValue = contact.value;

  if (campaign.referenceLinks.length > MAX_REFERENCE_LINKS) return { error: "Too many reference links." };
  if (!campaign.referenceLinks.every(isValidUrl)) return { error: "One of the reference links isn't a valid URL." };

  const place = checkPlace(input.city, input.state);
  if (!place) return { error: "Choose where your customers are." };
  campaign.place = place;

  // Allow one day of slack for time zones (the browser checks local "today")
  const earliest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campaign.startDate) || campaign.startDate < earliest) {
    return { error: "Choose a start date from today onwards." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campaign.endDate)) {
    return { error: "Choose when the campaign ends." };
  }
  const length = daysBetween(campaign.startDate, campaign.endDate);
  if (!(length >= END_DAYS.min && length <= END_DAYS.max)) {
    return { error: `The campaign must end ${END_DAYS.min} to ${END_DAYS.max} days after it starts.` };
  }
  // It goes live now, so a start that slipped into the past (paying around
  // midnight) becomes today, and the end moves with it to keep the length
  const today = lagosDate();
  if (campaign.startDate < today) {
    campaign.endDate = addDays(today, length);
    campaign.startDate = today;
  }

  // Pay: the same rules as the builder (src/lib/pricing.ts)
  for (const n of [campaign.budget, campaign.viewRate, campaign.maxViewPayout]) {
    if (!Number.isFinite(n) || n <= 0) return { error: "Check the budget and rates." };
  }
  if (campaign.campaignType === "verified" && !(Number.isFinite(campaign.postRate) && campaign.postRate > 0)) {
    return { error: "Set what each creator earns per post." };
  }
  const check = planFor(campaign as Campaign, new Date());
  if (check.errors.length) return { error: check.errors[0]?.message ?? "Check the budget and rates." };

  // Banners must be the user's own upload in our storage bucket
  const bannerPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/campaign-banners/${userId}/`;
  if (
    campaign.bannerUrl &&
    (!campaign.bannerUrl.startsWith(bannerPrefix) || campaign.bannerUrl.includes(".."))
  ) {
    return { error: "Invalid banner image." };
  }

  return { campaign: { ...campaign, platforms, languages } };
}
