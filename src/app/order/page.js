"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Type,
  Link2,
  Wallet,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Rocket,
  Megaphone,
  Globe2,
  MapPin,
  CalendarDays,
  ImagePlus,
  Trash2,
  Plus,
  Languages,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PLATFORM_ICONS } from "@/components/PlatformIcon";
import {
  PLATFORMS,
  CONTENT_TYPES,
  LANGUAGES,
  REGIONS,
  COUNTRIES,
  ALL,
  MIN_REWARD,
  PLATFORM_FEE_RATE,
  rewardFor,
} from "@/lib/campaignOptions";
import {
  Button,
  Card,
  CardHeader,
  PageHeader,
  Field,
  Input,
  Textarea,
  Select,
  Badge,
  formatNaira,
  cn,
} from "@/components/ui";

// Quick-pick campaign amounts (Naira)
const QUICK_AMOUNTS = [2000, 5000, 10000, 25000];

const INCLUDED = [
  "Your brief published as a posting task",
  "Every post verified before it's paid",
  "Live progress as your budget is used",
];

const MAX_REFERENCE_LINKS = 5;

// Payment references already sent to the server in this tab
const savedReferences = new Set();
const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"];

const EMPTY_FORM = {
  campaignName: "",
  description: "",
  contentType: CONTENT_TYPES[0],
  contentDetails: "",
  platforms: [],
  link: "",
  country: "Nigeria",
  zone: ALL,
  state: ALL,
  languages: ["English"],
  referenceLinks: [""],
  startDate: "",
};

function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// Returns { fieldName: "message" } for every invalid field
function validate(form, amount, bannerFile, participants) {
  const errors = {};

  if (!form.campaignName.trim()) errors.campaignName = "Campaign name is required.";
  if (!form.contentDetails.trim()) errors.contentDetails = "Content details are required.";
  if (form.platforms.length < 1) errors.platforms = "Select at least 1 platform.";

  if (!form.link.trim()) errors.link = "Add the link people should engage with.";
  else if (!isValidUrl(form.link.trim())) errors.link = "Enter a valid URL starting with https://";

  if (!form.startDate) errors.startDate = "Choose a start date.";
  else if (form.startDate < todayISO()) errors.startDate = "Start date can't be in the past.";

  const badLink = form.referenceLinks.find((l) => l.trim() && !isValidUrl(l.trim()));
  if (badLink) errors.referenceLinks = `"${badLink}" isn't a valid URL.`;

  if (form.languages.length < 1) errors.languages = "Select at least 1 language.";

  if (bannerFile && !BANNER_TYPES.includes(bannerFile.type))
    errors.banner = "Banner must be a JPG, PNG or WebP image.";
  else if (bannerFile && bannerFile.size > MAX_BANNER_BYTES)
    errors.banner = "Banner must be 5 MB or smaller.";

  if (!Number(amount) || Number(amount) < 100) errors.amount = "Minimum amount is ₦100.";

  if (!Number.isInteger(Number(participants)) || Number(participants) < 1)
    errors.participants = "Enter at least 1 participant.";
  else if (rewardFor(amount, participants) < MIN_REWARD)
    errors.participants = `Too many participants: each must earn at least ${formatNaira(MIN_REWARD)}. Lower the number or raise the budget.`;

  return errors;
}

// Field ids, in page order, so we can scroll to the first error
const FIELD_ORDER = [
  "campaignName",
  "contentDetails",
  "platforms",
  "link",
  "languages",
  "startDate",
  "banner",
  "referenceLinks",
  "amount",
  "participants",
];

