"use client";

import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import {
  ArrowsClockwise,
  At,
  Basket,
  Camera,
  ChatCircleText,
  CircleNotch,
  Confetti,
  DeviceMobile,
  Dress,
  ForkKnife,
  Globe,
  HairDryer,
  ImageSquare,
  LinkSimple,
  MapPin,
  PushPin,
  Trash,
  WhatsappLogo,
  X,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { platformIcon } from "@/components/PlatformIcon";
import { BRAND_COLORS } from "@/components/icons/brands";
import { BRIEF_EXAMPLES, briefGaps, isUntouchedExample, type BriefExample } from "@/lib/briefExamples";
import { CONTACT_LABELS, CONTACT_TYPES, type ContactType } from "@/lib/campaignContact";
import { describeLink } from "@/lib/referenceLinks";
import { cn } from "@/lib/cn";

// The builder's first step, "The campaign" (campaign creation plan, screen 4):
// example briefs to start from, the gaps left to fill, how customers reach the
// business, the banner and the posts the brand likes.

export const FIELD =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-signal focus:ring-4 focus:ring-signal/15 disabled:opacity-60";

const EXAMPLE_ICONS: Record<string, PhosphorIcon> = {
  food: ForkKnife,
  beauty: HairDryer,
  fashion: Dress,
  gadgets: DeviceMobile,
  events: Confetti,
  shops: Basket,
};

// ---------------------------------------------------------------
// Brief: start from an example

export function BriefExamples({ brief, onUse }: { brief: string; onUse: (example: BriefExample) => void }) {
  const [asking, setAsking] = useState<BriefExample | null>(null);
  const current = BRIEF_EXAMPLES.find((e) => e.brief === brief.trim())?.key;

  const pick = (example: BriefExample) => {
    // Only ask before replacing words the brand wrote themselves
    if (brief.trim() && !isUntouchedExample(brief)) setAsking(example);
    else onUse(example);
  };

  return (
    <div className="mb-3">
      <p className="mb-2 text-sm text-muted">Start from an example</p>
      {/* One scrolling row on phones, wrapped on larger screens */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {BRIEF_EXAMPLES.map((example) => {
          const Icon = EXAMPLE_ICONS[example.key] ?? ForkKnife;
          const on = current === example.key;
          return (
            <button
              key={example.key}
              type="button"
              onClick={() => pick(example)}
              aria-pressed={on}
              className={cn(
                "press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap ring-1 transition-colors",
                on ? "bg-ink text-white ring-ink" : "bg-surface text-ink ring-line hover:ring-muted/50"
              )}
            >
              <Icon weight={on ? "fill" : "regular"} className="h-4 w-4" aria-hidden="true" />
              {example.label}
            </button>
          );
        })}
      </div>

      {asking && (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-surface px-4 py-3 text-sm ring-1 ring-line">
          <p className="min-w-0 flex-1 text-ink">Replace what you&apos;ve written with the {asking.label.toLowerCase()} example?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAsking(null)} className="press h-9 rounded-full px-3.5 font-semibold text-muted hover:bg-page hover:text-ink">
              Keep mine
            </button>
            <button
              type="button"
              onClick={() => {
                onUse(asking);
                setAsking(null);
              }}
              className="press h-9 rounded-full bg-ink px-4 font-semibold text-white hover:bg-ink/90"
            >
              Replace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// The [gaps] still to fill. A tap selects the gap in the brief, so typing
// replaces it.
export function BriefGaps({ brief, textareaId }: { brief: string; textareaId: string }) {
  const gaps = briefGaps(brief);
  if (!gaps.length) return null;
  const select = (start: number, end: number) => {
    const el = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!el) return;
    el.focus();
    el.setSelectionRange(start, end);
  };
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-sm">
      <span className="mr-0.5 text-muted">
        {gaps.length === 1 ? "1 gap to fill:" : `${gaps.length} gaps to fill:`}
      </span>
      {gaps.map((g, i) => (
        <button
          key={`${g.start}-${i}`}
          type="button"
          onClick={() => select(g.start, g.end)}
          className="press rounded-lg bg-warning/12 px-2 py-0.5 font-medium text-warning hover:bg-warning/20"
        >
          {g.text}
        </button>
      ))}
    </div>
  );
}

const GUIDE: { icon: PhosphorIcon; lead: string; text: string }[] = [
  { icon: Camera, lead: "Show", text: "what to film or photograph" },
  { icon: ChatCircleText, lead: "Say", text: "the point, in their own words" },
  { icon: PushPin, lead: "Mention", text: "where, prices, how to order" },
];

export function BriefGuide() {
  return (
    <ul className="mt-2.5 grid gap-1.5 text-xs text-muted sm:grid-cols-3 sm:gap-3">
      {GUIDE.map(({ icon: Icon, lead, text }) => (
        <li key={lead} className="flex items-start gap-1.5">
          <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-semibold text-ink">{lead}</span> {text}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------
// How customers reach you

const CONTACT_ICONS: Record<ContactType, PhosphorIcon> = {
  whatsapp: WhatsappLogo,
  social: At,
  website: Globe,
  address: MapPin,
};

const CONTACT_INPUT: Record<ContactType, { placeholder: string; inputMode: "tel" | "url" | "text"; type: string; autoComplete: string }> = {
  whatsapp: { placeholder: "0801 234 5678", inputMode: "tel", type: "tel", autoComplete: "tel-national" },
  social: { placeholder: "instagram.com/yourshop", inputMode: "url", type: "text", autoComplete: "url" },
  website: { placeholder: "yourshop.com", inputMode: "url", type: "text", autoComplete: "url" },
  address: { placeholder: "12 Aka Road, Uyo", inputMode: "text", type: "text", autoComplete: "street-address" },
};

export function ContactField({
  id,
  type,
  value,
  invalid,
  onType,
  onValue,
}: {
  id: string;
  type: ContactType;
  value: string;
  invalid: boolean;
  onType: (type: ContactType) => void;
  onValue: (value: string) => void;
}) {
  const input = CONTACT_INPUT[type];
  const Icon = CONTACT_ICONS[type];
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="How customers reach you">
        {CONTACT_TYPES.map((t) => {
          const TIcon = CONTACT_ICONS[t];
          const on = t === type;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                onType(t);
                requestAnimationFrame(() => document.getElementById(id)?.focus());
              }}
              className={cn(
                "press inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ring-1 transition-colors",
                on ? "bg-ink text-white ring-ink" : "bg-surface text-ink ring-line hover:ring-muted/50"
              )}
            >
              <TIcon weight={on ? "fill" : "regular"} className="h-4 w-4" aria-hidden="true" />
              {CONTACT_LABELS[t]}
            </button>
          );
        })}
      </div>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-4 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={id}
          type={input.type}
          inputMode={input.inputMode}
          autoComplete={input.autoComplete}
          value={value}
          maxLength={type === "address" ? 160 : 300}
          onChange={(e) => onValue(e.target.value)}
          placeholder={input.placeholder}
          className={cn(FIELD, "pl-11", type === "whatsapp" && "font-mono tracking-wide")}
          aria-invalid={invalid}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// Banner: tap, drag a file in, or paste

export function BannerDrop({
  id,
  previewUrl,
  sizeLabel,
  busy,
  invalid,
  onFile,
  onRemove,
}: {
  id: string;
  previewUrl: string;
  sizeLabel: string | null;
  busy: boolean;
  invalid: boolean;
  onFile: (file: File | null | undefined) => void;
  onRemove: () => void;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    onFile(e.dataTransfer.files?.[0]);
  };
  const onPaste = (e: ClipboardEvent) => {
    const file = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      onFile(file);
    }
  };
  const fileInput = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      className="sr-only"
      onChange={(e) => {
        onFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (previewUrl) {
    return (
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-line" onPaste={onPaste}>
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
        <img src={previewUrl} alt="Banner preview" className="aspect-video w-full object-cover" />
        {busy && <Preparing />}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
          {sizeLabel ? (
            <span className="rounded-full bg-black/55 px-2.5 py-1 font-mono text-xs text-white backdrop-blur">{sizeLabel}</span>
          ) : (
            <span />
          )}
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-sm font-medium text-white backdrop-blur hover:bg-black/70"
            >
              <ArrowsClockwise className="h-4 w-4" aria-hidden="true" />
              Replace
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-black/55 px-3 text-sm font-medium text-white backdrop-blur hover:bg-black/70"
            >
              <Trash className="h-4 w-4" aria-hidden="true" />
              Remove
            </button>
          </span>
        </div>
        {fileInput}
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      tabIndex={-1}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      className={cn(
        "relative flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed text-center transition-colors sm:h-44",
        over ? "border-signal bg-signal/5" : invalid ? "border-error bg-surface" : "border-line bg-surface hover:border-muted/60"
      )}
    >
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-colors", over ? "bg-signal/10 ring-signal/30" : "bg-page ring-line")}>
        <ImageSquare weight="duotone" className={cn("h-6 w-6", over ? "text-signal" : "text-muted")} aria-hidden="true" />
      </span>
      <span className="px-4 text-sm text-muted">
        <span className="hidden sm:inline">Drop a photo here, paste one, or </span>
        <span className="font-semibold text-ink underline decoration-line decoration-2 underline-offset-4 sm:font-medium">
          <span className="sm:hidden">Choose a photo</span>
          <span className="hidden sm:inline">browse</span>
        </span>
      </span>
      {busy && <Preparing />}
      {fileInput}
    </label>
  );
}

function Preparing() {
  return (
    <span className="absolute inset-0 flex items-center justify-center gap-2 bg-surface/80 text-sm font-medium text-ink backdrop-blur-sm">
      <CircleNotch className="h-4 w-4 animate-spin" aria-hidden="true" />
      Preparing your photo…
    </span>
  );
}

// ---------------------------------------------------------------
// Posts you like: pasted links become chips with the platform's logo

// "tiktok.com/@x/video/1" → "https://tiktok.com/@x/video/1"; null if not a link
export function cleanLink(raw: string): string | null {
  const input = raw.trim();
  if (!input || /\s/.test(input)) return null;
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const url = new URL(withScheme);
    return url.hostname.includes(".") ? url.toString() : null;
  } catch {
    return null;
  }
}

export function ReferenceLinks({
  id,
  links,
  max,
  invalid,
  onChange,
  onError,
}: {
  id: string;
  links: string[];
  max: number;
  invalid: boolean;
  onChange: (links: string[]) => void;
  onError: (message: string | undefined) => void;
}) {
  const [text, setText] = useState("");

  const add = (raw: string): boolean => {
    const link = cleanLink(raw);
    if (!link) {
      onError(`"${raw.trim()}" isn't a link. Copy the address of a post and paste it here.`);
      return false;
    }
    if (links.includes(link)) {
      onError("That link is already added.");
      return false;
    }
    onChange([...links, link]);
    onError(undefined);
    setText("");
    return true;
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    // Enter adds the link here, instead of moving to the next step
    e.preventDefault();
    e.stopPropagation();
    if (text.trim()) add(text);
  };

  // A pasted link is added straight away
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (!text.trim() && cleanLink(pasted)) {
      e.preventDefault();
      add(pasted);
    }
  };

  return (
    <div>
      {links.length > 0 && (
        <ul className="mb-2.5 flex flex-wrap gap-2">
          {links.map((href) => {
            const { platform, label } = describeLink(href);
            const Icon = platform ? platformIcon(platform) : null;
            return (
              <li key={href} className="flex h-10 max-w-full items-center gap-2 rounded-full bg-surface pr-1 pl-3 ring-1 ring-line">
                {Icon ? (
                  <span style={{ color: BRAND_COLORS[platform as string] }} className="shrink-0">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                ) : (
                  <Globe className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                )}
                <a href={href} target="_blank" rel="noreferrer" className="truncate text-sm font-medium text-ink hover:underline" title={href}>
                  {label}
                </a>
                <button
                  type="button"
                  onClick={() => onChange(links.filter((l) => l !== href))}
                  aria-label={`Remove ${label}`}
                  className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-page hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {links.length < max && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkSimple className="pointer-events-none absolute top-1/2 left-4 h-[1.1rem] w-[1.1rem] -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              id={id}
              type="url"
              inputMode="url"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (invalid) onError(undefined);
              }}
              onKeyDown={onKey}
              onPaste={onPaste}
              onBlur={() => text.trim() && add(text)}
              placeholder="Paste a link to a post"
              className={cn(FIELD, "pl-11")}
              aria-invalid={invalid}
            />
          </div>
          <button
            type="button"
            onClick={() => text.trim() && add(text)}
            disabled={!text.trim()}
            className="press h-12 shrink-0 rounded-2xl px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-surface disabled:opacity-45"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
