import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  PLATFORMS,
  CONTENT_TYPES,
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

export async function POST(req) {
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

    const body = await req.json();
    const reference = String(body.reference || "").trim();
    if (!reference || reference.length > 100) {
      return NextResponse.json({ error: "Missing payment reference." }, { status: 400 });
    }

    // 2. Validate the campaign before touching Paystack
    const { campaign, error: invalid } = sanitizeCampaign(body.campaign, user.id);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 3. Already saved? (Paystack's callback can fire twice; retries are safe)
    const existing = await findByReference(admin, reference);
    if (existing) return alreadySaved(existing, user.id);

    // 4. Ask Paystack what really happened
    const payment = await verifyWithPaystack(reference);
    if (payment.error) {
      return NextResponse.json({ error: payment.error }, { status: 402 });
    }

    const { data } = payment;
    if (String(data.customer?.email || "").toLowerCase() !== String(user.email || "").toLowerCase()) {
      return NextResponse.json({ error: "This payment was made by a different account." }, { status: 403 });
    }
    if (data.metadata?.user_id && data.metadata.user_id !== user.id) {
      return NextResponse.json({ error: "This payment was made by a different account." }, { status: 403 });
    }

    // 5. Budget = amount actually paid (Paystack reports kobo)
    const amountPaid = Number(data.amount) / 100;
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
        description: campaign.description || "Create a post about this campaign!",
        reward,
        max_participants: campaign.participants,
        // Kept for older screens that read a single platform
        platform: campaign.platforms.join(", "),
        link: campaign.link,
        content_type: campaign.contentType,
        content_details: campaign.contentDetails,
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
    console.error("Campaign creation error:", error.message);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// ---------------------------------------------------------------

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

async function verifyWithPaystack(reference) {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    }
  );
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.status || !json.data) {
    return { error: "We couldn't find this payment with Paystack." };
  }
  if (json.data.status !== "success") {
    return { error: `Payment was not completed (status: ${json.data.status}).` };
  }
  if (json.data.currency !== "NGN") {
    return { error: "Payment must be made in Naira." };
  }
  return { data: json.data };
}

async function findByReference(admin, reference) {
  const { data } = await admin
    .from("tasks")
    .select("id, created_by, amount_paid, reward")
    .eq("payment_reference", reference)
    .maybeSingle();
  return data;
}

function alreadySaved(task, userId) {
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

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const text = (value, max) => String(value ?? "").trim().slice(0, max);

// Server-side copy of the order page's rules; never trust the browser's
function sanitizeCampaign(input, userId) {
  if (!input || typeof input !== "object") return { error: "Missing campaign details." };

  const campaign = {
    campaignName: text(input.campaignName, 120),
    description: text(input.description, 300),
    contentType: text(input.contentType, 60),
    contentDetails: text(input.contentDetails, 2000),
    platforms: Array.isArray(input.platforms) ? [...new Set(input.platforms)] : [],
    link: text(input.link, 500),
    country: text(input.country, 60),
    zone: text(input.zone, 60) || ALL,
    state: text(input.state, 60) || ALL,
    languages: Array.isArray(input.languages) ? [...new Set(input.languages)] : [],
    referenceLinks: Array.isArray(input.referenceLinks)
      ? input.referenceLinks.map((l) => text(l, 500)).filter(Boolean)
      : [],
    startDate: text(input.startDate, 10),
    participants: Number(input.participants),
    bannerUrl: input.bannerUrl ? text(input.bannerUrl, 500) : null,
  };

  if (!campaign.campaignName) return { error: "Campaign name is required." };
  if (!campaign.contentDetails) return { error: "Content details are required." };
  if (!CONTENT_TYPES.includes(campaign.contentType)) return { error: "Choose a valid content type." };

  if (!campaign.platforms.length) return { error: "Select at least 1 platform." };
  if (!campaign.platforms.every((p) => PLATFORMS.includes(p))) return { error: "Unknown platform selected." };

  if (!campaign.languages.length) return { error: "Select at least 1 language." };
  if (!campaign.languages.every((l) => LANGUAGES.includes(l))) return { error: "Unknown language selected." };

  if (!isValidUrl(campaign.link)) return { error: "Enter a valid link starting with https://" };

  if (campaign.referenceLinks.length > MAX_REFERENCE_LINKS) return { error: "Too many reference links." };
  if (!campaign.referenceLinks.every(isValidUrl)) return { error: "One of the reference links isn't a valid URL." };

  if (!COUNTRIES.includes(campaign.country)) return { error: "Choose a valid country." };
  const zones = REGIONS[campaign.country];
  if (zones) {
    if (campaign.zone !== ALL && !zones[campaign.zone]) return { error: "Choose a valid zone." };
    if (campaign.state !== ALL && (campaign.zone === ALL || !zones[campaign.zone].includes(campaign.state))) {
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

  return { campaign };
}
