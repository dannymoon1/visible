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
import SelectMenu from "@/components/ui/SelectMenu";
import {
  DEFAULT_CAP_VIEWS,
  END_DAYS,
  LAUNCH_FEE_ENDS_LABEL,
  MIN_BUDGET,
  POST_FEE_UNLOCK_DAYS,
  POST_RATE,
  VIEW_FLOOR,
  VIEW_RATE,
  VIEW_WINDOW_DAYS,
  addDays,
  daysBetween,
  defaultMaxViewPayout,
  isLaunchFee,
  planCampaign,
  type Plan,
} from "@/lib/pricing";
import { platformIcon } from "@/components/PlatformIcon";
import { formatNaira } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  ALL,
  BRIEF_MAX,
  COUNTRIES,
  LANGUAGES,
  MAX_REFERENCE_LINKS,
  NAME_MAX,
  PLATFORMS,
  PLATFORM_LABELS,
  REGIONS,
  type CampaignType,
} from "@/lib/campaignOptions";

// Create a campaign: one question per step, like the business demo builder
// (src/app/(business)/demo/business/new). Decided 2026-11-18:
//   type → the campaign → where & who → budget & pay → review & pay
// Budget & pay follows the pricing rules decided 2026-11-22 to 24 (plan A4).

const STEPS = ["Type", "The campaign", "Where & who", "Budget & pay", "Review"] as const;
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
  // Last day creators can post: 7 to 30 days after the start (decided 2026-11-22)
  endDate: string;
  // Pay (pricing version 2): what creators can earn in total, and the rates
  budget: string;
  postRate: string; // verified only
  viewRate: string;
  maxViewPayout: string;
  // False while the maximum follows the rate (5,000 views' worth)
  maxEdited: boolean;
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
  endDate: "",
  budget: "",
  postRate: String(POST_RATE.suggested),
  viewRate: "",
  maxViewPayout: "",
  maxEdited: false,
};

// A type's suggested view rate fills in when the rate is empty, or still the
// other type's suggestion
function withTypeDefaults(d: Draft): Draft {
  if (!d.type) return d;
  const other = d.type === "open" ? VIEW_RATE.verified.suggested : VIEW_RATE.open.suggested;
  if (!d.viewRate || Number(d.viewRate) === other) return { ...d, viewRate: String(VIEW_RATE[d.type].suggested) };
  return d;
}

// "3 Dec" (or "3 Dec 2027" when it isn't this year)
function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

// A unique stamp for upload paths and payment references (only called from
// event handlers, never while rendering)
const stamp = () => Date.now();

// Quick picks for how long a campaign runs
const LENGTHS = [
  { days: 7, label: "1 week" },
  { days: 14, label: "2 weeks" },
  { days: 21, label: "3 weeks" },
  { days: 30, label: "30 days" },
] as const;

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
    if (!d.endDate) e.endDate = "Choose when the campaign ends.";
    else if (d.startDate) {
      const days = daysBetween(d.startDate, d.endDate);
      if (days < END_DAYS.min) e.endDate = `End at least ${END_DAYS.min} days after the start, on ${shortDate(addDays(d.startDate, END_DAYS.min))} or later.`;
      else if (days > END_DAYS.max) e.endDate = `End within ${END_DAYS.max} days of the start, by ${shortDate(addDays(d.startDate, END_DAYS.max))}.`;
    }
  }
  if (step === 3) {
    for (const err of planFor(d).errors) if (!e[err.field]) e[err.field] = err.message;
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
      return withTypeDefaults({ ...EMPTY, ...(JSON.parse(saved) as Partial<Draft>) });
    } catch {
      return EMPTY;
    }
  }, [saved]);
  // Remount once hydrated so the saved draft becomes the starting state
  return <Builder key={hydrated ? "client" : "server"} initial={initial} />;
}

// Payment switches to the new pricing in plan step A6
const CHECKOUT_READY = false;

// Payment references already sent to the server in this tab
const savedReferences = new Set<string>();

