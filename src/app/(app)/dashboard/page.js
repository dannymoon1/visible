"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  CircleCheckBig,
  Clock3,
  ListTodo,
  ArrowRight,
  Sparkles,
  Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProfileButton, { getProfileDetails } from "@/components/ProfileCard";
import { campaignProgress } from "@/components/CampaignProgress";
import {
  Button,
  Card,
  CardHeader,
  StatCard,
  StatusBadge,
  EmptyState,
  PageLoader,
  formatNaira,
} from "@/components/ui";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Loads everything the dashboard shows. Returns null if not logged in.
async function fetchDashboard() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileResult, submissionsResult, tasksResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, balance, is_admin")
      .eq("id", user.id)
      .single(),
    supabase
      .from("submissions")
      .select("id, task_id, status, created_at, tasks (title, reward)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("tasks").select("*"),
  ]);

  if (profileResult.error) console.error("Profile loading error:", profileResult.error);
  if (submissionsResult.error) console.error("Submission loading error:", submissionsResult.error);
  if (tasksResult.error) console.error("Task loading error:", tasksResult.error);

  return {
    user,
    profile: profileResult.data,
    submissions: submissionsResult.data || [],
    // Only campaigns that still have budget left count as open
    taskIds: (tasksResult.data || [])
      .filter((t) => !campaignProgress(t)?.completed)
      .map((t) => t.id),
  };
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchDashboard().then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <PageLoader label="Loading your dashboard" />;

  if (!data) {
    return (
      <Card>
        <EmptyState
          icon={Inbox}
          title="You're signed out"
          description="Please sign in to view your dashboard."
          action={<Button href="/login" variant="brand">Sign in</Button>}
        />
      </Card>
    );
  }

  const { user, profile, submissions, taskIds } = data;
  const details = getProfileDetails(user, profile);

  const submittedIds = new Set(submissions.map((s) => s.task_id));
  const openTasks = taskIds.filter((id) => !submittedIds.has(id)).length;
  const pending = submissions.filter((s) => s.status === "pending").length;
  const earned = submissions
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + Number(s.tasks?.reward || 0), 0);

  // Updates the page in place after the profile card saves
  const handleProfileSaved = (updatedUser, username) => {
    setData((prev) => ({
      ...prev,
      user: updatedUser || prev.user,
      profile: prev.profile ? { ...prev.profile, username } : prev.profile,
    }));
  };

  return (
    <div className="space-y-6">
      {/* ============ PROFILE BUTTON (top-left) ============ */}
      <div className="flex items-center gap-4 animate-fade-in">
        <ProfileButton user={user} profile={profile} onSaved={handleProfileSaved} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-900">{details.fullName}</p>
          <p className="text-xs text-ink-400">Tap your avatar to view or edit your profile</p>
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        {/* ============ WELCOME ============ */}
        <Card className="relative overflow-hidden p-6 sm:p-8 animate-fade-in">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-40 w-40 rounded-full bg-gold-100 blur-3xl" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
              {greeting()}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
              Welcome back,{" "}
              <span className="italic text-brand-700">{details.displayFirstName}</span>.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
              {openTasks > 0
                ? `You have ${openTasks} open ${openTasks === 1 ? "task" : "tasks"} waiting. Complete them to grow your balance.`
                : "You're all caught up. New campaigns are added throughout the day."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="/tasks" variant="brand" iconRight={ArrowRight}>
                Browse tasks
              </Button>
              <Button href="/withdraw" variant="secondary" icon={Wallet}>
                Withdraw
              </Button>
            </div>
          </div>
        </Card>

        {/* ============ STATS ============ */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Balance"
            value={formatNaira(profile?.balance)}
            icon={Wallet}
            tone="gold"
            hint="Available to withdraw"
          />
          <StatCard
            label="Earned"
            value={formatNaira(earned)}
            icon={CircleCheckBig}
            tone="success"
            hint="From approved tasks"
          />
          <StatCard
            label="In review"
            value={pending}
            icon={Clock3}
            tone="warning"
            hint="Awaiting verification"
          />
          <StatCard
            label="Open tasks"
            value={openTasks}
            icon={ListTodo}
            tone="brand"
            hint="Ready for you"
          />
        </div>

        {/* ============ RECENT ACTIVITY ============ */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Recent activity"
            description="Your latest task submissions."
            action={
              <Button href="/tasks" variant="ghost" size="sm" iconRight={ArrowRight}>
                View tasks
              </Button>
            }
          />

          {submissions.length > 0 ? (
            <ul className="divide-y divide-ink-100">
              {submissions.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">
                      {s.tasks?.title || "Task"}
                    </p>
                    <p className="text-xs text-ink-400">
                      {new Date(s.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="tabular font-semibold text-ink-700">
                      {formatNaira(s.tasks?.reward)}
                    </span>
                    <StatusBadge status={s.status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No activity yet"
              description="Complete your first task to start earning."
              action={<Button href="/tasks" variant="brand" size="sm">Find a task</Button>}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
