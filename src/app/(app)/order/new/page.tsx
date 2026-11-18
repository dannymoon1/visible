"use client";

import { createElement, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CircleCheck,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { platformIcon } from "@/components/PlatformIcon";
import { formatNaira } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  ALL,
  BRIEF_MAX,
  COUNTRIES,
  LANGUAGES,
  MAX_PAID_VIEWS,
  MAX_REFERENCE_LINKS,
  MIN_BUDGET,
  MIN_RATE,
  NAME_MAX,
  PLATFORMS,
  PLATFORM_LABELS,
  REGIONS,
  expectedBudget,
  type CampaignType,
  type PayModel,
} from "@/lib/campaignOptions";

// Create a campaign: one question per step, like the business demo builder
// (src/app/(business)/demo/business/new). Decided 2026-11-18:
//   type → the campaign → where & who → pay & budget → review & pay

const STEPS = ["Type", "The campaign", "Where & who", "Pay & budget", "Review"] as const;
const DRAFT_KEY = "vc-campaign-draft";
const MAX_BANNER_BYTES = 2 * 1024 * 1024;
const BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Draft {
  type: CampaignType | null;
  name: string;
  brief: string;
  references: string[];
  platforms: string[];
  languages: string[];
  country: string;
  zone: string;
  state: string;
  startDate: string;
  payModel: PayModel;
  rate: string;
  count: string; // posts (open, per post) or creators (verified)
  budget: string; // per 1K views
}

type Errors = Partial<Record<keyof Draft | "banner", string>>;

function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