type Created = { id: string; type: CampaignType };

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
  const chooseType = (type: CampaignType) => {
    setD((prev) => withTypeDefaults({ ...prev, type }));
    if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
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

  const plan = planFor(d);

  // ---------------------------------------------------------
  // Pay, then the server checks the payment with Paystack and saves

  const uploadBanner = async (userId: string, file: File): Promise<string> => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${stamp()}.${extension}`;
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

    // The server takes the new pricing in plan step A6. Until then no money is
    // taken, so a payment can never succeed while saving the campaign fails.
    if (!CHECKOUT_READY) {
      toast.info("Checkout is being updated to the new pricing. Payment opens again shortly.");
      return;
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
        endDate: d.endDate,
        bannerUrl,
        campaignType: d.type,
        budget: plan.budget,
        postRate: plan.postRate,
        viewRate: plan.viewRate,
        maxViewPayout: plan.maxViewPayout,
      };

      const { default: PaystackPop } = await import("@paystack/inline-js");
      new PaystackPop().newTransaction({
        key: publicKey,
        email: user.email ?? "",
        amount: plan.total * 100,
        reference: `VISIBLE-${stamp()}`,
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
              onClick={() => chooseType("open")}
              icon={Users}
              title="Open"
              lead="Anyone can join. Best for reach."
              points={[
                "Any creator can join and post",
                `Paid by verified views, from ${formatNaira(VIEW_RATE.open.min)} per 1,000`,
                `From ${formatNaira(MIN_BUDGET.open)}, plus our fee`,
              ]}
            />
            <TypeCard
              on={d.type === "verified"}
              onClick={() => chooseType("verified")}
              icon={BadgeCheck}
              title="Verified"
              lead="Only verified creators. Best for trusted voices."
              points={[
                "A fixed number of verified creator spots",
                "Each creator earns per post plus per view",
                `From ${formatNaira(MIN_BUDGET.verified)}, plus our fee`,
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
        <Step title="Where should creators post?" lead="Choose the platforms, the audience and when it runs.">
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
              <SelectMenu
                id="country"
                label="Country"
                variant="outline"
                value={d.country}
                options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                onChange={(country) => setD((p) => ({ ...p, country, zone: ALL, state: ALL }))}
              />
            </Field>
            <Field label="Zone" htmlFor="zone">
              <SelectMenu
                id="zone"
                label="Zone"
                variant="outline"
                disabled={!zones.length}
                value={d.zone}
                options={[{ value: ALL, label: zones.length ? "All zones" : "Nationwide" }, ...zones.map((z) => ({ value: z, label: z }))]}
                onChange={(zone) => setD((p) => ({ ...p, zone, state: ALL }))}
              />
            </Field>
            <Field label="State" htmlFor="state">
              <SelectMenu
                id="state"
                label="State"
                variant="outline"
                disabled={!states.length}
                value={d.state}
                options={[
                  { value: ALL, label: states.length ? "All states" : zones.length ? "Pick a zone first" : "Nationwide" },
                  ...states.map((s) => ({ value: s, label: s })),
                ]}
                onChange={(state) => set("state", state)}
              />
            </Field>
          </div>

          <CampaignDates d={d} errors={errors} setD={setD} clearError={(key) => setErrors((prev) => ({ ...prev, [key]: undefined }))} />
        </Step>
      )}

      {/* 3. Pay & budget */}
      {step === 3 && (
        <Step
          title="Budget and pay"
          lead={
            d.type === "verified"
              ? "Set your budget and what each creator earns. You only pay for posts and views that pass our checks."
              : "Set your budget and what creators earn for their views. You only pay for views that pass our checks."
          }
        >
          <BudgetAndPay d={d} errors={errors} set={set} setD={setD} clearError={(key) => setErrors((prev) => ({ ...prev, [key]: undefined }))} />
          <PlanSummary d={d} />
        </Step>
      )}

      {/* 4. Review */}
      {step === 4 && (
        <Step title="Check and pay" lead="After you pay, our team checks your campaign before creators see it. Usually within a day.">
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
              {d.languages.join(", ")}
            </p>
            <p className="mt-1 text-muted">
              {d.startDate && d.endDate
                ? `Runs ${shortDate(d.startDate)} to ${shortDate(d.endDate)} (${daysBetween(d.startDate, d.endDate)} days). Results final by ${shortDate(addDays(d.endDate, VIEW_WINDOW_DAYS))}.`
                : "Dates not set"}
            </p>
          </ReviewCard>
          <ReviewCard title="Budget & pay" onEdit={() => goTo(3)}>
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
            {last ? `Pay ${formatNaira(plan.total)}` : "Continue"}
            {!last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------

// ---------------------------------------------------------
// Budget and pay (plan A4): the brand sets a budget and rates; the rules in
// src/lib/pricing.ts work out spots, views, the most a creator can earn and
// the price, so the builder and the server can't disagree

// What the draft's pay inputs come to
function planFor(d: Draft): Plan {
  const type = d.type ?? "open";
  return planCampaign({
    type,
    budget: Number(d.budget) || 0,
    viewRate: Number(d.viewRate) || 0,
    postRate: Number(d.postRate) || 0,
    maxViewPayout: d.maxEdited ? Number(d.maxViewPayout) || 0 : undefined,
  });
}

const BUDGET_PICKS: Record<CampaignType, number[]> = {
  open: [15000, 25000, 50000],
  verified: [30000, 50000, 100000],
};

// ₦30k, ₦1.5m
function shortNaira(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toLocaleString("en-NG", { maximumFractionDigits: 1 })}m`;
  if (n >= 1000) return `₦${(n / 1000).toLocaleString("en-NG", { maximumFractionDigits: 1 })}k`;
  return formatNaira(n);
}