export default function OrderTask() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [amount, setAmount] = useState(5000);
  const [participants, setParticipants] = useState(50);
  const reward = rewardFor(amount, participants);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const zones = REGIONS[form.country] ? Object.keys(REGIONS[form.country]) : [];
  const states =
    REGIONS[form.country] && form.zone !== ALL ? REGIONS[form.country][form.zone] : [];

  // Generic setter that also clears that field's error
  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleIn = (field, value) =>
    set(
      field,
      form[field].includes(value)
        ? form[field].filter((v) => v !== value)
        : [...form[field], value]
    );

  const setCountry = (country) =>
    setForm((prev) => ({ ...prev, country, zone: ALL, state: ALL }));

  const setZone = (zone) => setForm((prev) => ({ ...prev, zone, state: ALL }));

  const updateReferenceLink = (index, value) =>
    set(
      "referenceLinks",
      form.referenceLinks.map((l, i) => (i === index ? value : l))
    );

  const pickBanner = (file) => {
    if (!file) return;
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, banner: undefined }));
  };

  const removeBanner = () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview("");
  };

  const resetForm = () => {
    removeBanner();
    setForm(EMPTY_FORM);
    setErrors({});
  };

  // Uploads the banner to Supabase Storage and returns its public URL
  const uploadBanner = async (userId) => {
    const extension = bannerFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("campaign-banners")
      .upload(path, bannerFile, { contentType: bannerFile.type, upsert: false });

    if (error) throw new Error(`Banner upload failed: ${error.message}`);

    return supabase.storage.from("campaign-banners").getPublicUrl(path).data.publicUrl;
  };

  // Sends the paid campaign to the server, which checks the payment with
  // Paystack before saving. Safe to retry: one reference = one campaign.
  const saveCampaign = async (reference, campaign) => {
    const toastId = toast.loading("Confirming your payment…");

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, campaign }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data.error || "The campaign couldn't be saved.");

      toast.success("Payment confirmed — your campaign is live!", {
        id: toastId,
        description: `Budget ${formatNaira(data.amountPaid)} · ${formatNaira(data.reward)} per approved post.`,
      });
      resetForm();
    } catch (error) {
      console.error("Campaign save error:", error);
      toast.error(error.message, {
        id: toastId,
        description: `Your payment is safe. Reference: ${reference}`,
        duration: Infinity,
        action: { label: "Try again", onClick: () => saveCampaign(reference, campaign) },
      });
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();

    // 1. Validate everything before money is involved
    const found = validate(form, amount, bannerFile, participants);
    setErrors(found);

    const firstError = FIELD_ORDER.find((field) => found[field]);
    if (firstError) {
      toast.error("Please fix the highlighted fields.");
      document
        .getElementById(`field-${firstError}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

    if (!publicKey) {
      console.error("Paystack public key is missing.");
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

    // Snapshot the form so later edits don't change what gets saved
    const campaign = {
      ...form,
      campaignName: form.campaignName.trim(),
      description: form.description.trim(),
      contentDetails: form.contentDetails.trim(),
      link: form.link.trim(),
      referenceLinks: form.referenceLinks.map((l) => l.trim()).filter(Boolean),
      amount: Number(amount),
      participants: Number(participants),
      reward,
    };

    try {
      setLoading(true);

      // 2. Upload the banner first, so a failed upload never follows a payment
      const bannerUrl = bannerFile ? await uploadBanner(user.id) : null;

      // IMPORTANT:
      // Paystack is imported only in the browser after the user
      // clicks the payment button.
      const { default: PaystackPop } = await import("@paystack/inline-js");

      const paystack = new PaystackPop();

      paystack.newTransaction({
        key: publicKey,

        email: user.email,

        amount: campaign.amount * 100,

        reference: `VISIBLE-${Date.now()}`,

        metadata: {
          // Checked by /api/campaigns so a payment can't fund someone else's campaign
          user_id: user.id,
          campaign_name: campaign.campaignName,
          social_link: campaign.link,
          platforms: campaign.platforms.join(", "),
          target_country: campaign.country,
        },

        onSuccess: (transaction) => {
          console.log("Payment successful, transaction ID:", transaction.reference);

          // 3. The server verifies the payment with Paystack, then saves the
          //    campaign. Paystack can fire this twice; save each reference once.
          if (savedReferences.has(transaction.reference)) return;
          savedReferences.add(transaction.reference);

          saveCampaign(transaction.reference, { ...campaign, bannerUrl });
        },

        onCancel: () => {
          console.log("Payment cancelled.");
          toast.info("Payment cancelled.");
        },

        onError: (error) => {
          console.error("Paystack Error:", error);
          toast.error("Payment could not be completed.");
        },
      });
    } catch (error) {
      console.error("Payment setup failed:", error);
      toast.error(error.message || "Unable to initialize payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const targetLabel = [
    form.state !== ALL ? form.state : null,
    form.zone !== ALL ? form.zone : null,
    form.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <PageHeader
        eyebrow="Promote"
        title="Launch a campaign"
        description="Describe your campaign, choose where it runs and who it reaches, then launch it after payment."
      />

      <form
        onSubmit={handlePayment}
        noValidate
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start animate-fade-in"
      >
        <div className="min-w-0 space-y-6">
          {/* ============ 1. CAMPAIGN ============ */}
          <Card>
            <CardHeader
              title="Campaign"
              description="Name your campaign and describe the content."
            />
            <div className="space-y-6 p-6">
              <Field
                label={<Required>Campaign name</Required>}
                htmlFor="field-campaignName"
                error={errors.campaignName}
              >
                <Input
                  id="field-campaignName"
                  icon={Type}
                  placeholder="e.g. Summer Sneaker Drop 2026"
                  maxLength={120}
                  value={form.campaignName}
                  onChange={(e) => set("campaignName", e.target.value)}
                  aria-invalid={!!errors.campaignName}
                />
              </Field>

              <Field
                label="Content description"
                htmlFor="field-description"
                hint="A short summary participants will see on the task card."
              >
                <Textarea
                  id="field-description"
                  rows={2}
                  maxLength={300}
                  placeholder="What is this campaign about?"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>

              <div className="grid gap-6 sm:grid-cols-[220px_minmax(0,1fr)]">
                <Field label="Content type" htmlFor="field-contentType">
                  <Select
                    id="field-contentType"
                    value={form.contentType}
                    onChange={(e) => set("contentType", e.target.value)}
                  >
                    {CONTENT_TYPES.map((type) => (
                      <option key={type}>{type}</option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label={<Required>Content details</Required>}
                  htmlFor="field-contentDetails"
                  error={errors.contentDetails}
                  hint="Key messages, hashtags, what to mention, and anything to avoid."
                >
                  <Textarea
                    id="field-contentDetails"
                    rows={4}
                    maxLength={2000}
                    placeholder="e.g. Highlight the new colourways, tag @mybrand, use #SneakerDrop…"
                    value={form.contentDetails}
                    onChange={(e) => set("contentDetails", e.target.value)}
                    aria-invalid={!!errors.contentDetails}
                  />
                </Field>
              </div>
            </div>
          </Card>

          {/* ============ 2. PLATFORMS ============ */}
          <Card>
            <CardHeader
              title="Platforms"
              description="Where should people engage with your content?"
            />
            <div className="space-y-6 p-6">
              <div id="field-platforms">
                <p className="mb-2.5 text-sm font-medium text-ink-700">
                  <Required>Campaign platforms</Required>
                </p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((name) => (
                    <Chip
                      key={name}
                      icon={PLATFORM_ICONS[name]}
                      active={form.platforms.includes(name)}
                      onClick={() => toggleIn("platforms", name)}
                    >
                      {name}
                    </Chip>
                  ))}
                </div>
                <FieldError message={errors.platforms} />
              </div>

              <Field
                label="Reference link"
                htmlFor="field-link"
                error={errors.link}
                hint="Sample reference post if any."
              >
                <Input
                  id="field-link"
                  type="url"
                  icon={Link2}
                  placeholder="https://instagram.com/p/..."
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                  aria-invalid={!!errors.link}
                />
              </Field>
            </div>
          </Card>

          {/* ============ 3. AUDIENCE ============ */}
          <Card>
            <CardHeader
              title="Audience"
              description="Target a country, zone and state, and choose languages."
            />
            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Target country" htmlFor="field-country">
                  <Select
                    id="field-country"
                    value={form.country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="Zone" htmlFor="field-zone">
                  <Select
                    id="field-zone"
                    value={form.zone}
                    disabled={!zones.length}
                    onChange={(e) => setZone(e.target.value)}
                  >
                    <option value={ALL}>{zones.length ? "All zones" : "Nationwide"}</option>
                    {zones.map((z) => (
                      <option key={z}>{z}</option>
                    ))}
                  </Select>
                </Field>

                <Field label="State" htmlFor="field-state">
                  <Select
                    id="field-state"
                    value={form.state}
                    disabled={!states.length}
                    onChange={(e) => set("state", e.target.value)}
                  >
                    <option value={ALL}>
                      {states.length ? "All states" : zones.length ? "Pick a zone first" : "Nationwide"}
                    </option>
                    {states.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div id="field-languages">
                <p className="mb-2.5 text-sm font-medium text-ink-700">Languages</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <Chip
                      key={lang}
                      icon={Languages}
                      active={form.languages.includes(lang)}
                      onClick={() => toggleIn("languages", lang)}
                    >
                      {lang}
                    </Chip>
                  ))}
                </div>
                <FieldError message={errors.languages} />
              </div>
            </div>
          </Card>

          {/* ============ 4. SCHEDULE & CREATIVE ============ */}
          <Card>
            <CardHeader
              title="Schedule & creative"
              description="When the campaign starts, its banner, and reference material."
            />
            <div className="space-y-6 p-6">
              <Field
                label={<Required>Start date</Required>}
                htmlFor="field-startDate"
                error={errors.startDate}
                className="sm:max-w-xs"
              >
                <Input
                  id="field-startDate"
                  type="date"
                  icon={CalendarDays}
                  min={todayISO()}
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  aria-invalid={!!errors.startDate}
                />
              </Field>

              {/* Banner upload */}
              <div id="field-banner">
                <p className="mb-2.5 text-sm font-medium text-ink-700">Banner</p>
                {bannerPreview ? (
                  <div className="relative overflow-hidden rounded-2xl border border-ink-200">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                    <img
                      src={bannerPreview}
                      alt="Campaign banner preview"
                      className="aspect-[3/1] w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-ink-950/80 to-transparent px-4 pb-3 pt-8">
                      <p className="truncate text-xs font-medium text-white">{bannerFile?.name}</p>
                      <Button type="button" variant="secondary" size="sm" icon={Trash2} onClick={removeBanner}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="banner-input"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      pickBanner(e.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
                      errors.banner
                        ? "border-red-300 bg-red-50/40"
                        : "border-ink-200 bg-ink-50/50 hover:border-brand-300 hover:bg-brand-50/40"
                    )}
                  >
                    <span className="rounded-xl bg-white p-2.5 text-brand-600 shadow-soft">
                      <ImagePlus className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-ink-800">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-ink-400">
                      JPG, PNG or WebP · up to 5 MB · 1500×500 recommended
                    </span>
                  </label>
                )}
                <input
                  id="banner-input"
                  type="file"
                  accept={BANNER_TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    pickBanner(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <FieldError message={errors.banner} />
              </div>

              {/* Reference links */}
              <div id="field-referenceLinks">
                <p className="mb-1 text-sm font-medium text-ink-700">Reference material links</p>
                <p className="mb-2.5 text-xs text-ink-400">
                  Brand guidelines, example posts, product pages — up to {MAX_REFERENCE_LINKS}.
                </p>
                <div className="space-y-2">
                  {form.referenceLinks.map((value, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="url"
                        icon={Link2}
                        placeholder="https://..."
                        value={value}
                        onChange={(e) => updateReferenceLink(index, e.target.value)}
                        aria-label={`Reference link ${index + 1}`}
                      />
                      {form.referenceLinks.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              "referenceLinks",
                              form.referenceLinks.filter((_, i) => i !== index)
                            )
                          }
                          className="shrink-0 rounded-xl border border-ink-200 px-3 text-ink-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Remove reference link ${index + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {form.referenceLinks.length < MAX_REFERENCE_LINKS && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={Plus}
                    className="mt-2"
                    onClick={() => set("referenceLinks", [...form.referenceLinks, ""])}
                  >
                    Add another link
                  </Button>
                )}
                <FieldError message={errors.referenceLinks} />
              </div>
            </div>
          </Card>

          {/* ============ 5. BUDGET ============ */}
          <Card>
            <CardHeader title="Budget" description="How much would you like to spend?" />
            <div className="p-6">
              <Field
                label="Campaign amount"
                htmlFor="field-amount"
                hint="Minimum ₦100."
                error={errors.amount}
              >
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUICK_AMOUNTS.map((value) => {
                    const active = Number(amount) === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmount(value)}
                        aria-pressed={active}
                        className={cn(
                          "tabular h-10 rounded-xl border text-sm font-semibold transition-all",
                          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15",
                          active
                            ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft"
                            : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50"
                        )}
                      >
                        {formatNaira(value)}
                      </button>
                    );
                  })}
                </div>

                <Input
                  id="field-amount"
                  type="number"
                  min="100"
                  icon={Wallet}
                  className="tabular"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </Field>

              <Field
                label="Number of participants"
                htmlFor="field-participants"
                hint="How many approved engagements your budget should pay for."
                error={errors.participants}
                className="mt-6"
              >
                <Input
                  id="field-participants"
                  type="number"
                  min="1"
                  step="1"
                  icon={Users}
                  className="tabular"
                  value={participants}
                  onChange={(e) => {
                    setParticipants(e.target.value === "" ? "" : Number(e.target.value));
                    if (errors.participants) setErrors((prev) => ({ ...prev, participants: undefined }));
                  }}
                />
              </Field>

              {/* Live budget breakdown */}
              <div className="mt-6 grid grid-cols-3 divide-x divide-ink-200 overflow-hidden rounded-xl border border-ink-200 bg-ink-50/60 text-center">
                <BudgetStat label="Budget" value={formatNaira(amount)} />
                <BudgetStat label="Participants" value={Number(participants) || 0} />
                <BudgetStat
                  label="Reward each"
                  value={formatNaira(reward)}
                  highlight={reward >= MIN_REWARD}
                />
              </div>
              <p className="mt-2 text-xs text-ink-400">
                Each approved engagement pays {formatNaira(reward)} from your budget
                {PLATFORM_FEE_RATE > 0 && ` (after a ${PLATFORM_FEE_RATE * 100}% platform fee)`}.
                The campaign closes automatically once all spots are filled.
              </p>
            </div>
          </Card>
        </div>

        {/* ============ ORDER SUMMARY ============ */}
        <Card className="min-w-0 overflow-hidden lg:sticky lg:top-6">
          {bannerPreview && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img src={bannerPreview} alt="" className="aspect-[3/1] w-full object-cover" />
          )}

          <div className="border-b border-ink-100 bg-ink-50/60 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
              Order summary
            </p>
            <div className="mt-3 flex items-start gap-3">
              <span className="rounded-xl bg-brand-50 p-2 text-brand-600">
                <Megaphone className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">
                  {form.campaignName.trim() || "Untitled campaign"}
                </p>
                <p className="truncate text-sm text-ink-500">{form.contentType}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <dl className="space-y-3 text-sm">
              <SummaryRow icon={Globe2} label="Platforms">
                {form.platforms.length ? (
                  <span className="flex flex-wrap justify-end gap-1">
                    {form.platforms.map((p) => (
                      <Badge key={p} tone="brand">{p}</Badge>
                    ))}
                  </span>
                ) : (
                  <span className="text-ink-300">None selected</span>
                )}
              </SummaryRow>
              <SummaryRow icon={MapPin} label="Target">{targetLabel}</SummaryRow>
              <SummaryRow icon={Languages} label="Languages">
                {form.languages.join(", ") || <span className="text-ink-300">None</span>}
              </SummaryRow>
              <SummaryRow icon={Users} label="Participants">
                {Number(participants) || 0} × {formatNaira(reward)}
              </SummaryRow>
              <SummaryRow icon={CalendarDays} label="Starts">
                {form.startDate ? (
                  new Date(`${form.startDate}T00:00:00`).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                ) : (
                  <span className="text-ink-300">Not set</span>
                )}
              </SummaryRow>
            </dl>

            <div className="flex items-baseline justify-between gap-3 border-t border-ink-100 pt-5">
              <span className="text-sm font-medium text-ink-500">Total due</span>
              <span className="tabular font-display text-3xl font-semibold tracking-tight text-ink-950">
                {formatNaira(amount)}
              </span>
            </div>

            <ul className="space-y-2.5 border-t border-ink-100 pt-5">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-600">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                    strokeWidth={2.25}
                  />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              loading={loading}
              icon={Rocket}
              className="w-full"
            >
              {loading ? "Opening Payment..." : `Pay ${formatNaira(amount)} & Launch`}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-ink-500">
              <Lock className="h-3.5 w-3.5" strokeWidth={2.25} />
              <span>Secured by Paystack</span>
              <span className="text-ink-300">·</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.25} />
              <span>Encrypted checkout</span>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

// ---------------------------------------------------------

function Required({ children }) {
  return (
    <>
      {children} <span className="text-red-500" aria-hidden="true">*</span>
      <span className="sr-only">(required)</span>
    </>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

function Chip({ icon: Icon, active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium transition-all",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/15",
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft"
          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50"
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
      {active && <CheckCircle2 className="h-3.5 w-3.5 text-brand-600" />}
    </button>
  );
}

function BudgetStat({ label, value, highlight }) {
  return (
    <div className="px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className={cn("tabular mt-1 font-semibold", highlight ? "text-emerald-600" : "text-ink-900")}>
        {value}
      </p>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="flex shrink-0 items-center gap-2 text-ink-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className="min-w-0 text-right font-medium text-ink-800">{children}</dd>
    </div>
  );
}
