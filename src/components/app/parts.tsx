import type { ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Eye,
  Flag,
  Globe,
  MessageCircle,
  MousePointerClick,
  ShieldCheck,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import CreatorAvatar from "@/components/site/CreatorAvatar";
import { count, TOTALS, CAMPAIGN, type DemoPost } from "@/lib/demo/adiaha";
import { cn } from "@/lib/cn";

// Small pieces shared by the business app's screens.

export function LivePill({ daysLeft }: { daysLeft: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm font-medium ring-1 ring-line">
      <span className="live-dot h-2 w-2 rounded-full bg-signal" />
      Live · {daysLeft} days left
    </span>
  );
}

export function ScreenTitle({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <h1 className="font-heading text-[1.9rem] leading-[1.05] font-semibold tracking-[-0.025em] sm:text-[2.4rem]">{title}</h1>
      {children}
    </div>
  );
}

// A grouped list: one rounded sheet, hairline rows. Used instead of a grid of
// identical stat cards.
export function Rows({ title, children, className }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h2 className="mb-2.5 px-1 font-heading text-lg font-semibold">{title}</h2>}
      <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] bg-surface ring-1 ring-line">{children}</ul>
    </section>
  );
}

export function Row({
  icon: Icon,
  label,
  hint,
  value,
  muted,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  value: ReactNode;
  muted?: boolean;
}) {
  return (
    <li className="flex items-center gap-3.5 px-4 py-3.5">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-page", muted ? "text-muted" : "text-signal")}>
        <Icon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block", muted && "text-muted")}>{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
      </span>
      <span className={cn("font-mono text-lg tabular-nums", muted && "text-muted")}>{value}</span>
    </li>
  );
}

// What the campaign brought, by goal first
export function ResultRows({ title = "What it brought you" }: { title?: string }) {
  return (
    <Rows title={title}>
      <Row icon={Globe} label="Website visits" hint="Taps on creators' links to adiahaskin.shop" value={count(TOTALS.taps)} />
      <Row icon={MessageCircle} label="WhatsApp chats" value={count(TOTALS.chats)} />
      <Row icon={Ticket} label="Codes used at your counter" value={count(TOTALS.codes)} />
      <Row icon={ShieldCheck} label="Views removed by our checks" hint="Not billed" value={count(CAMPAIGN.removedViews)} muted />
    </Rows>
  );
}

export function PostImage({ name, className }: { name: string; className?: string }) {
  return (
    <picture>
      <source type="image/avif" srcSet={`/demo/posts/${name}.avif`} />
      <img
        src={`/demo/posts/${name}.webp`}
        alt=""
        width={480}
        height={600}
        loading="lazy"
        decoding="async"
        className={cn("h-full w-full object-cover", className)}
      />
    </picture>
  );
}

const STATUS: Record<DemoPost["status"], { label: string; icon: LucideIcon; tone: string }> = {
  verified: { label: "Verified", icon: Check, tone: "bg-verified text-white" },
  checking: { label: "Checking views", icon: Clock, tone: "bg-warning text-white" },
  removed: { label: "Views removed", icon: AlertTriangle, tone: "bg-error text-white" },
};

export function StatusChip({ status, className }: { status: DemoPost["status"]; className?: string }) {
  const { label, icon: Icon, tone } = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tone, className)}>
      <Icon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      {label}
    </span>
  );
}

// One creator's post. Phones: the picture on top like the app it lives on.
// Desktop: picture left, numbers right, after contentrewards.com's cards.
export function PostCard({ post }: { post: DemoPost }) {
  const { creator, platform, image, caption, postedAgo, status, views, taps, chats, note } = post;
  const removed = status === "removed";
  return (
    <article className="overflow-hidden rounded-[1.5rem] bg-surface ring-1 ring-line sm:grid sm:grid-cols-[11rem_1fr]">
      <div className="relative aspect-[4/5] sm:aspect-auto sm:h-full">
        <PostImage name={image} className={cn(removed && "opacity-45 grayscale")} />
        <span className="absolute top-3 left-3 rounded-full bg-black/45 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
          {platform}
        </span>
        <StatusChip status={status} className="absolute top-3 right-3 sm:hidden" />
      </div>

      <div className="flex flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <CreatorAvatar who={creator.avatar} large className="h-9 w-9" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate font-semibold">{platform === "Facebook" ? creator.handle : `@${creator.handle}`}</span>
            <span className="block text-sm text-muted">{postedAgo}</span>
          </span>
          <StatusChip status={status} className="hidden sm:inline-flex" />
        </div>

        <p className="mt-3 line-clamp-2 text-[0.95rem] text-pretty">{caption}</p>

        <dl className={cn("mt-4 grid grid-cols-3 gap-2", removed && "opacity-50")}>
          <Stat icon={Eye} label="Views" value={views} strike={removed} />
          <Stat icon={MousePointerClick} label="Taps" value={taps} />
          <Stat icon={MessageCircle} label="Chats" value={chats} />
        </dl>

        {note && (
          <p
            className={cn(
              "mt-4 rounded-xl px-3 py-2.5 text-sm text-pretty",
              removed ? "bg-error/10 text-error" : "bg-warning/10 text-warning"
            )}
          >
            {note}
          </p>
        )}

        <button type="button" className="press mt-4 inline-flex items-center gap-1.5 self-start text-sm text-muted hover:text-ink sm:mt-auto sm:pt-4">
          <Flag className="h-3.5 w-3.5" aria-hidden="true" />
          Something wrong with this post?
        </button>
      </div>
    </article>
  );
}

function Stat({ icon: Icon, label, value, strike }: { icon: LucideIcon; label: string; value: number; strike?: boolean }) {
  return (
    <div className="rounded-xl bg-page px-2.5 py-2">
      <dt className="flex items-center gap-1 text-xs text-muted">
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </dt>
      <dd className={cn("mt-0.5 font-mono text-[1.05rem] tabular-nums", strike && "line-through")}>{count(value)}</dd>
    </div>
  );
}
