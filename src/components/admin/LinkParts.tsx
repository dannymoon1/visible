"use client";

import { createElement, type ReactNode } from "react";
import {
  Facebook,
  FileText,
  Instagram,
  Link2,
  Linkedin,
  Mail,
  MessageCircle,
  Music2,
  Send,
  Twitter,
  UserRound,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { Database } from "@/lib/database.types";
import { cn } from "@/lib/cn";
import { CHANNELS } from "@/lib/trackingLinks";
import type { SelectOption } from "@/components/ui/SelectMenu";

// Pieces shared by /admin/links and /admin/links/[slug]

export type LinkRow = Database["public"]["Tables"]["tracking_links"]["Row"];
export type StatRow = Database["public"]["Functions"]["link_stats"]["Returns"][number];

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  whatsapp: MessageCircle,
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  x: Twitter,
  telegram: Send,
  linkedin: Linkedin,
  email: Mail,
  flyer: FileText,
  agent: UserRound,
  other: Link2,
};

export function channelIcon(channel: string): LucideIcon {
  return CHANNEL_ICONS[channel] ?? Link2;
}

export const CHANNEL_OPTIONS: SelectOption<(typeof CHANNELS)[number]["value"]>[] = CHANNELS.map((c) => ({
  value: c.value,
  label: c.label,
  icon: channelIcon(c.value),
}));

// The channel as a small tile, the first thing you scan in a list
export function ChannelTile({ channel, className }: { channel: string; className?: string }) {
  return (
    <span
      className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-page text-ink ring-1 ring-line", className)}
      aria-hidden="true"
    >
      {createElement(channelIcon(channel), { className: "h-[1.15rem] w-[1.15rem]" })}
    </span>
  );
}

// Buttons for these screens: one orange action per screen, the rest quiet
const BUTTON_TONES = {
  signal: "bg-signal text-on-signal hover:brightness-[0.96]",
  ink: "bg-ink text-white hover:bg-ink/90",
  quiet: "bg-surface text-ink ring-1 ring-line hover:bg-page",
  ghost: "text-muted hover:bg-page hover:text-ink",
} as const;

export function pillButton(tone: keyof typeof BUTTON_TONES, className?: string) {
  return cn(
    "press inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-semibold whitespace-nowrap",
    "focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
    BUTTON_TONES[tone],
    className
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly { key: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-full bg-page p-1 ring-1 ring-line", className)} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "press h-8 rounded-full px-3.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
            value === o.key ? "bg-surface text-ink shadow-[0_1px_2px_rgb(20_22_26/0.08)] ring-1 ring-line" : "text-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-muted select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none",
          checked ? "bg-ink" : "bg-line"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
            checked && "translate-x-4"
          )}
        />
      </button>
      {label}
    </label>
  );
}

// The message as people will receive it: a chat bubble with the link at the end
export function MessageBubble({ message, url, className }: { message: string; url: string; className?: string }) {
  return (
    <div className={cn("rounded-[1.25rem] bg-page p-3", className)}>
      <div className="relative ml-auto max-w-[92%] rounded-2xl rounded-br-md bg-surface px-3.5 py-2.5 text-[0.93rem] leading-relaxed shadow-[0_1px_2px_rgb(20_22_26/0.06)] ring-1 ring-line">
        {message.trim() && <p className="whitespace-pre-line text-pretty">{message.trim()}</p>}
        <p className={cn("font-medium break-all text-ink underline decoration-signal decoration-2 underline-offset-[3px]", message.trim() && "mt-2")}>
          {url.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </div>
  );
}

// What "went further" means for each audience
export function furtherCount(audience: string, s: StatRow | undefined): number {
  if (!s) return 0;
  return audience === "businesses" ? s.paid_campaign : s.joined_campaign;
}

export function furtherLabel(audience: string): string {
  return audience === "businesses" ? "paid for a campaign" : "joined a campaign";
}

export function audienceLabel(audience: string): string {
  return audience === "businesses" ? "For businesses" : "For creators";
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

// The empty and success mark: the logo's ring of eight dots
export function RingMark({ filled = 0, className }: { filled?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-16 w-16", className)} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const on = i < filled;
        return (
          <circle
            key={i}
            cx={32 + Math.cos(a) * 22}
            cy={32 + Math.sin(a) * 22}
            r={5}
            className={on ? "fill-ink" : "fill-none stroke-line"}
            strokeWidth={2}
          />
        );
      })}
      <circle cx={32} cy={32} r={7} className="fill-signal" />
    </svg>
  );
}
