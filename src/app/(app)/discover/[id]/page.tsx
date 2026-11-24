"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  AtSign,
  CalendarDays,
  Check,
  ExternalLink,
  Languages,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Send,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PostAssistant from "@/components/PostAssistant";
import { dispatchNotificationEmails } from "@/components/NotificationBell";
import { campaignProgress } from "@/components/CampaignProgress";
import { platformIcon, taskPlatforms } from "@/components/PlatformIcon";
import { CampaignCover, ProgressLine, StatusPill, TypeLabel } from "@/components/campaigns/CampaignCard";
import {
  campaignTypeOf,
  compactNaira,
  formatDate,
  isOpenCampaign,
  isValidUrl,
  notStartedYet,
  payModelOf,
  submissionStatus,
  targetLabel,
  timeAgo,
  earnLine,
  isPricingV2,
  maxEarnFor,
  submittedMessage,
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

// Where this creator stands on this campaign
interface Membership {
  participant: "joined" | "standby" | "left" | "removed" | null;
  position: number | null; // place on the standby list
  submission: string | null; // review status once they've posted
}

interface CampaignState {
  task: Task;
  userId: string;
  isVerifiedCreator: boolean;
  spots: { joined: number; standby: number };
  me: Membership;
}

type Loaded = CampaignState | "missing" | "error";

const asParticipant = (s: string | null | undefined): Membership["participant"] =>
  s === "joined" || s === "standby" || s === "left" || s === "removed" ? s : null;

function readJoinResult(data: unknown): { status: Membership["participant"]; position: number | null } {
  const rec = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const position = Number(rec.position);
  return { status: asParticipant(String(rec.status ?? "")), position: Number.isFinite(position) && position > 0 ? position : null };
}

async function loadCampaign(id: string): Promise<Loaded> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "error";

  const [taskRes, subRes, partRes, profileRes, spotsRes] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", id).maybeSingle(),
    supabase.from("submissions").select("status").eq("task_id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("campaign_participants").select("status").eq("task_id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("is_verified_creator").eq("id", user.id).maybeSingle(),
    supabase.rpc("campaign_spots", { p_task_ids: [id] }),
  ]);

  if (taskRes.error) {
    console.error("Campaign:", taskRes.error);
    return "error";
  }
  if (!taskRes.data) return "missing";

  const participant = asParticipant(partRes.data?.status);
  let position: number | null = null;
  // Joining again is a no-op that reports the current place in line
  if (participant === "standby") {
    const { data } = await supabase.rpc("join_campaign", { p_task_id: id });
    position = readJoinResult(data).position;
  }

  const row = spotsRes.data?.[0];
  return {
    task: taskRes.data,
    userId: user.id,
    isVerifiedCreator: Boolean(profileRes.data?.is_verified_creator),
    spots: { joined: row?.joined ?? 0, standby: row?.standby ?? 0 },
    me: { participant, position, submission: subRes.data?.status ?? null },
  };
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

  // Joining or leaving changes the spot counts too, so reload them
  const refresh = () => loadCampaign(id).then(setLoaded);

  return (
    <CampaignView
      state={loaded}
      onChange={(me) => setLoaded({ ...loaded, me: { ...loaded.me, ...me } })}
      onRefresh={refresh}
    />
  );
}