const EMPTY: Draft = {
  type: null,
  name: "",
  brief: "",
  references: [],
  platforms: [],
  languages: ["English"],
  country: "Nigeria",
  zone: ALL,
  state: ALL,
  startDate: "",
  payModel: "per_post",
  rate: String(MIN_RATE.per_post),
  count: "",
  budget: "",
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// What the brand pays, and what it buys
function payPlan(d: Draft) {
  const rate = Math.round(Number(d.rate) || 0);
  const count = Math.floor(Number(d.count) || 0);
  const budget = expectedBudget({ payModel: d.payModel, rate, count, budget: Number(d.budget) || 0 });
  const needsCount = d.payModel === "per_post" || d.type === "verified";
  return { rate, count, budget, needsCount };
}

function validateStep(step: number, d: Draft, banner: File | null): Errors {
  const e: Errors = {};
  if (step === 0 && !d.type) e.type = "Choose open or verified.";
  if (step === 1) {
    if (!d.name.trim()) e.name = "Give your campaign a name.";
    if (!d.brief.trim()) e.brief = "Write a short brief for creators.";
    else if (d.brief.length > BRIEF_MAX) e.brief = `Keep the brief to ${BRIEF_MAX} characters.`;
    const bad = d.references.find((l) => l.trim() && !isValidUrl(l.trim()));
    if (bad) e.references = `"${bad}" isn't a valid link. Links start with https://`;
    if (banner && !BANNER_TYPES.includes(banner.type)) e.banner = "The banner must be a JPG, PNG or WebP image.";
    else if (banner && banner.size > MAX_BANNER_BYTES) e.banner = "The banner must be 2 MB or smaller.";
  }
  if (step === 2) {
    if (!d.platforms.length) e.platforms = "Choose at least one platform.";
    if (!d.languages.length) e.languages = "Choose at least one language.";
    if (!d.startDate) e.startDate = "Choose a start date.";
    else if (d.startDate < todayISO()) e.startDate = "The start date can't be in the past.";
  }
  if (step === 3) {
    const { rate, count, budget, needsCount } = payPlan(d);
    const min = MIN_RATE[d.payModel];
    if (!(rate >= min)) e.rate = `The minimum is ${formatNaira(min)} ${d.payModel === "per_post" ? "per post" : "per 1,000 views"}.`;
    if (needsCount && !(count >= 1)) e.count = d.type === "verified" ? "How many creators do you want?" : "How many posts do you want?";
    if (d.payModel === "per_1k_views" && !(Number(d.budget) >= MIN_BUDGET)) e.budget = `The minimum budget is ${formatNaira(MIN_BUDGET)}.`;
    else if (!e.rate && !e.count && budget < MIN_BUDGET)
      e.count = `That comes to ${formatNaira(budget)}. The minimum budget is ${formatNaira(MIN_BUDGET)}: add more ${d.type === "verified" ? "creators" : "posts"} or raise the rate.`;
  }
  return e;
}

// ---------------------------------------------------------
// Page: restores a saved draft once the browser has loaded it

const noSubscribe = () => () => {};
const readDraft = () => {
  try {
    return sessionStorage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
};

export default function NewCampaignPage() {
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  const saved = useSyncExternalStore(noSubscribe, readDraft, () => null);
  const initial = useMemo<Draft>(() => {
    if (!saved) return EMPTY;
    try {
      return { ...EMPTY, ...(JSON.parse(saved) as Partial<Draft>) };
    } catch {
      return EMPTY;
    }
  }, [saved]);
  // Remount once hydrated so the saved draft becomes the starting state
  return <Builder key={hydrated ? "client" : "server"} initial={initial} />;
}

// Payment references already sent to the server in this tab
const savedReferences = new Set<string>();

type Created = { id: string; type: CampaignType; startsLater: boolean; startDate: string; notified: number };

function Builder({ initial }: { initial: Draft }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [paying, setPaying] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);

  // Keep the draft through refreshes (the banner file can't be stored)
  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      // Storage blocked: the draft lasts until the tab closes
    }
  }, [d]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setD((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const toggle = (key: "platforms" | "languages", value: string) =>
    set(key, d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value]);

  const next = () => {
    const found = validateStep(step, d, banner);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  };
  const goTo = (s: number) => {
    setErrors({});
    setStep(s);
    window.scrollTo({ top: 0 });
  };

  const pickBanner = (file: File | null | undefined) => {
    if (!file) return;
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBanner(file);
    setBannerPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, banner: undefined }));
  };
  const removeBanner = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBanner(null);
    setBannerPreview("");
  };

  const plan = payPlan(d);

  // ---------------------------------------------------------
  // Pay, then the server checks the payment with Paystack and saves

  const uploadBanner = async (userId: string, file: File): Promise<string> => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("campaign-banners").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`Banner upload failed: ${error.message}`);
    return supabase.storage.from("campaign-banners").getPublicUrl(path).data.publicUrl;
  };

  const save = async (reference: string, campaign: Record<string, unknown>) => {
    const toastId = toast.loading("Confirming your payment…");
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, campaign }),
      });
      const json: unknown = await res.json().catch(() => ({}));
      const data = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
      if (!res.ok) throw new Error((typeof data.error === "string" && data.error) || "The campaign couldn't be saved.");

      toast.success("Payment confirmed", { id: toastId });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      setCreated({
        id: String(data.id),
        type: d.type ?? "open",
        startsLater: d.startDate > todayISO(),
        startDate: d.startDate,
        notified: Number(data.notified) || 0,
      });
      window.scrollTo({ top: 0 });
    } catch (error) {
      console.error("Campaign save error:", error);
      toast.error(error instanceof Error ? error.message : String(error), {
        id: toastId,
        description: `Your payment is safe. Reference: ${reference}`,
        duration: Infinity,
        action: { label: "Try again", onClick: () => save(reference, campaign) },
      });
    }
  };

  const pay = async () => {
    // Re-check every step before money is involved
    for (let s = 0; s < 4; s++) {
      const found = validateStep(s, d, banner);
      if (Object.values(found).some(Boolean)) {
        setErrors(found);
        setStep(s);
        toast.error("Please fix the highlighted fields.");
        return;
      }
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("Payment configuration is missing.");
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please log in to launch a campaign.");
      return;
    }

    try {
      setPaying(true);
      // Upload first, so a failed upload never follows a payment
      const bannerUrl = banner ? await uploadBanner(user.id, banner) : null;
      const campaign = {
        campaignName: d.name.trim(),
        description: d.brief.trim(),
        referenceLinks: d.references.map((l) => l.trim()).filter(Boolean),
        platforms: d.platforms,
        languages: d.languages,
        country: d.country,
        zone: d.zone,
        state: d.state,
        startDate: d.startDate,
        bannerUrl,
        campaignType: d.type,
        payModel: d.payModel,
        rate: plan.rate,
        count: plan.needsCount ? plan.count : null,
        budget: Number(d.budget) || 0,
      };

      const { default: PaystackPop } = await import("@paystack/inline-js");
      new PaystackPop().newTransaction({
        key: publicKey,
        email: user.email ?? "",
        amount: plan.budget * 100,
        reference: `VISIBLE-${Date.now()}`,
        metadata: {
          // Checked by /api/campaigns so a payment can't fund someone else's campaign
          user_id: user.id,
          campaign_name: campaign.campaignName,
          campaign_type: campaign.campaignType,
        },
        onSuccess: (transaction) => {
          // Paystack can fire this twice; save each reference once
          if (savedReferences.has(transaction.reference)) return;
          savedReferences.add(transaction.reference);
          save(transaction.reference, campaign);
        },
        onCancel: () => toast.info("Payment cancelled."),
        onError: (error) => {
          console.error("Paystack error:", error);
          toast.error("Payment could not be completed.");
        },
      });
    } catch (error) {
      console.error("Payment setup failed:", error);
      toast.error((error instanceof Error && error.message) || "Unable to start the payment. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (created) return <Success created={created} />;

  const countryRegions = REGIONS[d.country];
  const zones = countryRegions ? Object.keys(countryRegions) : [];
  const states = countryRegions && d.zone !== ALL ? (countryRegions[d.zone] ?? []) : [];
  const last = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <Link
          href="/order"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-line/60"
          aria-label="Close and go back to your campaigns"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
        <ol className="flex flex-1 gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          {STEPS.map((s, i) => (
            <li key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span className={cn("block h-full rounded-full bg-ink transition-[width] duration-300", i <= step ? "w-full" : "w-0")} />
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-6 text-sm text-muted">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </p>

      {/* 0. Type */}
      {step === 0 && (
        <Step title="What kind of campaign?" lead="You can't change this after you pay.">
          <div className="grid gap-3 sm:grid-cols-2">
            <TypeCard
              on={d.type === "open"}
              onClick={() => set("type", "open")}
              icon={Users}
              title="Open"
              lead="Anyone can join. Best for reach."
              points={["Any creator can join and post", "Your budget caps what's paid", "Goes live on your start date"]}
            />
            <TypeCard
              on={d.type === "verified"}
              onClick={() => set("type", "verified")}
              icon={BadgeCheck}
              title="Verified"
              lead="Only verified creators. Best for trusted voices."
              points={[
                "A fixed number of creator spots",
                "First come, first served; a standby list fills gaps",
                "We email verified creators when it starts",
              ]}
            />
          </div>
          <FieldError message={errors.type} />
        </Step>
      )}

      {/* 1. The campaign */}
      {step === 1 && (
        <Step title="Tell creators about your campaign" lead="Creators read this on their phones. Keep it short and clear.">
          <Field label="Campaign name" required htmlFor="name" error={errors.name} counter={`${d.name.length}/${NAME_MAX}`}>
            <input
              id="name"
              value={d.name}
              maxLength={NAME_MAX}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Mama Ekaette's lunch packs"
              className={FIELD}
              aria-invalid={!!errors.name}
            />
          </Field>

          <Field
            label="Campaign brief"
            required
            htmlFor="brief"
            error={errors.brief}
            hint="What should creators say? What must they mention? It's a brief, not a script: they'll use their own words."
            counter={`${d.brief.length}/${BRIEF_MAX}`}
            counterWarn={d.brief.length >= BRIEF_MAX - 50}
          >
            <textarea
              id="brief"
              rows={6}
              maxLength={BRIEF_MAX}
              value={d.brief}
              onChange={(e) => set("brief", e.target.value)}
              placeholder="e.g. Fresh jollof and afang every morning in Uyo. Mention the ₦2,500 lunch pack, show the food, and tag @mamaekaette."
              className={cn(FIELD, "h-auto resize-none py-3 leading-relaxed")}
              aria-invalid={!!errors.brief}
            />
          </Field>

          <Field label="Banner image" htmlFor="banner" error={errors.banner} hint="Optional. Wide (16:9) works best. JPG, PNG or WebP, up to 2 MB.">
            {bannerPreview ? (
              <div className="relative overflow-hidden rounded-2xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
                <img src={bannerPreview} alt="Banner preview" className="aspect-video w-full object-cover" />
                <button
                  type="button"
                  onClick={removeBanner}
                  className="absolute top-3 right-3 flex h-9 items-center gap-1.5 rounded-full bg-black/60 px-3 text-sm font-medium text-white backdrop-blur"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove
                </button>
              </div>
            ) : (
              <label
                htmlFor="banner"
                className="flex aspect-[3/1] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface text-sm text-muted transition hover:border-muted/60 hover:text-ink"
              >
                <ImagePlus className="h-6 w-6" aria-hidden="true" />
                Add a banner
              </label>
            )}
            <input
              id="banner"
              type="file"
              accept={BANNER_TYPES.join(",")}
              className="sr-only"
              onChange={(e) => pickBanner(e.target.files?.[0])}
            />
          </Field>

          <Field label="Reference links" htmlFor="ref-0" error={errors.references} hint={`Optional. Your page, product or an example post. Up to ${MAX_REFERENCE_LINKS}.`}>
            <div className="space-y-2">
              {d.references.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                    <input
                      id={`ref-${i}`}
                      type="url"
                      value={link}
                      onChange={(e) => set("references", d.references.map((l, j) => (j === i ? e.target.value : l)))}
                      placeholder="https://"
                      className={cn(FIELD, "pl-10")}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => set("references", d.references.filter((_, j) => j !== i))}
                    aria-label="Remove link"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line text-muted hover:text-ink"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {d.references.length < MAX_REFERENCE_LINKS && (
                <button
                  type="button"
                  onClick={() => set("references", [...d.references, ""])}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-muted/50"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add a link
                </button>
              )}
            </div>
          </Field>
        </Step>
      )}

      {/* 2. Where & who */}
      {step === 2 && (
        <Step title="Where should creators post?" lead="Choose the platforms, the audience and when it starts.">
          <Field label="Platforms" required htmlFor="platforms" error={errors.platforms}>
            <div id="platforms" className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <Chip key={p} on={d.platforms.includes(p)} onClick={() => toggle("platforms", p)} icon={platformIcon(p)}>
                  {PLATFORM_LABELS[p]}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Languages" required htmlFor="languages" error={errors.languages}>
            <div id="languages" className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <Chip key={l} on={d.languages.includes(l)} onClick={() => toggle("languages", l)}>
                  {l}
                </Chip>
              ))}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Country" htmlFor="country">
              <select
                id="country"
                value={d.country}
                onChange={(e) => setD((p) => ({ ...p, country: e.target.value, zone: ALL, state: ALL }))}
                className={FIELD}
              >
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Zone" htmlFor="zone">
              <select
                id="zone"
                value={d.zone}
                disabled={!zones.length}
                onChange={(e) => setD((p) => ({ ...p, zone: e.target.value, state: ALL }))}
                className={FIELD}
              >
                <option value={ALL}>{zones.length ? "All zones" : "Nationwide"}</option>
                {zones.map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </Field>
            <Field label="State" htmlFor="state">
              <select id="state" value={d.state} disabled={!states.length} onChange={(e) => set("state", e.target.value)} className={FIELD}>
                <option value={ALL}>{states.length ? "All states" : zones.length ? "Pick a zone first" : "Nationwide"}</option>
                {states.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Start date"
            required
            htmlFor="startDate"
            error={errors.startDate}
            hint={d.type === "verified" ? "Verified creators are emailed on this day." : "Creators can join from this day."}
          >
            <input
              id="startDate"
              type="date"
              min={todayISO()}
              value={d.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className={cn(FIELD, "sm:max-w-xs")}
              aria-invalid={!!errors.startDate}
            />
          </Field>
        </Step>
      )}

      {/* 3. Pay & budget */}
      {step === 3 && (
        <Step title="How do you want to pay creators?" lead="Pick one rate. You only pay for posts that pass our checks.">
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Pay model">
            {(["per_post", "per_1k_views"] as const).map((m) => {
              const on = d.payModel === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setD((p) => ({ ...p, payModel: m, rate: String(Math.max(Number(p.rate) || 0, MIN_RATE[m])) }))}
                  className={cn(
                    "relative rounded-2xl p-4 text-left ring-1 transition active:scale-[0.98]",
                    on ? "bg-ink text-page ring-ink" : "bg-surface text-ink ring-line hover:ring-muted"
                  )}
                >
                  <span className="block font-heading text-base font-semibold">{m === "per_post" ? "Per post" : "Per 1K views"}</span>
                  <span className={cn("mt-1 block text-sm", on ? "text-page/70" : "text-muted")}>
                    {m === "per_post"
                      ? `A fixed amount for each approved post. From ${formatNaira(MIN_RATE.per_post)}.`
                      : `Pay for verified views. From ${formatNaira(MIN_RATE.per_1k_views)} per 1,000.`}
                  </span>
                  {on && <Check className="absolute top-4 right-4 h-4 w-4" strokeWidth={3} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={d.payModel === "per_post" ? "Rate per post (₦)" : "Rate per 1,000 views (₦)"}
              required
              htmlFor="rate"
              error={errors.rate}
              hint={`Minimum ${formatNaira(MIN_RATE[d.payModel])}`}
            >
              <NairaInput id="rate" value={d.rate} onChange={(v) => set("rate", v)} invalid={!!errors.rate} />
            </Field>

            {plan.needsCount && (
              <Field
                label={d.type === "verified" ? "Number of creators" : "Number of posts"}
                required
                htmlFor="count"
                error={errors.count}
                hint={d.type === "verified" ? "Spots, one post each. First come, first served." : "Approved posts you'll pay for."}
              >
                <input
                  id="count"
                  inputMode="numeric"
                  value={d.count}
                  onChange={(e) => set("count", e.target.value.replace(/\D/g, ""))}
                  placeholder={d.type === "verified" ? "e.g. 10" : "e.g. 20"}
                  className={cn(FIELD, "font-mono")}
                  aria-invalid={!!errors.count}
                />
              </Field>
            )}

            {d.payModel === "per_1k_views" && (
              <Field label="Budget (₦)" required htmlFor="budget" error={errors.budget} hint={`Minimum ${formatNaira(MIN_BUDGET)}`}>
                <NairaInput id="budget" value={d.budget} onChange={(v) => set("budget", v)} invalid={!!errors.budget} />
              </Field>
            )}
          </div>

          <PlanSummary d={d} />
        </Step>
      )}

      {/* 4. Review */}
      {step === 4 && (
        <Step title="Check and pay" lead="Your campaign goes live once Paystack confirms the payment.">
          <ReviewCard title="Type" onEdit={() => goTo(0)}>
            {d.type === "verified" ? "Verified: only verified creators, first come, first served" : "Open: anyone can join"}
          </ReviewCard>
          <ReviewCard title="The campaign" onEdit={() => goTo(1)}>
            <p className="font-medium text-ink">{d.name}</p>
            <p className="mt-1 whitespace-pre-line text-muted">{d.brief}</p>
            <p className="mt-2 text-muted">
              {banner ? "Banner added" : "No banner"} · {d.references.filter((l) => l.trim()).length} reference{" "}
              {d.references.filter((l) => l.trim()).length === 1 ? "link" : "links"}
            </p>
          </ReviewCard>
          <ReviewCard title="Where & who" onEdit={() => goTo(2)}>
            <p>{d.platforms.map((p) => PLATFORM_LABELS[p as keyof typeof PLATFORM_LABELS] ?? p).join(", ")}</p>
            <p className="mt-1 text-muted">
              {[d.state !== ALL ? d.state : null, d.zone !== ALL ? d.zone : null, d.country].filter(Boolean).join(", ")} ·{" "}
              {d.languages.join(", ")} · Starts {d.startDate ? new Date(`${d.startDate}T00:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </p>
          </ReviewCard>
          <ReviewCard title="Pay & budget" onEdit={() => goTo(3)}>
            <PlanSummary d={d} flat />
          </ReviewCard>
        </Step>
      )}

      {/* Actions */}
      {/* Sticks to the bottom of the screen, within the content column */}
      <div className="sticky bottom-0 z-30 mt-10 border-t border-line bg-page/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 py-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="inline-flex h-12 items-center gap-1.5 rounded-full border border-line bg-surface px-5 font-heading text-[15px] font-semibold text-ink hover:border-muted/50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={last ? pay : next}
            disabled={paying}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-signal font-heading text-base font-semibold text-on-signal transition hover:brightness-105 active:scale-[0.98] disabled:opacity-70"
          >
            {paying && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {last ? `Pay ${formatNaira(plan.budget)}` : "Continue"}
            {!last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------

function PlanSummary({ d, flat = false }: { d: Draft; flat?: boolean }) {
  const { rate, count, budget, needsCount } = payPlan(d);
  const lines: string[] = [];
  if (d.payModel === "per_post") {
    lines.push(`${formatNaira(rate)} per approved post`);
    if (count) lines.push(d.type === "verified" ? `${count} creator ${count === 1 ? "spot" : "spots"}, one post each` : `Up to ${count} approved posts`);
  } else {
    lines.push(`${formatNaira(rate)} per 1,000 verified views`);
    if (rate > 0 && budget > 0) lines.push(`Pays for up to ${Math.floor((budget / rate) * 1000).toLocaleString("en-NG")} views`);
    if (d.type === "verified" && needsCount && count > 0) lines.push(`About ${formatNaira(Math.floor(budget / count))} per creator`);
    if (rate > 0) lines.push(`A post earns at most ${formatNaira((MAX_PAID_VIEWS / 1000) * rate)} (views past ${MAX_PAID_VIEWS.toLocaleString("en-NG")} aren't paid; under 1,000 earns nothing)`);
  }

  return (
    <div className={cn(!flat && "rounded-[1.75rem] bg-surface p-6 ring-1 ring-line")}>
      <p className="text-sm text-muted">Total budget</p>
      <p className="mt-1 font-mono text-[2.2rem] leading-none tracking-[-0.03em] text-ink tabular-nums">{formatNaira(budget)}</p>
      <ul className="mt-4 space-y-1.5 text-sm text-ink">
        {lines.map((l) => (
          <li key={l} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            {l}
          </li>
        ))}
      </ul>
      {budget > 0 && budget < MIN_BUDGET && (
        <p className="mt-3 text-sm text-error">The minimum budget is {formatNaira(MIN_BUDGET)}.</p>
      )}
    </div>
  );
}

function Success({ created }: { created: Created }) {
  const date = new Date(`${created.startDate}T00:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "long" });
  const title =
    created.type === "verified"
      ? created.startsLater
        ? `Goes live on ${date}`
        : "Your verified campaign is live"
      : created.startsLater
        ? `Goes live on ${date}`
        : "Your campaign is live";
  const body =
    created.type === "verified"
      ? created.startsLater
        ? "We'll email verified creators that morning. Spots go first come, first served."
        : `We've told ${created.notified} verified ${created.notified === 1 ? "creator" : "creators"}. Spots go first come, first served.`
      : created.startsLater
        ? "Creators can join from that day."
        : "Creators can join now. You'll see each post as it comes in.";

  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-verified/12 text-verified">
        <CircleCheck className="h-8 w-8" aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-heading text-3xl font-semibold tracking-[-0.03em] text-ink">{title}</h1>
      <p className="mt-3 text-[15px] text-muted">{body}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/order/${created.id}`}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-signal px-6 font-heading text-[15px] font-semibold text-on-signal hover:brightness-105"
        >
          Manage campaign
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          href={`/discover/${created.id}`}
          className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-surface px-6 font-heading text-[15px] font-semibold text-ink hover:border-muted/50"
        >
          See it as creators do
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Pieces

const FIELD =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-signal focus:ring-4 focus:ring-signal/15 disabled:opacity-60";

function Step({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="animate-fade-in">
      <h1 className="mt-1 font-heading text-[1.9rem] leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-[2.2rem]">{title}</h1>
      {lead && <p className="mt-2 text-[15px] text-muted">{lead}</p>}
      <div className="mt-8 space-y-6">{children}</div>
    </section>
  );
}

function Field({
  label,
  required = false,
  htmlFor,
  error,
  hint,
  counter,
  counterWarn = false,
  children,
}: {
  label: string;
  required?: boolean;
  htmlFor: string;
  error?: string;
  hint?: string;
  counter?: string;
  counterWarn?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="text-error" aria-hidden="true">
              {" "}
              *
            </span>
          )}
          {required && <span className="sr-only"> (required)</span>}
        </label>
        {counter && <span className={cn("font-mono text-xs", counterWarn ? "text-warning" : "text-muted")}>{counter}</span>}
      </div>
      {children}
      {error ? <FieldError message={error} /> : hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1.5 text-sm text-error" role="alert">
      {message}
    </p>
  );
}

function NairaInput({ id, value, onChange, invalid }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-mono text-muted">₦</span>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        className={cn(FIELD, "pl-9 font-mono")}
        aria-invalid={invalid}
      />
    </div>
  );
}

function TypeCard({
  on,
  onClick,
  icon: Icon,
  title,
  lead,
  points,
}: {
  on: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  lead: string;
  points: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "relative rounded-[1.5rem] p-5 text-left ring-1 transition active:scale-[0.98]",
        on ? "bg-ink text-page ring-ink" : "bg-surface text-ink ring-line hover:ring-muted"
      )}
    >
      <Icon className={cn("h-6 w-6", on ? "text-signal" : "text-muted")} aria-hidden="true" />
      <span className="mt-4 block font-heading text-xl font-semibold">{title}</span>
      <span className={cn("mt-1 block text-sm", on ? "text-page/75" : "text-muted")}>{lead}</span>
      <ul className="mt-4 space-y-1.5 text-sm">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <Check className={cn("mt-0.5 h-4 w-4 shrink-0", on ? "text-signal" : "text-muted")} aria-hidden="true" />
            {p}
          </li>
        ))}
      </ul>
      {on && <CircleCheck className="absolute top-5 right-5 h-5 w-5" aria-hidden="true" />}
    </button>
  );
}

function Chip({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon?: LucideIcon; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition active:scale-[0.96]",
        on ? "border-ink bg-ink text-page" : "border-line bg-surface text-ink hover:border-muted/50"
      )}
    >
      {icon && createElement(icon, { className: "h-4 w-4", "aria-hidden": true })}
      {children}
    </button>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 text-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium text-muted">{title}</h2>
        <button type="button" onClick={onEdit} className="text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4">
          Edit
        </button>
      </div>
      <div className="text-ink">{children}</div>
    </section>
  );
}
