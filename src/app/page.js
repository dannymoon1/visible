"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Instagram,
  Youtube,
  Twitter,
  Music2,
  Globe,
  ExternalLink,
  ShieldCheck,
  Clock3,
  CircleCheckBig,
  ListTodo,
  Send,
  AtSign,
  Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import CommentAssistant from "@/components/CommentAssistant";
import {
  Button,
  Card,
  CardHeader,
  PageHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  PageLoader,
  Field,
  Input,
  Textarea,
  formatNaira,
  cn,
} from "@/components/ui";

// Picks an icon + colour for a task based on its platform or link
function platformStyle(task) {
  const source = `${task.platform || ""} ${task.link || ""}`.toLowerCase();

  if (source.includes("instagram"))
    return { icon: Instagram, label: "Instagram", className: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white" };
  if (source.includes("tiktok"))
    return { icon: Music2, label: "TikTok", className: "bg-ink-950 text-white" };
  if (source.includes("youtu"))
    return { icon: Youtube, label: "YouTube", className: "bg-red-600 text-white" };
  if (source.includes("x.com") || source.includes("twitter") || task.platform === "X")
    return { icon: Twitter, label: "X", className: "bg-ink-900 text-white" };
  return { icon: Globe, label: task.platform || "Social", className: "bg-brand-100 text-brand-700" };
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

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingTask, setSubmittingTask] = useState(null);

  // Proof form: which task it's open for, and what the user typed
  const [proofTaskId, setProofTaskId] = useState(null);
  const [proofHandle, setProofHandle] = useState("");
  const [proofComment, setProofComment] = useState("");

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

  const handleVerify = async (taskId, reward) => {
    // Don't even contact Supabase if the task was already submitted.
    if (submissions[taskId]) {
      toast.info(`You've already submitted this task. Status: ${submissions[taskId]}`);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please log in to submit proof.");
      return;
    }

    // The verification agent needs these to find the comment via the platform API
    if (!proofHandle.trim() || !proofComment.trim()) {
      toast.error("Enter your username and the comment you posted.");
      return;
    }

    setSubmittingTask(taskId);

    const { error } = await supabase
      .from("submissions")
      .insert([
        {
          task_id: taskId,
          user_id: user.id,
          status: "pending",
          social_handle: proofHandle.trim().replace(/^@/, ""),
          comment_text: proofComment.trim(),
        },
      ]);

    if (error) {
      console.error("Submission Error:", error);

      // PostgreSQL duplicate-key error
      if (error.code === "23505") {
        toast.info("You've already submitted this task.");

        setSubmissions((previous) => ({
          ...previous,
          [taskId]: "pending",
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
      [taskId]: "pending",
    }));

    setSubmittingTask(null);
    setProofTaskId(null);
    setProofHandle("");
    setProofComment("");

    toast.success(`Proof submitted for ${formatNaira(reward)}`, {
      description: "We'll review it shortly and credit your balance.",
    });
  };

  if (loading) {
    return <PageLoader label="Loading tasks" />;
  }

  // Tasks the user has NOT submitted / HAS submitted
  const availableTasks = tasks.filter((task) => !submissions[task.id]);
  const submittedTasks = tasks.filter((task) => submissions[task.id]);

  const pendingCount = submittedTasks.filter((t) => submissions[t.id] === "pending").length;
  const approvedEarnings = submittedTasks
    .filter((t) => submissions[t.id] === "approved")
    .reduce((sum, t) => sum + Number(t.reward || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Available tasks"
        description="Engage genuinely with these posts, submit your proof, and earn instant rewards."
      />

      {/* ============ STATS ============ */}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open tasks"
          value={availableTasks.length}
          icon={ListTodo}
          tone="brand"
          hint="Ready for you to complete"
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
          hint="From approved submissions"
        />
      </div>

      {/* ============ AVAILABLE TASKS ============ */}
      {availableTasks.length > 0 ? (
        <div className="grid gap-4">
          {availableTasks.map((task, index) => {
            const platform = platformStyle(task);
            const PlatformIcon = platform.icon;
            const isOpen = proofTaskId === task.id;

            return (
              <Card
                key={task.id}
                className={cn(
                  "animate-fade-in overflow-hidden transition-all hover:shadow-lifted",
                  isOpen && "ring-2 ring-brand-500/20"
                )}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
              >
                <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-soft",
                        platform.className
                      )}
                    >
                      <PlatformIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink-900">{task.title}</h3>
                        <span className="text-xs font-medium text-ink-400">
                          · {platform.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-ink-500">
                        {task.description}
                      </p>
                      {task.link && (
                        <a
                          href={task.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                        >
                          Open post <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                        Reward
                      </p>
                      <p className="tabular font-display text-2xl font-semibold text-emerald-600">
                        {formatNaira(task.reward)}
                      </p>
                    </div>

                    <Button
                      variant={isOpen ? "secondary" : "primary"}
                      icon={isOpen ? undefined : ShieldCheck}
                      onClick={() => {
                        setProofTaskId(isOpen ? null : task.id);
                        setProofHandle("");
                        setProofComment("");
                      }}
                    >
                      {isOpen ? "Cancel" : "Submit proof"}
                    </Button>
                  </div>
                </div>

                {/* Proof form: used by the admin's verification agent */}
                {isOpen && (
                  <div className="animate-fade-in border-t border-ink-100 bg-ink-50/60 p-5 sm:p-6">
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
                      <Field label={`Your ${platform.label} username`}>
                        <Input
                          icon={AtSign}
                          value={proofHandle}
                          onChange={(e) => setProofHandle(e.target.value)}
                          placeholder="yourusername"
                        />
                      </Field>

                      <Field
                        label="The comment you posted"
                        hint="Paste it exactly as it appears on the post."
                      >
                        <Textarea
                          rows={2}
                          value={proofComment}
                          onChange={(e) => setProofComment(e.target.value)}
                          placeholder="Your exact comment"
                        />
                      </Field>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-ink-400">
                        Thoughtful, specific comments are approved fastest.
                      </p>
                      <Button
                        variant="brand"
                        icon={Send}
                        loading={submittingTask === task.id}
                        onClick={() => handleVerify(task.id, task.reward)}
                      >
                        Submit proof
                      </Button>
                    </div>
                  </div>
                )}

                {/* Comment ideas: the user edits and posts the comment themselves */}
                <div className="border-t border-ink-100 px-5 py-3 sm:px-6">
                  <CommentAssistant task={task} />
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
            description="There are no new tasks right now. Check back soon — new campaigns are added throughout the day."
          />
        </Card>
      )}

      {/* ============ SUBMITTED TASKS ============ */}
      {submittedTasks.length > 0 && (
        <Card className="mt-12 overflow-hidden">
          <CardHeader
            title="Your submissions"
            description="Track the review status of tasks you've completed."
          />

          <ul className="divide-y divide-ink-100">
            {submittedTasks.map((task) => {
              const platform = platformStyle(task);
              const PlatformIcon = platform.icon;

              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-ink-50/50"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-500">
                      <PlatformIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-800">{task.title}</p>
                      <p className="truncate text-sm text-ink-400">{task.description}</p>
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
