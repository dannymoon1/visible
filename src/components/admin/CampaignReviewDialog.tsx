"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { CircleCheckBig, ImagePlus, Save, Trash2, X, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { dispatchNotificationEmails } from "@/components/NotificationBell";
import { Button, Field, Input, Textarea, cn, formatNaira } from "@/components/ui";
import {
  CAMPAIGN_TYPE_LABEL,
  campaignTypeOf,
  payModelOf,
  targetLabel,
  taskRateLabel,
} from "@/components/campaigns/campaign-utils";
import {
  BRIEF_MAX,
  LANGUAGES,
  MAX_REFERENCE_LINKS,
  NAME_MAX,
  PLATFORMS,
  PLATFORM_LABELS,
  type Platform,
} from "@/lib/campaignOptions";
import type { Json, Task } from "@/lib/types";

// Admin review (decided 2026-11-19). A paid campaign waits here until an admin
// has read it. The admin can correct or add to anything creators will read,
// then approve it (it goes live) or reject it (the business is refunded).
// Pay is never editable: it is what the business paid for.

const MAX_BANNER_BYTES = 2 * 1024 * 1024;
const BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type ReviewMode = "review" | "edit";

type Editable = Pick<
  Task,
  "title" | "description" | "platforms" | "platform" | "languages" | "reference_links" | "banner_url" | "start_date"
>;

export type ReviewResult = Partial<Editable> &
  Partial<Pick<Task, "status" | "review_note" | "reviewed_at">>;

interface Props {
  task: Task;
  advertiser: string;
  mode: ReviewMode;
  onClose: () => void;
  onDone: (taskId: string, changes: ReviewResult) => void;
}

const isPlatform = (value: string): value is Platform => (PLATFORMS as readonly string[]).includes(value);

function readStartDate(data: Json): string | undefined {
  if (typeof data !== "object" || data === null || Array.isArray(data)) return undefined;
  return typeof data.start_date === "string" ? data.start_date : undefined;
}