function BudgetAndPay({
  d,
  errors,
  set,
  setD,
  clearError,
}: {
  d: Draft;
  errors: Errors;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  setD: (update: (prev: Draft) => Draft) => void;
  clearError: (key: keyof Draft) => void;
}) {
  const type = d.type ?? "open";
  const verified = type === "verified";
  const plan = planFor(d);
  const viewRate = Number(d.viewRate) || 0;
  const shownMax = d.maxEdited ? d.maxViewPayout : viewRate ? String(defaultMaxViewPayout(viewRate)) : "";

  return (
    <div className="space-y-6">
      <Field
        label="Budget"
        required
        htmlFor="budget"
        error={errors.budget}
        hint={`What creators can earn in total. From ${formatNaira(MIN_BUDGET[type])} for ${type} campaigns. Our fee is added on top.`}
      >
        <NairaInput id="budget" value={d.budget} onChange={(v) => set("budget", v)} invalid={!!errors.budget} />
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick budgets">
          {BUDGET_PICKS[type].map((n) => {
            const on = Number(d.budget) === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                onClick={() => set("budget", String(n))}
                className={cn(
                  "press h-9 rounded-full px-3.5 font-mono text-sm ring-1 transition-colors",
                  on ? "bg-ink text-page ring-ink" : "bg-surface text-ink ring-line hover:ring-muted/50"
                )}
              >
                {shortNaira(n)}
              </button>
            );
          })}
        </div>
      </Field>

      <div className={cn("grid gap-4", verified && "sm:grid-cols-2")}>
        {verified && (
          <Field
            label="Pay per post"
            required
            htmlFor="postRate"
            error={errors.postRate}
            hint={`From ${formatNaira(POST_RATE.min)}; ${formatNaira(POST_RATE.suggested)} suggested. Earned once the post has been live ${POST_FEE_UNLOCK_DAYS} days.`}
          >
            <NairaInput id="postRate" value={d.postRate} onChange={(v) => set("postRate", v)} invalid={!!errors.postRate} />
          </Field>
        )}
        <Field
          label="Pay per 1,000 views"
          required
          htmlFor="viewRate"
          error={errors.viewRate}
          hint={
            verified
              ? `From ${formatNaira(VIEW_RATE.verified.min)}. Paid from the first verified view.`
              : `${formatNaira(VIEW_RATE.open.min)} or more. Posts under ${VIEW_FLOOR.open.toLocaleString("en-NG")} views earn nothing.`
          }
        >
          <NairaInput id="viewRate" value={d.viewRate} onChange={(v) => set("viewRate", v)} invalid={!!errors.viewRate} />
        </Field>
      </div>

      <Field
        label="Most a post can earn from views"
        required
        htmlFor="maxViewPayout"
        error={errors.maxViewPayout}
        hint={
          viewRate > 0 && plan.viewCap > 0
            ? `That's ${plan.viewCap.toLocaleString("en-NG")} views at your rate. A post that goes past it still earns ${formatNaira(plan.maxViewPayout)}.`
            : "Set your rate per 1,000 views first."
        }
      >
        <NairaInput
          id="maxViewPayout"
          value={shownMax}
          onChange={(v) => {
            setD((p) => ({ ...p, maxViewPayout: v, maxEdited: true }));
            clearError("maxViewPayout");
          }}
          invalid={!!errors.maxViewPayout}
        />
        {d.maxEdited && viewRate > 0 && (
          <button
            type="button"
            onClick={() => {
              setD((p) => ({ ...p, maxViewPayout: "", maxEdited: false }));
              clearError("maxViewPayout");
            }}
            className="mt-2 text-sm font-medium text-ink underline decoration-signal decoration-2 underline-offset-4"
          >
            Use {DEFAULT_CAP_VIEWS.toLocaleString("en-NG")} views ({formatNaira(defaultMaxViewPayout(viewRate))})
          </button>
        )}
      </Field>
    </div>
  );
}