function CampaignView({
  state,
  onChange,
  onRefresh,
}: {
  state: CampaignState;
  onChange: (me: Partial<Membership>) => void;
  onRefresh: () => void;
}) {
  const { task } = state;
  const platforms = taskPlatforms(task);
  const p = campaignProgress(task);
  const target = targetLabel(task);
  // Reference links are optional: the section only shows when the brand added some
  const references = (task.reference_links || []).filter(Boolean);
  const brief = task.description?.trim();

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink className="mb-6" />

      <div className="relative aspect-[2/1] overflow-hidden rounded-[28px] bg-line sm:aspect-[3/1]">
        <CampaignCover task={task} eager />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <TypeLabel task={task} />
        <span aria-hidden="true">·</span>
        <span>Posted {timeAgo(task.created_at)} ago</span>
      </div>
      <h1 className="mt-2 font-heading text-3xl leading-tight font-semibold tracking-[-0.03em] text-ink sm:text-4xl">
        {task.title}
      </h1>

      {/* Key numbers */}
      <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-3">
        <Stat
          label={isPricingV2(task) || payModelOf(task) === "per_1k_views" ? "You can earn up to" : "You earn per approved post"}
          value={maxEarnFor(task) !== null ? formatNaira(maxEarnFor(task)) : "—"}
        />
        {isPricingV2(task) && campaignTypeOf(task) === "open" ? (
          <Stat label="Post by" value={task.end_date ? formatDate(task.end_date) : "—"} />
        ) : (
          <Stat
            label={campaignTypeOf(task) === "verified" ? "Creator spots left" : "Posts left"}
            value={
              campaignTypeOf(task) === "verified" && task.max_participants
                ? `${Math.max(0, task.max_participants - state.spots.joined)} of ${task.max_participants}`
                : p
                  ? `${p.spotsLeft} of ${p.max}`
                  : "No cap"
            }
          />
        )}
        <Stat
          label="Budget used"
          value={p ? `${compactNaira(p.spent)} / ${compactNaira(p.budget)}` : "—"}
          className="col-span-2 sm:col-span-1"
        >
          <ProgressLine task={task} className="mt-2" />
        </Stat>
      </div>

      <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-[15px] text-pretty text-ink ring-1 ring-line">
        {earnLine(task)}
        {task.end_date && ` Post by ${formatDate(task.end_date)}.`}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-8">
          {brief && (
            <section>
              <h2 className="mb-2 font-heading text-lg font-semibold text-ink">The brief</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{brief}</p>
            </section>
          )}

          {references.length > 0 && (
            <section>
              <h2 className="mb-2 font-heading text-lg font-semibold text-ink">Reference material</h2>
              <div className="flex flex-wrap gap-2">
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

          <JoinPanel state={state} onChange={onChange} onRefresh={onRefresh} />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Join first, then post. Verified campaigns fill first come, first served.

function JoinPanel({
  state,
  onChange,
  onRefresh,
}: {
  state: CampaignState;
  onChange: (me: Partial<Membership>) => void;
  onRefresh: () => void;
}) {
  const { task, me, spots, isVerifiedCreator } = state;
  const verified = campaignTypeOf(task) === "verified";
  const [busy, setBusy] = useState(false);

  // 1. Already posted: show where the post is
  if (me.submission) {
    const s = submissionStatus(me.submission);
    return (
      <Panel title="You've posted for this campaign">
        <p className="flex items-center gap-2 text-sm text-ink">
          Your post:
          <StatusPill tone={s.tone}>{s.label}</StatusPill>
        </p>
        <MyCampaignsLink />
      </Panel>
    );
  }

  if (me.participant === "removed") {
    return (
      <Panel title="You're no longer in this campaign">
        <p className="text-sm text-muted">The campaign manager removed you from this campaign.</p>
        <MyCampaignsLink />
      </Panel>
    );
  }

  // Only the business and admins can load a campaign that is still in review
  if (task.status === "pending_review") {
    return (
      <Panel title="In review">
        <p className="text-sm text-muted">This is a preview. Creators will see the campaign once our team approves it.</p>
      </Panel>
    );
  }

  if (!isOpenCampaign(task)) {
    return (
      <Panel title="This campaign is closed">
        <p className="text-sm text-muted">It isn&apos;t taking new creators. Find another one on Discover.</p>
      </Panel>
    );
  }

  if (notStartedYet(task)) {
    return (
      <Panel title={`Opens ${formatDate(task.start_date!)}`}>
        <p className="text-sm text-muted">
          {verified
            ? isVerifiedCreator
              ? "We'll email you the moment it opens. Spots go first come, first served."
              : "This campaign is for verified creators only."
            : "You can join from that day. Read the brief and get ready."}
        </p>
      </Panel>
    );
  }

  const join = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("join_campaign", { p_task_id: task.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = readJoinResult(data);
    if (result.status === "joined") toast.success("You're in. Post about it, then submit your link.");
    else if (result.status === "standby") toast.info(`All spots are taken. You're #${result.position ?? "?"} on standby.`);
    onChange({ participant: result.status, position: result.position });
    onRefresh();
  };

  const leave = async () => {
    const msg = me.participant === "standby" ? "Leave the standby list?" : "Leave this campaign? Your spot goes to the next creator in line.";
    if (!window.confirm(msg)) return;
    setBusy(true);
    const { error } = await supabase.rpc("leave_campaign", { p_task_id: task.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(me.participant === "standby" ? "You left the standby list." : "You left the campaign.");
    // Leaving a verified spot may move the next creator up: email them now
    dispatchNotificationEmails();
    onChange({ participant: "left", position: null });
    onRefresh();
  };

  // 2. Joined: post, then submit
  if (me.participant === "joined") {
    return (
      <Panel
        title={
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-verified/12 text-verified">
              <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            You&apos;re in
          </span>
        }
      >
        <SubmitPostForm task={task} userId={state.userId} onSubmitted={(status) => onChange({ submission: status })} />
        <LeaveButton onClick={leave} busy={busy}>
          Leave campaign
        </LeaveButton>
      </Panel>
    );
  }

  // 3. On standby
  if (me.participant === "standby") {
    return (
      <Panel title={me.position ? `You're #${me.position} on standby` : "You're on standby"}>
        <p className="text-sm text-muted">
          All spots are taken. If someone leaves or is removed, the next creator in line gets the spot, and we&apos;ll email you.
        </p>
        <LeaveButton onClick={leave} busy={busy}>
          Leave standby list
        </LeaveButton>
      </Panel>
    );
  }

  // 4. Not joined yet
  const max = task.max_participants ?? 0;
  const left = Math.max(0, max - spots.joined);
  const full = verified && max > 0 && left === 0;

  if (verified && !isVerifiedCreator) {
    return (
      <Panel title="Verified creators only">
        <p className="mb-4 text-sm text-muted">
          This campaign is open to verified creators. Get verified by building a steady audience and posting well on open
          campaigns; our team reviews creators regularly.
        </p>
        <JoinButton disabled>Verified creators only</JoinButton>
        <Link
          href="/discover/all?type=open"
          className="mt-4 inline-flex text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
        >
          Find open campaigns
        </Link>
      </Panel>
    );
  }

  return (
    <Panel title={full ? "All spots are taken" : "Join this campaign"}>
      <p className="mb-4 text-sm text-muted">
        {verified
          ? full
            ? `Join the standby list: you'd be #${spots.standby + 1} in line. We'll email you if a spot opens.`
            : `${left} of ${max} ${max === 1 ? "spot" : "spots"} left · first come, first served.`
          : "Free to join. Post about it on your own account, then submit your link here."}
      </p>
      <JoinButton onClick={join} busy={busy}>
        {full ? "Join standby list" : "Join campaign"}
      </JoinButton>
    </Panel>
  );
}

function JoinButton({
  onClick,
  busy = false,
  disabled = false,
  children,
}: {
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full font-heading text-base font-semibold transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
        disabled
          ? "cursor-not-allowed bg-line text-muted"
          : "bg-signal text-on-signal hover:brightness-105 active:scale-[0.97] disabled:opacity-70"
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : disabled ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
      {children}
    </button>
  );
}

function LeaveButton({ onClick, busy, children }: { onClick: () => void; busy: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="mt-4 w-full text-center text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function MyCampaignsLink() {
  return (
    <Link
      href="/tasks"
      className="mt-4 inline-flex text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
    >
      See all my campaigns
    </Link>
  );
}

function SubmitPostForm({
  task,
  userId,
  onSubmitted,
}: {
  task: Task;
  userId: string;
  onSubmitted: (status: string) => void;
}) {
  const platforms = taskPlatforms(task);
  const [proof, setProof] = useState<ProofForm>({ platform: platforms[0] ?? "", handle: "", postUrl: "", postText: "" });
  const [submitting, setSubmitting] = useState(false);
  const set = <K extends keyof ProofForm>(field: K, value: ProofForm[K]) => setProof((prev) => ({ ...prev, [field]: value }));

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
      description: submittedMessage(task),
    });
    onSubmitted("pending");
  };

  return (
    <>
      <p className="-mt-1 mb-4 text-sm text-muted">Post on your own account first, then submit the link here.</p>
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
    </>
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

function Panel({ title, children }: { title: ReactNode; children: ReactNode }) {
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