export default function CampaignReviewDialog({ task, advertiser, mode, onClose, onDone }: Props) {
  const [title, setTitle] = useState(task.title ?? "");
  const [brief, setBrief] = useState(task.description ?? "");
  const [platforms, setPlatforms] = useState<Platform[]>((task.platforms ?? []).filter(isPlatform));
  const [languages, setLanguages] = useState<string[]>(task.languages ?? []);
  const [links, setLinks] = useState<string[]>(() => {
    const existing = (task.reference_links ?? []).slice(0, MAX_REFERENCE_LINKS);
    return existing.length ? existing : [""];
  });
  const [bannerUrl, setBannerUrl] = useState(task.banner_url ?? "");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [startDate, setStartDate] = useState(task.start_date?.slice(0, 10) ?? "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "save" | "approve" | "reject">(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Free the preview blob when it changes or the dialog closes
  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const pickBanner = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!BANNER_TYPES.includes(file.type)) return void toast.error("The banner must be a JPG, PNG or WebP image.");
    if (file.size > MAX_BANNER_BYTES) return void toast.error("The banner must be 2 MB or smaller.");
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const clearBanner = () => {
    setBannerFile(null);
    setBannerPreview("");
    setBannerUrl("");
  };

  // Write the edits. Returns the saved fields, or null after showing an error.
  const saveEdits = async (): Promise<Editable | null> => {
    let banner = bannerUrl || null;
    if (bannerFile) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Your session has ended. Log in again.");
        return null;
      }
      const extension = bannerFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${extension}`;
      const { error } = await supabase.storage
        .from("campaign-banners")
        .upload(path, bannerFile, { contentType: bannerFile.type, upsert: false });
      if (error) {
        toast.error(`Banner upload failed: ${error.message}`);
        return null;
      }
      banner = supabase.storage.from("campaign-banners").getPublicUrl(path).data.publicUrl;
    }

    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    const { error } = await supabase.rpc("admin_update_campaign", {
      p_task_id: task.id,
      p_title: title,
      p_description: brief,
      p_platforms: platforms,
      p_languages: languages,
      p_reference_links: cleanLinks,
      p_banner_url: banner ?? "",
      p_start_date: startDate,
      p_target_country: task.target_country ?? "",
      p_target_zone: task.target_zone ?? "",
      p_target_state: task.target_state ?? "",
    });
    if (error) {
      toast.error(error.message);
      return null;
    }

    setBannerUrl(banner ?? "");
    setBannerFile(null);
    return {
      title: title.trim(),
      description: brief.trim(),
      platforms,
      platform: platforms.join(", "),
      languages,
      reference_links: cleanLinks,
      banner_url: banner,
      start_date: startDate,
    };
  };

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy("save");
    const saved = await saveEdits();
    setBusy(null);
    if (!saved) return;
    toast.success("Changes saved");
    onDone(task.id, saved);
    onClose();
  };

  const approve = async () => {
    setBusy("approve");
    const saved = await saveEdits();
    if (!saved) return setBusy(null);

    const { data, error } = await supabase.rpc("review_campaign", {
      p_task_id: task.id,
      p_action: "approve",
      p_note: note.trim() || undefined,
    });
    setBusy(null);
    if (error) {
      // The edits are saved; only the approval failed
      onDone(task.id, saved);
      toast.error(error.message);
      return;
    }
    dispatchNotificationEmails();
    toast.success(`"${saved.title}" is approved`, { description: "The business has been told." });
    onDone(task.id, {
      ...saved,
      status: "active",
      start_date: readStartDate(data) ?? saved.start_date,
      review_note: note.trim() || null,
      reviewed_at: new Date().toISOString(),
    });
    onClose();
  };

  const reject = async () => {
    if (!note.trim()) {
      toast.error("Tell the business why in the note.");
      return;
    }
    setBusy("reject");
    const { error } = await supabase.rpc("review_campaign", {
      p_task_id: task.id,
      p_action: "reject",
      p_note: note.trim(),
    });
    setBusy(null);
    if (error) return void toast.error(error.message);
    dispatchNotificationEmails();
    toast.success(`"${task.title}" was not approved`, {
      description: `Refund ${formatNaira(task.amount_paid)} in Paystack (reference ${task.payment_reference ?? "—"}).`,
      duration: 15000,
    });
    onDone(task.id, { status: "rejected", review_note: note.trim(), reviewed_at: new Date().toISOString() });
    onClose();
  };

  const verified = campaignTypeOf(task) === "verified";
  const perViews = payModelOf(task) === "per_1k_views";
  const shownBanner = bannerPreview || bannerUrl;
  const location = targetLabel(task) || task.target_country || "Anywhere";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
      onKeyDown={(e) => e.key === "Escape" && !busy && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        onSubmit={mode === "edit" ? save : (e) => e.preventDefault()}
        className="my-4 w-full max-w-2xl animate-fade-in rounded-2xl bg-white shadow-lifted"
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-6 py-5">
          <div>
            <h2 id="review-title" className="font-semibold text-ink-900">
              {mode === "review" ? "Review campaign" : "Edit campaign"}
            </h2>
            <p className="mt-0.5 text-sm text-ink-500">
              {mode === "review"
                ? "Correct or add to anything creators will read, then approve or reject."
                : "Changes show to creators straight away."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(busy)}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* What was paid for: read only */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl bg-ink-50 p-4 text-sm sm:grid-cols-3">
            <Fact label="Business">{advertiser}</Fact>
            <Fact label="Type">{CAMPAIGN_TYPE_LABEL[campaignTypeOf(task)]}</Fact>
            <Fact label="Rate">{taskRateLabel(task)}</Fact>
            <Fact label={verified ? "Creator spots" : perViews ? "Posts" : "Posts paid for"}>
              {task.max_participants ?? (perViews ? "No cap" : "—")}
            </Fact>
            <Fact label="Paid">{formatNaira(task.amount_paid)}</Fact>
            <Fact label="Audience">{location}</Fact>
          </dl>
          <p className="-mt-3 text-xs text-ink-400">
            Pay can&apos;t be changed here. If it&apos;s wrong, reject the campaign and refund it.
          </p>

          <Field label="Campaign name" htmlFor="rv-title" hint={`${title.length}/${NAME_MAX}`}>
            <Input id="rv-title" value={title} maxLength={NAME_MAX} onChange={(e) => setTitle(e.target.value)} required />
          </Field>

          <Field
            label="Brief"
            htmlFor="rv-brief"
            hint={
              <span className={cn(brief.length >= BRIEF_MAX - 50 && "text-amber-600")}>
                {brief.length}/{BRIEF_MAX} · a brief, never a script
              </span>
            }
          >
            <Textarea id="rv-brief" rows={6} value={brief} maxLength={BRIEF_MAX} onChange={(e) => setBrief(e.target.value)} required />
          </Field>

          <Field label="Banner">
            <div className="flex flex-wrap items-center gap-3">
              {shownBanner ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL or a local preview
                <img src={shownBanner} alt="Campaign banner" className="aspect-video w-40 rounded-lg object-cover" />
              ) : (
                <span className="flex aspect-video w-40 items-center justify-center rounded-lg bg-ink-100 text-xs text-ink-400">
                  No banner
                </span>
              )}
              <input ref={fileRef} type="file" accept={BANNER_TYPES.join(",")} className="hidden" onChange={pickBanner} />
              <Button type="button" size="sm" variant="secondary" icon={ImagePlus} onClick={() => fileRef.current?.click()}>
                {shownBanner ? "Replace" : "Add banner"}
              </Button>
              {shownBanner && (
                <Button type="button" size="sm" variant="secondary" icon={Trash2} onClick={clearBanner}>
                  Remove
                </Button>
              )}
            </div>
          </Field>

          <Field label="Reference links" hint={`Optional, up to ${MAX_REFERENCE_LINKS}. Hidden from creators when empty.`}>
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="url"
                    value={link}
                    placeholder="https://"
                    aria-label={`Reference link ${i + 1}`}
                    onChange={(e) => setLinks((cur) => cur.map((l, j) => (j === i ? e.target.value : l)))}
                  />
                  {links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLinks((cur) => cur.filter((_, j) => j !== i))}
                      className="shrink-0 rounded-lg px-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                      aria-label={`Remove link ${i + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {links.length < MAX_REFERENCE_LINKS && (
                <button
                  type="button"
                  onClick={() => setLinks((cur) => [...cur, ""])}
                  className="text-sm font-semibold text-ink-700 underline underline-offset-4"
                >
                  Add a link
                </button>
              )}
            </div>
          </Field>

          <Field label="Platforms">
            <Chips
              options={PLATFORMS.map((p) => ({ value: p, label: PLATFORM_LABELS[p] }))}
              selected={platforms}
              onToggle={(v) => setPlatforms((cur) => toggle(cur, v as Platform))}
            />
          </Field>

          <Field label="Languages">
            <Chips
              options={LANGUAGES.map((l) => ({ value: l, label: l }))}
              selected={languages}
              onToggle={(v) => setLanguages((cur) => toggle(cur, v))}
            />
          </Field>

          <Field
            label="Start date"
            htmlFor="rv-start"
            hint={mode === "review" ? "If this date has passed when you approve, the campaign starts today." : undefined}
          >
            <Input id="rv-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="sm:w-56" />
          </Field>

          {mode === "review" && (
            <Field
              label="Note to the business"
              htmlFor="rv-note"
              hint="Optional when approving (e.g. what you changed). Required to reject. They see it in their notification and email."
            >
              <Textarea
                id="rv-note"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. We shortened the brief and added your Instagram page as a reference."
              />
            </Field>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-ink-100 px-6 py-4 sm:flex-row sm:justify-end">
          {mode === "review" ? (
            <>
              <Button type="button" variant="danger" icon={XCircle} loading={busy === "reject"} disabled={Boolean(busy)} onClick={reject}>
                Reject
              </Button>
              <Button type="button" variant="secondary" icon={Save} loading={busy === "save"} disabled={Boolean(busy)} onClick={() => save()}>
                Save, decide later
              </Button>
              <Button type="button" variant="success" icon={CircleCheckBig} loading={busy === "approve"} disabled={Boolean(busy)} onClick={approve}>
                Approve and publish
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={Boolean(busy)}>
                Cancel
              </Button>
              <Button type="submit" icon={Save} loading={busy === "save"}>
                Save changes
              </Button>
            </>
          )}
        </div>
      </form>
    </div>,
    document.body
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-[0.14em] text-ink-400 uppercase">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-ink-800">{children}</dd>
    </div>
  );
}

function Chips({
  options,
  selected,
  onToggle,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className={cn(
              "h-9 rounded-full border px-3.5 text-sm font-medium transition",
              on ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:border-ink-400"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
