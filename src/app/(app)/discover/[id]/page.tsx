"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  AtSign,
  CalendarDays,
  ExternalLink,
  Languages,
  Link2,
  Loader2,
  MapPin,
  Send,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PostAssistant from "@/components/PostAssistant";
import { campaignProgress } from "@/components/CampaignProgress";
import { platformIcon, taskPlatforms } from "@/components/PlatformIcon";
import { CampaignCover, ProgressLine, StatusPill } from "@/components/campaigns/CampaignCard";
import {
  compactNaira,
  formatDate,
  isOpenCampaign,
  isValidUrl,
  notStartedYet,
  submissionStatus,
  targetLabel,
  timeAgo,
} from "@/components/campaigns/campaign-utils";
import { formatNaira } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { Task } from "@/lib/types";

interface ProofForm {
  platform: string;
  handle: string;
  postUrl: string;
  postText: string;
}

type Loaded = { task: Task; status: string | null; userId: string } | "missing" | "error";

async function loadCampaign(id: string): Promise<Loaded> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "error";

  const [taskRes, subRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", id).maybeSingle(),
    supabase.from("submissions").select("status").eq("task_id", id).eq("user_id", user.id).maybeSingle(),
  ]);

  if (taskRes.error) {
    console.error("Campaign:", taskRes.error);
    return "error";
  }
  if (!taskRes.data) return "missing";
  return { task: taskRes.data, status: subRes.data?.status ?? null, userId: user.id };
}

export default function CampaignPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCampaign(id).then((result) => {
      if (!cancelled) setLoaded(result);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!loaded) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading campaign">
        <div className="skeleton h-5 w-24" />
        <div className="skeleton aspect-[3/1] rounded-[28px]" />
        <div className="skeleton h-9 w-2/3" />
        <div className="skeleton h-40 rounded-[20px]" />
      </div>
    );
  }

  if (loaded === "missing" || loaded === "error") {
    return (
      <div className="flex flex-col items-center rounded-[28px] border border-line bg-surface px-6 py-16 text-center">
        <p className="font-heading text-lg font-semibold text-ink">
          {loaded === "missing" ? "This campaign doesn't exist" : "Couldn't load this campaign"}
        </p>
        <p className="mt-1 text-sm text-muted">
          {loaded === "missing" ? "It may have been removed." : "Check your connection and refresh the page."}
        </p>
        <BackLink className="mt-5" />
      </div>
    );
  }

  return (
    <CampaignView
      task={loaded.task}
      status={loaded.status}
      userId={loaded.userId}
      onSubmitted={(status) => setLoaded({ ...loaded, status })}
    />
  );
}

