"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Check,
  Link2,
  Clapperboard,
  Megaphone,
  Wallet,
  Clock3,
  Film,
  Info,
  Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProfileButton, { getProfileDetails } from "@/components/ProfileCard";
import ConnectAccountsModal, { getSocialAccounts } from "@/components/ConnectAccounts";
import { platformIcon } from "@/components/PlatformIcon";
import {
  Button,
  Card,
  EmptyState,
  PageLoader,
  formatNaira,
  cn,
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

  const [profileResult, submissionsResult] = await Promise.all([
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
  ]);

  if (profileResult.error) console.error("Profile loading error:", profileResult.error);
  if (submissionsResult.error) console.error("Submission loading error:", submissionsResult.error);

  return {
    user,
    profile: profileResult.data,
    submissions: submissionsResult.data || [],
  };
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectOpen, setConnectOpen] = useState(false);

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

  const { user, profile, submissions } = data;
  const details = getProfileDetails(user, profile);
  const accounts = getSocialAccounts(user);
  const linked = Object.keys(accounts);

  const approved = submissions.filter((s) => s.status === "approved");
  const pending = submissions.filter((s) => s.status === "pending").length;
  const campaigns = new Set(submissions.map((s) => s.task_id)).size;
  const earned = approved.reduce((sum, s) => sum + Number(s.tasks?.reward || 0), 0);

  // Updates the page in place after the profile card saves
  const handleProfileSaved = (updatedUser, username) => {
    setData((prev) => ({
      ...prev,
      user: updatedUser || prev.user,
      profile: prev.profile ? { ...prev.profile, username } : prev.profile,
    }));
  };

  const handleAccountsSaved = (updatedUser) => {
    setData((prev) => ({ ...prev, user: updatedUser || prev.user }));
  };

  const steps = [
    {
      title: "Create your account",
      description: "You're all set!",
      icon: Check,
      done: true,
    },
    {
      title: "Connect your social accounts",
      description: linked.length
        ? `Linked: ${linked.join(", ")}.`
        : "Link your TikTok, Instagram, YouTube, X and/or Facebook.",
      icon: Link2,
      done: linked.length > 0,
      action: (
        <StepButton onClick={() => setConnectOpen(true)}>
          {linked.length ? "Manage accounts" : "Connect accounts"}
        </StepButton>
      ),
    },
    {
      title: "Join your first campaign",
      description: "Browse and join brand campaigns.",
      icon: Megaphone,
      done: campaigns > 0,
      action: <StepButton href="/tasks">Browse campaigns</StepButton>,
    },
    {
      title: "Get your first post approved",
      description: "Post about a brand, submit the link and start earning.",
      icon: Clapperboard,
      done: approved.length > 0,
      action: <StepButton href="/tasks">Submit content</StepButton>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ============ TOP BAR ============ */}
      <div className="flex items-center justify-between gap-4 animate-fade-in">
        <p className="text-sm font-semibold text-ink-900">Home</p>
        <div className="flex items-center gap-2">
          <Link
            href="/leaderboard"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-ink-700 transition hover:bg-ink-200/70"
            aria-label="See how you rank"
            title="See how you rank"
          >
            <Info className="h-4 w-4" />
          </Link>
          <ProfileButton
            user={user}
            profile={profile}
            onSaved={handleProfileSaved}
            variant="chip"
          />
        </div>
      </div>

      {/* ============ GREETING ============ */}
      <div className="animate-fade-in">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-ink-950 sm:text-[2rem]">
          {greeting()}, {details.username || details.displayFirstName}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-400">Pick up where you left off.</p>
      </div>

      {/* ============ FINISH SETTING UP ============ */}
      {steps.some((s) => !s.done) && (
        <Card className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold text-ink-900">Finish setting up</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            A few steps to get your first payout moving.
          </p>

          <ul className="mt-5 space-y-5">
            {steps.map((step) => (
              <SetupStep key={step.title} {...step} />
            ))}
          </ul>
        </Card>
      )}

      {/* ============ LIFETIME EARNED ============ */}
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[15px] font-medium text-ink-900">Lifetime earned</p>
            <p className="tabular mt-2 font-heading text-4xl font-bold tracking-tight text-ink-950">
              {formatNaira(earned)}
            </p>
          </div>
          <Button
            href="/withdraw"
            variant="ghost"
            size="sm"
            className="rounded-full bg-ink-100 px-4 text-ink-500"
          >
            Withdraw
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat icon={Wallet} tone="neutral" value={formatNaira(profile?.balance)} label="Balance" />
          <MiniStat icon={Clock3} tone="signal" value={pending} label="In review" />
          <MiniStat icon={Megaphone} tone="signal" value={campaigns} label="Campaigns" />
          <MiniStat icon={Film} tone="brand" value={submissions.length} label="Submissions" />
        </div>

        {linked.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
            <span className="text-xs text-ink-500">Posting from</span>
            {linked.map((name) => {
              const Icon = platformIcon(name);
              return (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-700"
                >
                  <Icon className="h-3 w-3" /> @{accounts[name]}
                </span>
              );
            })}
          </div>
        )}
      </Card>

      {connectOpen && (
        <ConnectAccountsModal
          user={user}
          onClose={() => setConnectOpen(false)}
          onSaved={handleAccountsSaved}
        />
      )}
    </div>
  );
}

function StepButton({ href, onClick, children }) {
  const classes =
    "inline-flex h-10 shrink-0 items-center rounded-full bg-ink-100 px-5 text-sm font-medium text-ink-900 transition hover:bg-ink-200/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-300/50";

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={classes}>
      {children}
    </button>
  );
}

function SetupStep({ title, description, icon: Icon, done, action }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:flex-nowrap">
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          done ? "bg-signal text-on-signal" : "bg-ink-100 text-ink-500"
        )}
      >
        {done ? (
          <Check className="h-5 w-5" strokeWidth={3} />
        ) : (
          <Icon className="h-[18px] w-[18px]" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] font-medium", done ? "text-ink-500" : "text-ink-900")}>
          {title}
        </p>
        <p className={cn("text-sm", done ? "text-ink-400" : "text-ink-500")}>{description}</p>
      </div>

      {/* On phones the action wraps under the text instead of squeezing it */}
      {!done && action && <div className="w-full pl-[3.75rem] sm:w-auto sm:pl-0">{action}</div>}
    </li>
  );
}

const MINI_TONES = {
  neutral: "bg-ink-100 text-ink-900",
  signal: "bg-signal/10 text-signal",
  brand: "bg-brand-50 text-brand-600",
};

function MiniStat({ icon: Icon, tone, value, label }) {
  return (
    <div className="flex items-center overflow-hidden rounded-2xl border border-ink-200/70">
      <span className={cn("flex h-16 w-16 shrink-0 items-center justify-center", MINI_TONES[tone])}>
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <div className="min-w-0 px-4">
        <p className="tabular truncate text-[15px] font-semibold text-ink-900">{value}</p>
        <p className="text-xs text-ink-500">{label}</p>
      </div>
    </div>
  );
}
