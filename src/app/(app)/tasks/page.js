"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  ShieldCheck,
  Clock3,
  CircleCheckBig,
  ListTodo,
  Send,
  AtSign,
  Inbox,
  Link2,
  MapPin,
  Languages,
  CalendarDays,
  FileText,
  Megaphone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PostAssistant from "@/components/PostAssistant";
import CampaignProgress, { campaignProgress } from "@/components/CampaignProgress";
import { platformIcon, taskPlatforms } from "@/components/PlatformIcon";
import { ALL } from "@/lib/campaignOptions";
import {
  Button,
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  StatusBadge,
  Badge,
  EmptyState,
  PageLoader,
  Field,
  Input,
  Textarea,
  Select,
  formatNaira,
  cn,
} from "@/components/ui";

function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function formatDate(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// "Ikeja, South West, Nigeria", skipping "All" levels
function targetLabel(task) {
  return [task.target_state, task.target_zone, task.target_country]
    .filter((part) => part && part !== ALL)
    .join(", ");
}

// Loads all tasks plus this user's submissions as { "task-id": "pending", ... }.
// Returns null when there's no user or a query fails.
async function fetchDashboard() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: taskData, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (taskError) {
    console.error("Task loading error:", taskError);
    return null;
  }

  const { data: submissionData, error: submissionError } = await supabase
    .from("submissions")
    .select("task_id, status")
    .eq("user_id", user.id);

  if (submissionError) {
    console.error("Submission loading error:", submissionError);
    return null;
  }

  const submissionMap = {};
  submissionData?.forEach((submission) => {
    submissionMap[submission.task_id] = submission.status;
  });

  return { tasks: taskData || [], submissions: submissionMap };
}

