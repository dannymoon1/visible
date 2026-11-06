"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Megaphone,
  PauseCircle,
  PlayCircle,
  Trash2,
  Search,
  ExternalLink,
  CircleCheckBig,
  Ban,
  Clock3,
  ShieldAlert,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import CampaignProgress from "@/components/CampaignProgress";
import { taskPlatforms } from "@/components/PlatformIcon";
import {
  Button,
  Card,
  PageHeader,
  StatCard,
  Badge,
  EmptyState,
  PageLoader,
  Field,
  Input,
  Textarea,
  formatNaira,
  cn,
} from "@/components/ui";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "completed", label: "Completed" },
  { value: "removed", label: "Removed" },
];

const STATUS_TONES = {
  active: "success",
  completed: "brand",
  suspended: "warning",
  removed: "danger",
};

// What each action does, for the confirmation dialog
const ACTIONS = {
  suspend: {
    title: "Suspend campaign",
    verb: "Suspend",
    icon: PauseCircle,
    variant: "gold",
    reasonRequired: false,
    explain:
      "Creators won't see it, can't submit posts for it, and pending posts can't be approved until you resume it. Nothing is lost.",
  },
  resume: {
    title: "Resume campaign",
    verb: "Resume",
    icon: PlayCircle,
    variant: "success",
    reasonRequired: false,
    explain: "The campaign goes live again and creators can post for it.",
  },
  remove: {
    title: "Remove campaign",
    verb: "Remove permanently",
    icon: Trash2,
    variant: "danger",
    reasonRequired: true,
    explain:
      "This can't be undone. The campaign is hidden everywhere and all of its pending submissions are rejected. Approved earnings and payment records are kept.",
  },
};

