import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Users } from "lucide-react";
import { campaignProgress } from "@/components/CampaignProgress";
import { platformIcon, taskPlatforms } from "@/components/PlatformIcon";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/types";
import { campaignTag, compactNaira, timeAgo, type CampaignTag } from "./campaign-utils";

// Campaign cards for Discover, built on the brand tokens (CLAUDE.md → Colours).
// Orange is kept to the progress bar and one tag per card.

export function campaignHref(task: Pick<Task, "id">) {
  return `/discover/${task.id}`;
}

// ---------------------------------------------------------
// Cover: the banner, or a Dusk panel with the title when there's none

const GLOWS = ["85% 15%", "15% 85%", "80% 80%", "20% 20%"];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function CampaignCover({
  task,
  className,
  eager = false,
  large = false,
}: {
  task: Pick<Task, "id" | "title" | "banner_url">;
  className?: string;
  eager?: boolean;
  large?: boolean;
}) {
  if (task.banner_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
      <img
        src={task.banner_url}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  const glow = GLOWS[hash(task.id) % GLOWS.length];
  return (
    <div
      aria-hidden="true"
      className={cn("flex h-full w-full items-end p-5", className)}
      style={{
        backgroundImage: `radial-gradient(60% 70% at ${glow}, rgb(255 106 26 / 0.45), transparent), linear-gradient(160deg, #14161A, #2A1A12)`,
      }}
    >
      {!large && (
        <p className="line-clamp-3 font-heading text-2xl leading-[1.05] font-semibold tracking-[-0.02em] text-[#F2F3F5]">
          {task.title}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------

function Tag({ tag, className }: { tag: CampaignTag; className?: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        tag.tone === "signal" ? "bg-signal text-on-signal" : "bg-black/60 text-white backdrop-blur-md",
        className
      )}
    >
      {tag.label}
    </span>
  );
}

export function PlatformIcons({ task, className }: { task: Task; className?: string }) {
  const platforms = taskPlatforms(task);
  if (!platforms.length) return null;
  return (
    <span className={cn("flex items-center gap-1.5 text-ink", className)} aria-label={`Post on ${platforms.join(", ")}`}>
      {platforms.slice(0, 4).map((name) => {
        const Icon = platformIcon(name);
        return <Icon key={name} className="h-4 w-4" aria-hidden="true" />;
      })}
      {platforms.length > 4 && <span className="text-xs text-muted">+{platforms.length - 4}</span>}
    </span>
  );
}

export function ProgressLine({ task, className }: { task: Task; className?: string }) {
  const p = campaignProgress(task);
  if (!p) return null;
  return (
    <div
      role="progressbar"
      aria-valuenow={p.percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${p.approved} of ${p.max} spots filled`}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}
    >
      <div
        className="h-full rounded-full bg-signal"
        style={{ width: `${Math.max(p.percent, p.approved > 0 ? 3 : 0)}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------
// Standard card (rows and grids)

export function CampaignCard({
  task,
  joined = false,
  className,
}: {
  task: Task;
  joined?: boolean;
  className?: string;
}) {
  const p = campaignProgress(task);
  const tag = campaignTag(task);

  return (
    <Link
      href={campaignHref(task)}
      className={cn(
        "group flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface transition duration-200",
        "hover:-translate-y-0.5 hover:border-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal active:scale-[0.98]",
        className
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-line">
        <CampaignCover task={task} className="transition duration-500 group-hover:scale-[1.03]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
            {joined ? "Joined" : p ? `${p.spotsLeft} ${p.spotsLeft === 1 ? "spot" : "spots"} left` : "Open to all"}
          </span>
          {tag && <Tag tag={tag} />}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-3 text-sm text-muted">
          <span className="truncate">
            {task.content_type || "Campaign"} · {timeAgo(task.created_at)}
          </span>
          <PlatformIcons task={task} className="shrink-0" />
        </div>

        <h3 className="mt-2 truncate font-heading text-lg font-semibold tracking-[-0.01em] text-ink">{task.title}</h3>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="font-mono text-sm text-ink">
            {p ? (
              <>
                {compactNaira(p.spent)}
                <span className="text-muted">/{compactNaira(p.budget)}</span>
              </>
            ) : (
              <span className="text-muted">No cap</span>
            )}
          </span>
          <span className="flex items-center gap-1.5">
            {p && (
              <span className="flex items-center gap-1 rounded-full bg-page px-2 py-1 font-mono text-xs text-ink">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {p.approved}
                <span className="sr-only">posts approved</span>
              </span>
            )}
            <span className="rounded-full bg-signal/12 px-2.5 py-1 font-mono text-xs font-medium text-ink">
              {compactNaira(task.reward)}/post
            </span>
          </span>
        </div>

        <div className="mt-auto pt-4">
          <ProgressLine task={task} />
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------
// Featured card (top carousel)

export function FeaturedCard({ task, eager = false }: { task: Task; eager?: boolean }) {
  const p = campaignProgress(task);

  return (
    <Link
      href={campaignHref(task)}
      className="group relative block h-[300px] overflow-hidden rounded-[28px] bg-[#14161A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:h-[340px]"
    >
      <CampaignCover task={task} eager={eager} large className="absolute inset-0 transition duration-700 group-hover:scale-[1.02]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent sm:bg-gradient-to-r sm:from-black/80 sm:via-black/40" />

      <div className="relative flex h-full flex-col justify-end gap-4 p-6 text-white sm:flex-row sm:items-end sm:justify-between sm:p-9">
        <div className="max-w-xl">
          <h3 className="line-clamp-2 font-heading text-3xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-4xl">
            {task.title}
          </h3>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/80 sm:text-[15px]">
            <span>{task.content_type || "Campaign"}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">{compactNaira(task.reward)} per post</span>
            {p && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{compactNaira(p.budget)} budget</span>
              </>
            )}
          </p>
        </div>
        <span className="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-full bg-white px-5 font-heading text-[15px] font-semibold text-[#14161A] transition group-hover:gap-3">
          View campaign
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------
// Submission status: amber in review, green approved or paid, red not approved

const PILL_TONES = {
  warning: "bg-warning/12 text-warning",
  verified: "bg-verified/12 text-verified",
  error: "bg-error/12 text-error",
  muted: "bg-page text-muted",
} as const;

export function StatusPill({ tone, children }: { tone: keyof typeof PILL_TONES; children: ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", PILL_TONES[tone])}>
      {children}
    </span>
  );
}