const EMPTY_PROOF = { platform: "", handle: "", postUrl: "", postText: "" };

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingTask, setSubmittingTask] = useState(null);

  // Proof form: which task it's open for, and what the user entered
  const [proofTaskId, setProofTaskId] = useState(null);
  const [proof, setProof] = useState(EMPTY_PROOF);

  useEffect(() => {
    let cancelled = false;

    fetchDashboard().then((result) => {
      if (cancelled) return;
      if (result) {
        setTasks(result.tasks);
        setSubmissions(result.submissions);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setProofField = (field, value) => setProof((prev) => ({ ...prev, [field]: value }));

  const toggleProofForm = (task) => {
    const isOpen = proofTaskId === task.id;
    setProofTaskId(isOpen ? null : task.id);
    setProof({ ...EMPTY_PROOF, platform: taskPlatforms(task)[0] || "" });
  };

  const handleSubmitProof = async (task) => {
    // Don't even contact Supabase if the task was already submitted.
    if (submissions[task.id]) {
      toast.info(`You've already submitted this task. Status: ${submissions[task.id]}`);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please log in to submit proof.");
      return;
    }

    // The verification agent needs these to find and judge the post
    if (!proof.handle.trim() || !proof.postUrl.trim() || !proof.postText.trim()) {
      toast.error("Enter your username, the link to your post, and its text.");
      return;
    }

    if (!isValidUrl(proof.postUrl.trim())) {
      toast.error("Enter a valid post link starting with https://");
      return;
    }

    setSubmittingTask(task.id);

    const { error } = await supabase.from("submissions").insert([
      {
        task_id: task.id,
        user_id: user.id,
        status: "pending",
        social_handle: proof.handle.trim().replace(/^@/, ""),
        post_platform: proof.platform || null,
        post_url: proof.postUrl.trim(),
        // Column name predates posts: it holds the post's caption/text
        comment_text: proof.postText.trim(),
      },
    ]);

    if (error) {
      console.error("Submission Error:", error);

      // PostgreSQL duplicate-key error
      if (error.code === "23505") {
        toast.info("You've already submitted this task.");

        setSubmissions((previous) => ({
          ...previous,
          [task.id]: "pending",
        }));
      } else {
        toast.error(error.message);
      }

      setSubmittingTask(null);
      return;
    }

    // Mark task as submitted immediately
    setSubmissions((previous) => ({
      ...previous,
      [task.id]: "pending",
    }));

    setSubmittingTask(null);
    setProofTaskId(null);
    setProof(EMPTY_PROOF);

    toast.success(`Post submitted for ${formatNaira(task.reward)}`, {
      description: "We'll review it shortly and credit your balance.",
    });
  };

  if (loading) {
    return <PageLoader label="Loading tasks" />;
  }

  // Tasks the user has NOT submitted / HAS submitted
  // Campaigns whose budget is used up are closed to new submissions
  const availableTasks = tasks.filter(
    (task) => !submissions[task.id] && !campaignProgress(task)?.completed
  );
  const submittedTasks = tasks.filter((task) => submissions[task.id]);

  const pendingCount = submittedTasks.filter((t) => submissions[t.id] === "pending").length;
  const approvedEarnings = submittedTasks
    .filter((t) => submissions[t.id] === "approved")
    .reduce((sum, t) => sum + Number(t.reward || 0), 0);

  const today = todayISO();

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Available campaigns"
        description="Create a post about a campaign on your own account, submit the link, and earn when it's approved."
      />

      {/* ============ STATS ============ */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open campaigns"
          value={availableTasks.length}
          icon={ListTodo}
          tone="brand"
          hint="Ready for you to post about"
        />
        <StatCard
          label="In review"
          value={pendingCount}
          icon={Clock3}
          tone="warning"
          hint="Awaiting admin verification"
        />
        <StatCard
          label="Earned"
          value={formatNaira(approvedEarnings)}
          icon={CircleCheckBig}
          tone="success"
          hint="From approved posts"
        />
      </div>

      {/* ============ AVAILABLE CAMPAIGNS ============ */}
      {availableTasks.length > 0 ? (
        <div className="grid gap-6">
          {availableTasks.map((task, index) => {
            const platforms = taskPlatforms(task);
            const LeadIcon = platforms.length ? platformIcon(platforms[0]) : Megaphone;
            const isOpen = proofTaskId === task.id;
            const notStarted = task.start_date && task.start_date > today;
            const target = targetLabel(task);
            const referenceLinks = (task.reference_links || []).filter(Boolean);

            return (
              <Card
                key={task.id}
                className={cn(
                  "animate-fade-in overflow-hidden transition-all hover:shadow-lifted",
                  isOpen && "ring-2 ring-brand-500/20"
                )}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                {task.banner_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
                  <img
                    src={task.banner_url}
                    alt={`${task.title} banner`}
                    className="aspect-[3/1] w-full object-cover"
                  />
                )}

                <div className="p-5 sm:p-6">
                  {/* Title row */}
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-soft">
                        <LeadIcon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-ink-900">{task.title}</h3>
                          {task.content_type && <Badge tone="brand">{task.content_type}</Badge>}
                          {notStarted && (
                            <Badge tone="warning" dot>
                              Starts {formatDate(task.start_date)}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <p className="mt-1 text-sm leading-relaxed text-ink-500">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-5 sm:justify-end">
                      <div className="sm:text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                          Reward per post
                        </p>
                        <p className="tabular font-display text-2xl font-semibold text-emerald-600">
                          {formatNaira(task.reward)}
                        </p>
                      </div>

                      <Button
                        variant={isOpen ? "secondary" : "primary"}
                        icon={isOpen ? undefined : ShieldCheck}
                        disabled={notStarted && !isOpen}
                        title={notStarted ? `Opens on ${formatDate(task.start_date)}` : undefined}
                        onClick={() => toggleProofForm(task)}
                      >
                        {isOpen ? "Cancel" : "Submit post"}
                      </Button>
                    </div>
                  </div>

                  {/* Content brief */}
                  {task.content_details && (
                    <div className="mt-5 rounded-xl border border-ink-100 bg-ink-50/60 p-4">
                      <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
                        <FileText className="h-3.5 w-3.5" />
                        Content brief
                      </p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                        {task.content_details}
                      </p>
                    </div>
                  )}

                  {/* Campaign details */}
                  <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Post on">
                      {platforms.length ? (
                        <span className="flex flex-wrap gap-1.5">
                          {platforms.map((name) => {
                            const Icon = platformIcon(name);
                            return (
                              <Badge key={name} tone="neutral">
                                <Icon className="h-3 w-3" />
                                {name}
                              </Badge>
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
                    <Detail label="Start date" icon={CalendarDays}>
                      {task.start_date ? formatDate(task.start_date) : "Now"}
                    </Detail>
                  </dl>

                  {/* Reference material */}
                  {(task.link || referenceLinks.length > 0) && (
                    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                      {task.link && <ResourceLink href={task.link}>Sample post</ResourceLink>}
                      {referenceLinks.map((href, i) => (
                        <ResourceLink key={href + i} href={href}>
                          Reference {referenceLinks.length > 1 ? i + 1 : "material"}
                        </ResourceLink>
                      ))}
                    </div>
                  )}

                  <CampaignProgress task={task} className="mt-5 max-w-sm" />
                </div>

                {/* Proof form: used by the admin's verification agent */}
                {isOpen && (
                  <div className="animate-fade-in border-t border-ink-100 bg-ink-50/60 p-5 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {platforms.length > 0 && (
                        <Field label="Posted on">
                          <Select
                            value={proof.platform}
                            onChange={(e) => setProofField("platform", e.target.value)}
                          >
                            {platforms.map((name) => (
                              <option key={name}>{name}</option>
                            ))}
                          </Select>
                        </Field>
                      )}

                      <Field label={`Your ${proof.platform || "account"} username`}>
                        <Input
                          icon={AtSign}
                          value={proof.handle}
                          onChange={(e) => setProofField("handle", e.target.value)}
                          placeholder="yourusername"
                        />
                      </Field>

                      <Field label="Link to your post">
                        <Input
                          type="url"
                          icon={Link2}
                          value={proof.postUrl}
                          onChange={(e) => setProofField("postUrl", e.target.value)}
                          placeholder="https://..."
                        />
                      </Field>
                    </div>

                    <Field
                      label="Your post's text"
                      hint="Paste the caption or text exactly as published."
                      className="mt-4"
                    >
                      <Textarea
                        rows={3}
                        value={proof.postText}
                        onChange={(e) => setProofField("postText", e.target.value)}
                        placeholder="Your post's caption"
                      />
                    </Field>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-ink-400">
                        Posts that follow the brief and stay public are approved fastest.
                      </p>
                      <Button
                        variant="brand"
                        icon={Send}
                        loading={submittingTask === task.id}
                        onClick={() => handleSubmitProof(task)}
                      >
                        Submit post
                      </Button>
                    </div>
                  </div>
                )}

                {/* Post drafts: the user edits and publishes the post themselves */}
                <div className="border-t border-ink-100 px-5 py-3 sm:px-6">
                  <PostAssistant task={task} />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Inbox}
            title="You're all caught up"
            description="There are no new campaigns right now. Check back soon — new campaigns are added throughout the day."
          />
        </Card>
      )}

      {/* ============ SUBMITTED ============ */}
      {submittedTasks.length > 0 && (
        <Card className="mt-12 overflow-hidden">
          <CardHeader
            title="Your submissions"
            description="Track the review status of posts you've submitted."
          />

          <ul className="divide-y divide-ink-100">
            {submittedTasks.map((task) => {
              const platforms = taskPlatforms(task);
              const Icon = platforms.length ? platformIcon(platforms[0]) : Megaphone;

              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-ink-50/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-800">{task.title}</p>
                      <p className="truncate text-sm text-ink-400">
                        {task.description || task.content_type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-5">
                    <p className="tabular font-semibold text-ink-700">
                      {formatNaira(task.reward)}
                    </p>
                    <StatusBadge status={submissions[task.id]} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------

function Detail({ label, icon: Icon, children }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className="font-medium text-ink-800">{children}</dd>
    </div>
  );
}

function ResourceLink({ href, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
    >
      {children} <ExternalLink className="h-3 w-3" />
    </a>
  );
}