// All campaigns with advertiser emails and submission counts.
// Returns { forbidden: true } for non-admins.
async function fetchCampaigns() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { forbidden: true };

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return { forbidden: true };

  const [tasksResult, submissionsResult] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("submissions").select("task_id, status"),
  ]);

  if (tasksResult.error) {
    console.error("Campaign loading error:", tasksResult.error);
    return { error: tasksResult.error.message };
  }

  const tasks = tasksResult.data || [];

  // Advertiser emails (tasks.created_by points at auth.users, so look them up)
  const creatorIds = [...new Set(tasks.map((t) => t.created_by).filter(Boolean))];
  const { data: creators } = creatorIds.length
    ? await supabase.from("profiles").select("id, email, username").in("id", creatorIds)
    : { data: [] };
  const creatorById = Object.fromEntries((creators || []).map((c) => [c.id, c]));

  const counts = {};
  for (const s of submissionsResult.data || []) {
    counts[s.task_id] ??= { pending: 0, total: 0 };
    counts[s.task_id].total += 1;
    if (s.status === "pending") counts[s.task_id].pending += 1;
  }

  return {
    campaigns: tasks.map((t) => ({
      ...t,
      status: t.status || "active",
      advertiser: creatorById[t.created_by] || null,
      counts: counts[t.id] || { pending: 0, total: 0 },
    })),
  };
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminCampaigns() {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(null); // { campaign, action }

  useEffect(() => {
    let cancelled = false;
    fetchCampaigns().then((result) => {
      if (cancelled) return;
      if (result.forbidden) {
        window.location.href = "/";
        return;
      }
      setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return <PageLoader label="Loading campaigns" />;

  if (data.error) {
    return (
      <Card>
        <EmptyState icon={ShieldAlert} title="Couldn't load campaigns" description={data.error} />
      </Card>
    );
  }

  const campaigns = data.campaigns;
  const countBy = (status) => campaigns.filter((c) => c.status === status).length;

  const search = query.trim().toLowerCase();
  const visible = campaigns.filter(
    (c) =>
      (filter === "all" || c.status === filter) &&
      (!search ||
        c.title?.toLowerCase().includes(search) ||
        c.advertiser?.email?.toLowerCase().includes(search) ||
        c.payment_reference?.toLowerCase().includes(search))
  );

  // Apply the result in place so the list doesn't jump
  const handleDone = (campaignId, result) => {
    setData((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: result.status,
              moderation_reason: result.reason,
              moderated_at: new Date().toISOString(),
              counts: result.status === "removed" ? { ...c.counts, pending: 0 } : c.counts,
            }
          : c
      ),
    }));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        eyebrow="Administration"
        title="Manage campaigns"
        description="Suspend campaigns that need a closer look, or remove ones that break the rules."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active" value={countBy("active")} icon={CircleCheckBig} tone="success" hint="Live for creators" />
        <StatCard label="Suspended" value={countBy("suspended")} icon={PauseCircle} tone="warning" hint="Paused, can be resumed" />
        <StatCard label="Completed" value={countBy("completed")} icon={Clock3} tone="brand" hint="All spots filled" />
        <StatCard label="Removed" value={countBy("removed")} icon={Ban} tone="neutral" hint="Taken down permanently" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-xl bg-ink-100 p-1" role="tablist">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-all",
                filter === f.value ? "bg-white text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-800"
              )}
            >
              {f.label}
              <span className="tabular ml-1.5 text-xs text-ink-400">
                {f.value === "all" ? campaigns.length : countBy(f.value)}
              </span>
            </button>
          ))}
        </div>
        <div className="w-full sm:w-72">
          <Input
            icon={Search}
            placeholder="Search title, advertiser or reference"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search campaigns"
          />
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={Megaphone} title="No campaigns here" description="Try another filter or search." />
        </Card>
      ) : (
        <div className="grid gap-4">
          {visible.map((c) => (
            <CampaignRow key={c.id} campaign={c} onAction={(action) => setDialog({ campaign: c, action })} />
          ))}
        </div>
      )}

      {dialog && (
        <ModerationDialog
          campaign={dialog.campaign}
          action={dialog.action}
          onClose={() => setDialog(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------

function CampaignRow({ campaign: c, onAction }) {
  const platforms = taskPlatforms(c);

  return (
    <Card className={cn("overflow-hidden", c.status === "removed" && "opacity-70")}>
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start">
        {c.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
          <img src={c.banner_url} alt="" className="aspect-[3/1] w-full rounded-xl object-cover lg:w-56" />
        ) : (
          <div className="hidden h-[75px] w-56 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 lg:flex">
            <Megaphone className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-ink-900">{c.title}</h3>
            <Badge tone={STATUS_TONES[c.status] || "neutral"} dot className="capitalize">
              {c.status}
            </Badge>
            {c.content_type && <Badge tone="neutral">{c.content_type}</Badge>}
          </div>

          <p className="mt-1 text-sm text-ink-500">
            {c.advertiser?.email || c.advertiser?.username || "Unknown advertiser"} · Created {formatDate(c.created_at)}
            {platforms.length > 0 && ` · ${platforms.join(", ")}`}
          </p>

          {c.description && <p className="mt-2 line-clamp-2 text-sm text-ink-600">{c.description}</p>}

          {c.moderation_reason && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <span className="font-semibold capitalize">{c.status}</span> {formatDate(c.moderated_at)}:{" "}
              {c.moderation_reason}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
            <CampaignProgress task={c} compact className="max-w-xs" />
            <Meta label="Budget" value={formatNaira(c.amount_paid)} />
            <Meta label="Per post" value={formatNaira(c.reward)} />
            <Meta label="Pending" value={c.counts.pending} highlight={c.counts.pending > 0} />
            {c.link && (
              <a
                href={c.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Sample post <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          {c.status === "active" && (
            <Button size="sm" variant="secondary" icon={PauseCircle} onClick={() => onAction("suspend")}>
              Suspend
            </Button>
          )}
          {c.status === "suspended" && (
            <Button size="sm" variant="success" icon={PlayCircle} onClick={() => onAction("resume")}>
              Resume
            </Button>
          )}
          {c.status !== "removed" && (
            <Button size="sm" variant="danger" icon={Trash2} onClick={() => onAction("remove")}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function Meta({ label, value, highlight }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className={cn("tabular text-sm font-semibold", highlight ? "text-amber-600" : "text-ink-800")}>{value}</p>
    </div>
  );
}

function ModerationDialog({ campaign, action, onClose, onDone }) {
  const config = ACTIONS[action];
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const Icon = config.icon;

  const submit = async (e) => {
    e.preventDefault();
    if (config.reasonRequired && !reason.trim()) {
      toast.error("Give a reason for removing this campaign.");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.rpc("set_campaign_status", {
      p_task_id: campaign.id,
      p_action: action,
      p_reason: reason.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const rejected = data?.rejected_submissions || 0;
    toast.success(
      action === "remove"
        ? `"${campaign.title}" removed`
        : action === "suspend"
        ? `"${campaign.title}" suspended`
        : `"${campaign.title}" is live again`,
      rejected ? { description: `${rejected} pending ${rejected === 1 ? "submission was" : "submissions were"} rejected.` } : undefined
    );

    onDone(campaign.id, { status: data.status, reason: action === "resume" ? null : reason.trim() || null });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
      onKeyDown={(e) => e.key === "Escape" && !saving && onClose()}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="moderation-title"
        onSubmit={submit}
        className="w-full max-w-md animate-fade-in rounded-2xl bg-white p-6 shadow-lifted"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "rounded-xl p-2",
                action === "remove" ? "bg-red-50 text-red-600" : action === "suspend" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h2 id="moderation-title" className="font-semibold text-ink-900">{config.title}</h2>
              <p className="text-sm text-ink-500">{campaign.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-ink-600">{config.explain}</p>

        {action === "remove" && campaign.counts.pending > 0 && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {campaign.counts.pending} pending {campaign.counts.pending === 1 ? "submission" : "submissions"} will be rejected.
          </p>
        )}

        {action !== "resume" && (
          <Field
            label={config.reasonRequired ? "Reason (required)" : "Reason (optional)"}
            hint="Kept on record for other admins."
            className="mt-5"
          >
            <Textarea
              rows={3}
              maxLength={500}
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Misleading claims in the brief"
            />
          </Field>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant={config.variant} icon={Icon} loading={saving}>
            {config.verb}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}