function CampaignView({
  task,
  status,
  userId,
  onSubmitted,
}: {
  task: Task;
  status: string | null;
  userId: string;
  onSubmitted: (status: string) => void;
}) {
  const platforms = taskPlatforms(task);
  const p = campaignProgress(task);
  const target = targetLabel(task);
  const references = (task.reference_links || []).filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink className="mb-6" />

      <div className="relative aspect-[2/1] overflow-hidden rounded-[28px] bg-line sm:aspect-[3/1]">
        <CampaignCover task={task} eager />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span>{task.content_type || "Campaign"}</span>
        <span aria-hidden="true">·</span>
        <span>Posted {timeAgo(task.created_at)} ago</span>
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
        {task.title}
      </h1>
      {task.description && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{task.description}</p>}

      {/* Key numbers */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-3">
        <Stat label="You earn per approved post" value={formatNaira(task.reward)} />
        <Stat label="Spots left" value={p ? `${p.spotsLeft} of ${p.max}` : "No cap"} />
        <Stat
          label="Budget used"
          value={p ? `${compactNaira(p.spent)} / ${compactNaira(p.budget)}` : "—"}
          className="col-span-2 sm:col-span-1"
        >
          <ProgressLine task={task} className="mt-2" />
        </Stat>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {task.content_details && (
            <section>
              <h2 className="mb-2 font-heading text-lg font-semibold text-ink">The brief</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{task.content_details}</p>
            </section>
          )}

          {(task.link || references.length > 0) && (
            <section>
              <h2 className="mb-2 font-heading text-lg font-semibold text-ink">Reference material</h2>
              <div className="flex flex-wrap gap-2">
                {task.link && <Resource href={task.link}>Sample post</Resource>}
                {references.map((href, i) => (
                  <Resource key={href + i} href={href}>
                    Reference {references.length > 1 ? i + 1 : ""}
                  </Resource>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-1 font-heading text-lg font-semibold text-ink">Need a starting point?</h2>
            <p className="mb-3 text-sm text-muted">Get draft ideas, then rewrite them in your own words.</p>
            <div className="rounded-[20px] border border-line bg-surface p-4">
              <PostAssistant task={task} />
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <dl className="space-y-4 rounded-[20px] border border-line bg-surface p-5 text-sm">
            <Detail label="Post on">
              {platforms.length ? (
                <span className="flex flex-wrap gap-1.5">
                  {platforms.map((name) => {
                    const Icon = platformIcon(name);
                    return (
                      <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-page px-2.5 py-1 text-xs font-medium">
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {name}
                      </span>
                    );
                  })}
                </span>
              ) : (
                "Any platform"
              )}
            </Detail>
            <Detail label="Audience" icon={MapPin}>
              {target || "Anywhere"}
            </Detail>
            <Detail label="Languages" icon={Languages}>
              {task.languages?.length ? task.languages.join(", ") : "Any"}
            </Detail>
            <Detail label="Starts" icon={CalendarDays}>
              {task.start_date ? formatDate(task.start_date) : "Now"}
            </Detail>
          </dl>

          <JoinPanel task={task} status={status} userId={userId} onSubmitted={onSubmitted} />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Submitting a post is how a creator joins a campaign

function JoinPanel({
  task,
  status,
  userId,
  onSubmitted,
}: {
  task: Task;
  status: string | null;
  userId: string;
  onSubmitted: (status: string) => void;
}) {
  const platforms = taskPlatforms(task);
  const [proof, setProof] = useState<ProofForm>({ platform: platforms[0] ?? "", handle: "", postUrl: "", postText: "" });
  const [submitting, setSubmitting] = useState(false);
  const set = <K extends keyof ProofForm>(field: K, value: ProofForm[K]) => setProof((prev) => ({ ...prev, [field]: value }));

  if (status) {
    const s = submissionStatus(status);
    return (
      <Panel title="You've joined this campaign">
        <p className="flex items-center gap-2 text-sm text-ink">
          Your post:
          <StatusPill tone={s.tone}>{s.label}</StatusPill>
        </p>
        <Link
          href="/tasks"
          className="mt-4 inline-flex text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
        >
          See all my campaigns
        </Link>
      </Panel>
    );
  }

  if (!isOpenCampaign(task)) {
    return (
      <Panel title="This campaign is closed">
        <p className="text-sm text-muted">It isn&apos;t taking new posts. Find another one on Discover.</p>
      </Panel>
    );
  }

  if (notStartedYet(task)) {
    return (
      <Panel title={`Opens ${formatDate(task.start_date!)}`}>
        <p className="text-sm text-muted">You can submit your post from that day. Read the brief and get ready.</p>
      </Panel>
    );
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const handle = proof.handle.trim().replace(/^@/, "");
    const postUrl = proof.postUrl.trim();
    const postText = proof.postText.trim();

    // The verification agent needs these to find and judge the post
    if (!handle || !postUrl || !postText) {
      toast.error("Enter your username, the link to your post, and its text.");
      return;
    }
    if (!isValidUrl(postUrl)) {
      toast.error("Enter a valid post link starting with https://");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("submissions").insert([
      {
        task_id: task.id,
        user_id: userId,
        status: "pending",
        social_handle: handle,
        post_platform: proof.platform || null,
        post_url: postUrl,
        // Column name predates posts: it holds the post's caption/text
        comment_text: postText,
      },
    ]);
    setSubmitting(false);

    if (error) {
      // PostgreSQL duplicate key: already submitted from another tab
      if (error.code === "23505") {
        toast.info("You've already submitted a post for this campaign.");
        onSubmitted("pending");
      } else {
        console.error("Submission error:", error);
        toast.error(error.message);
      }
      return;
    }

    toast.success("Post submitted", {
      description: `We'll check it and pay ${formatNaira(task.reward)} to your balance when it's approved.`,
    });
    onSubmitted("pending");
  };

  return (
    <Panel title="Submit your post">
      <p className="-mt-1 mb-4 text-sm text-muted">Post on your own account first, then send us the link.</p>
      <form onSubmit={submit} className="space-y-4">
        {platforms.length > 0 && (
          <FormField label="Posted on" htmlFor="platform">
            <select
              id="platform"
              value={proof.platform}
              onChange={(e) => set("platform", e.target.value)}
              className={FIELD}
            >
              {platforms.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </FormField>
        )}
        <FormField label={`Your ${proof.platform || "account"} username`} htmlFor="handle" icon={AtSign}>
          <input
            id="handle"
            value={proof.handle}
            onChange={(e) => set("handle", e.target.value)}
            placeholder="yourusername"
            autoComplete="off"
            className={cn(FIELD, "pl-10")}
          />
        </FormField>
        <FormField label="Link to your post" htmlFor="postUrl" icon={Link2}>
          <input
            id="postUrl"
            type="url"
            value={proof.postUrl}
            onChange={(e) => set("postUrl", e.target.value)}
            placeholder="https://..."
            className={cn(FIELD, "pl-10")}
          />
        </FormField>
        <FormField label="Your post's text" htmlFor="postText" hint="Paste the caption exactly as published.">
          <textarea
            id="postText"
            rows={4}
            value={proof.postText}
            onChange={(e) => set("postText", e.target.value)}
            placeholder="Your post's caption"
            className={cn(FIELD, "h-auto resize-y py-3 leading-relaxed")}
          />
        </FormField>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-signal font-heading text-base font-semibold text-on-signal transition duration-150 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal active:scale-[0.97] disabled:opacity-70 disabled:active:scale-100"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {submitting ? "Submitting..." : "Submit post"}
        </button>
        <p className="text-center text-xs text-muted">Posts that follow the brief and stay public are approved fastest.</p>
      </form>
    </Panel>
  );
}

// ---------------------------------------------------------

const FIELD =
  "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-signal focus:ring-4 focus:ring-signal/15";

function FormField({
  label,
  htmlFor,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        )}
        {children}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5">
      <h2 className="mb-3 font-heading text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  className,
  children,
}: {
  label: string;
  value: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("bg-surface p-4", className)}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg text-ink">{value}</p>
      {children}
    </div>
  );
}

function Detail({ label, icon: Icon, children }: { label: string; icon?: LucideIcon; children: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
      </dt>
      <dd className="font-medium text-ink">{children}</dd>
    </div>
  );
}

function Resource({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:border-muted/50"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
    </a>
  );
}

function BackLink({ className }: { className?: string }) {
  return (
    <Link href="/discover" className={cn("inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink", className)}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Discover
    </Link>
  );
}
