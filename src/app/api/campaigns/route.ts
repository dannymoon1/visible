import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import {
  type Platform,
  PLATFORMS,
  BRIEF_MAX,
  LANGUAGES,
  REGIONS,
  COUNTRIES,
  ALL,
  MIN_REWARD,
  rewardFor,
} from "@/lib/campaignOptions";

// Creates a campaign ONLY after Paystack confirms the payment.
// The budget is what Paystack actually received, never a number from the
// browser, and each payment reference can fund exactly one campaign.

const MIN_AMOUNT = 100; // ₦
const MAX_REFERENCE_LINKS = 5;

interface Campaign {
  campaignName: string;
  description: string;
  platforms: Platform[];
  country: string;
  zone: string | null;
  state: string | null;
  languages: string[];
  referenceLinks: string[];
  startDate: string;
  participants: number;
  bannerUrl: string | null;
}

type SanitizeResult = { campaign: Campaign; error?: undefined } | { campaign?: undefined; error: string };

// Paystack's transaction object is untrusted JSON; fields are read with prop()
type PaystackResult = { data: unknown; error?: undefined } | { data?: undefined; error: string };

type AdminClient = SupabaseClient<Database>;

interface SavedTask {
  id: string;
  created_by: string | null;
  amount_paid: number | null;
  reward: number | null;
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

    if (!process.env.PAYSTACK_SECRET_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("PAYSTACK_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is missing.");
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
      process.env.SUPABASE_SERVICE_ROLE_KEY
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

    // 5. Budget = amount actually paid (Paystack reports kobo)
    const amountPaid = Number(prop(data, "amount")) / 100;
    if (!(amountPaid >= MIN_AMOUNT)) {
      return NextResponse.json({ error: `Minimum campaign amount is ₦${MIN_AMOUNT}.` }, { status: 400 });
    }

    const reward = rewardFor(amountPaid, campaign.participants);
    if (reward < MIN_REWARD) {
      return NextResponse.json(
        { error: `Too many participants for this budget: each must earn at least ₦${MIN_REWARD}.` },
        { status: 400 }
      );
    }

    // 6. Save. The unique index on payment_reference stops double-spending
    //    even if two requests race past step 3.
    const { data: task, error } = await admin
      .from("tasks")
      .insert({
        title: campaign.campaignName,
        // The campaign brief (content type and content details were retired 2026-11-18)
        description: campaign.description,
        reward,
        max_participants: campaign.participants,
        // Kept for older screens that read a single platform
        platform: campaign.platforms.join(", "),
        platforms: campaign.platforms,
        target_country: campaign.country,
        target_zone: campaign.zone,
        target_state: campaign.state,
        languages: campaign.languages,
        reference_links: campaign.referenceLinks,
        start_date: campaign.startDate,
        banner_url: campaign.bannerUrl,
        created_by: user.id,
        amount_paid: amountPaid,
        payment_reference: reference,
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

    return NextResponse.json({ id: task.id, amountPaid, reward });
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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    .select("id, created_by, amount_paid, reward")
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
    reward: Number(task.reward),
    alreadySaved: true,
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
    campaignName: text(input.campaignName, 120),
    description: text(input.description, BRIEF_MAX),
    country: text(input.country, 60),
    zone: text(input.zone, 60) || ALL,
    state: text(input.state, 60) || ALL,
    referenceLinks: Array.isArray(input.referenceLinks)
      ? input.referenceLinks.map((l: unknown) => text(l, 500)).filter(Boolean)
      : [],
    startDate: text(input.startDate, 10),
    participants: Number(input.participants),
    bannerUrl: input.bannerUrl ? text(input.bannerUrl, 500) : null,
  };

  if (!campaign.campaignName) return { error: "Campaign name is required." };
  if (!campaign.description) return { error: "Campaign brief is required." };

  if (!platforms.length) return { error: "Select at least 1 platform." };
  if (!platforms.every(isPlatform)) return { error: "Unknown platform selected." };

  if (!languages.length) return { error: "Select at least 1 language." };
  if (!languages.every(isLanguage)) return { error: "Unknown language selected." };

  if (campaign.referenceLinks.length > MAX_REFERENCE_LINKS) return { error: "Too many reference links." };
  if (!campaign.referenceLinks.every(isValidUrl)) return { error: "One of the reference links isn't a valid URL." };

  if (!COUNTRIES.includes(campaign.country)) return { error: "Choose a valid country." };
  const zones = REGIONS[campaign.country];
  if (zones) {
    // zone and state are still the non-null strings set above
    const zone = campaign.zone ?? ALL;
    const state = campaign.state ?? ALL;
    if (zone !== ALL && !zones[zone]) return { error: "Choose a valid zone." };
    // zones[zone] exists here: zone is either ALL or was checked just above
    if (state !== ALL && (zone === ALL || !zones[zone]?.includes(state))) {
      return { error: "Choose a valid state." };
    }
  } else {
    // Countries without regions are nationwide
    campaign.zone = null;
    campaign.state = null;
  }

  // Allow one day of slack for time zones (the browser checks local "today")
  const earliest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(campaign.startDate) || campaign.startDate < earliest) {
    return { error: "Choose a start date from today onwards." };
  }

  if (!Number.isInteger(campaign.participants) || campaign.participants < 1) {
    return { error: "Enter at least 1 participant." };
  }

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