// One dot per creator spot: the logo's crowd, gathering as the budget grows
const MAX_DOTS = 48;
function SpotDots({ count }: { count: number }) {
  const shown = Math.min(count, MAX_DOTS);
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-ink transition-[scale,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] starting:scale-50 starting:opacity-0"
        />
      ))}
      {count > MAX_DOTS && <span className="ml-1 font-mono text-xs text-muted">+{count - MAX_DOTS}</span>}
    </div>
  );
}

function PlanSummary({ d, flat = false }: { d: Draft; flat?: boolean }) {
  const plan = planFor(d);
  const verified = plan.type === "verified";
  const ready = plan.budget > 0 && plan.viewRate > 0 && (!verified || plan.postRate > 0);
  const firstError = plan.errors[0];

  const lines: { label: string; value: string }[] = [];
  if (ready) {
    if (verified) {
      lines.push({ label: `Posts (${formatNaira(plan.postRate)} each)`, value: formatNaira(plan.postPool) });
      lines.push({ label: "Views", value: formatNaira(plan.viewPool) });
    }
    lines.push({ label: "Paid views, about", value: plan.paidViews.toLocaleString("en-NG") });
    if (!verified) {
      lines.push({
        label: "Creators it can pay",
        value: plan.creatorsMin === plan.creatorsMax ? String(plan.creatorsMin) : `${plan.creatorsMin} to ${plan.creatorsMax}`,
      });
    }
    lines.push({ label: verified ? "Most one creator can earn" : "Most one post can earn", value: formatNaira(plan.maxPerCreator) });
  }

  return (
    <div className={cn(!flat && "rounded-[1.75rem] bg-surface p-6 ring-1 ring-line")}>
      {!flat && <h2 className="font-heading text-lg font-semibold tracking-[-0.01em] text-ink">What this buys</h2>}
      {firstError && plan.budget > 0 && (
        <p className={cn("rounded-2xl bg-warning/10 px-4 py-2.5 text-sm text-warning", !flat && "mt-3")} role="status">
          {firstError.message}
        </p>
      )}

      {!ready ? (
        <p className="mt-2 text-sm text-muted">Enter a budget and your rates to see what they buy.</p>
      ) : (
        <>
          {verified && plan.spots !== null && plan.spots > 0 && (
            <div className={cn("flex flex-col gap-2.5", !flat && "mt-4")}>
              <SpotDots count={plan.spots} />
              <p className="text-ink">
                <span className="font-mono text-lg tabular-nums">{plan.spots}</span> creator {plan.spots === 1 ? "spot" : "spots"}, one post each
              </p>
            </div>
          )}
          <dl className={cn("divide-y divide-line text-sm", verified ? "mt-4" : !flat && "mt-3")}>
            {lines.map((l) => (
              <div key={l.label} className="flex items-baseline justify-between gap-4 py-2">
                <dt className="text-muted">{l.label}</dt>
                <dd className="font-mono text-ink tabular-nums">{l.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {plan.budget > 0 && (
        <dl className="mt-5 rounded-2xl bg-page p-4 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">Budget</dt>
            <dd className="font-mono text-ink tabular-nums">{formatNaira(plan.budget)}</dd>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-4">
            <dt className="text-muted">
              {isLaunchFee(plan.feeRate)
                ? `Launch fee (${Math.round(plan.feeRate * 100)}% until ${LAUNCH_FEE_ENDS_LABEL})`
                : `Fee (${Math.round(plan.feeRate * 100)}%)`}
            </dt>
            <dd className="font-mono text-ink tabular-nums">{formatNaira(plan.fee)}</dd>
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-medium text-ink">You pay</dt>
            <dd className="font-mono text-[1.6rem] leading-none tracking-[-0.02em] text-ink tabular-nums">{formatNaira(plan.total)}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function Success({ created }: { created: Created }) {
  const title = "Paid. Your campaign is in review";
  const body =
    created.type === "verified"
      ? "Our team checks every campaign before creators see it, usually within a day. We may tidy the brief. Once it's approved, verified creators are emailed and spots go first come, first served."
      : "Our team checks every campaign before creators see it, usually within a day. We may tidy the brief. You'll get a notification and an email when it's live.";

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
          Preview
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// When the campaign runs (plan A3): start, end (7 to 30 days later) and
// what those dates mean for creators and results

function CampaignDates({
  d,
  errors,
  setD,
  clearError,
}: {
  d: Draft;
  errors: Errors;
  setD: (update: (prev: Draft) => Draft) => void;
  clearError: (key: "startDate" | "endDate") => void;
}) {
  const length = d.startDate && d.endDate ? daysBetween(d.startDate, d.endDate) : null;
  const valid = length !== null && length >= END_DAYS.min && length <= END_DAYS.max;

  // A new start keeps the chosen length when it can, else two weeks
  const setStart = (startDate: string) => {
    setD((p) => {
      const kept = p.startDate && p.endDate ? daysBetween(p.startDate, p.endDate) : END_DAYS.default;
      const days = kept >= END_DAYS.min && kept <= END_DAYS.max ? kept : END_DAYS.default;
      return { ...p, startDate, endDate: startDate ? addDays(startDate, days) : p.endDate };
    });
    clearError("startDate");
    clearError("endDate");
  };

  const setEnd = (endDate: string) => {
    setD((p) => ({ ...p, endDate }));
    clearError("endDate");
  };

  return (
    <div className="rounded-[1.5rem] bg-surface p-5 ring-1 ring-line sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Starts"
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
            onChange={(e) => setStart(e.target.value)}
            className={FIELD}
            aria-invalid={!!errors.startDate}
          />
        </Field>
        <Field label="Ends" required htmlFor="endDate" error={errors.endDate} hint={`${END_DAYS.min} to ${END_DAYS.max} days after the start.`}>
          <input
            id="endDate"
            type="date"
            min={d.startDate ? addDays(d.startDate, END_DAYS.min) : undefined}
            max={d.startDate ? addDays(d.startDate, END_DAYS.max) : undefined}
            disabled={!d.startDate}
            value={d.endDate}
            onChange={(e) => setEnd(e.target.value)}
            className={FIELD}
            aria-invalid={!!errors.endDate}
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="How long it runs">
        <span className="mr-1 text-sm text-muted">Runs for</span>
        {LENGTHS.map(({ days, label }) => {
          const on = length === days;
          return (
            <button
              key={days}
              type="button"
              disabled={!d.startDate}
              aria-pressed={on}
              onClick={() => setEnd(addDays(d.startDate, days))}
              className={cn(
                "press h-9 rounded-full px-3.5 text-sm font-medium ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                on ? "bg-ink text-page ring-ink" : "bg-page text-ink ring-line enabled:hover:ring-muted/50"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <p className={cn("mt-4 rounded-2xl bg-page px-4 py-3 text-sm text-pretty", valid ? "text-ink" : "text-muted")}>
        {valid && length !== null ? (
          <>
            Creators can post from <strong className="font-semibold">{shortDate(d.startDate)}</strong> to{" "}
            <strong className="font-semibold">{shortDate(d.endDate)}</strong> ({length} days). Views are counted for {VIEW_WINDOW_DAYS} days
            after each post, so your results are final by <strong className="font-semibold">{shortDate(addDays(d.endDate, VIEW_WINDOW_DAYS))}</strong>.
          </>
        ) : d.startDate ? (
          `Pick an end date ${END_DAYS.min} to ${END_DAYS.max} days after the start.`
        ) : (
          "Pick a start date first. The campaign then runs for one to four weeks."
        )}
      </p>
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
        // Shown as 30,000; stored as digits only
        value={value ? Number(value).toLocaleString("en-NG") : ""}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))}
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
