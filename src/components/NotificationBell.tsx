"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BadgeCheck, CheckCheck, Megaphone, UserMinus, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/components/ui";
import type { AppNotification } from "@/lib/types";

// In-app notifications (also emailed by the server, see src/lib/notify.ts):
// a verified campaign opened, a standby spot came up, you were removed, or
// you became a verified creator.

const ICONS = {
  campaign_open: Megaphone,
  spot_opened: Sparkles,
  removed: UserMinus,
  verified: BadgeCheck,
} as const;

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationBell({ align = "left" }: { align?: "left" | "right" }) {
  const pathname = usePathname();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data ?? []);
  }, []);

  // Refresh on every page change and every minute while the tab is open
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) load();
    };
    const first = setTimeout(run, 0);
    const timer = setInterval(run, 60_000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load, pathname]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read_at);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((cur) => cur.map((n) => (ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n)));
    await supabase.from("notifications").update({ read_at: now }).in("id", ids);
  };

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={unread.length ? `Notifications, ${unread.length} unread` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 font-mono text-[10px] leading-none text-on-signal">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-[60] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[20px] border border-line bg-surface shadow-[0_24px_60px_-20px_rgb(20_22_26/0.35)]",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-heading text-[15px] font-semibold text-ink">Notifications</p>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => markRead(unread.map((n) => n.id))}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-ink"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted">Nothing yet. We&apos;ll let you know when there&apos;s news.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {items.map((n) => {
                const Icon = ICONS[n.kind as keyof typeof ICONS] ?? Bell;
                const body = (
                  <>
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full", n.read_at ? "bg-page text-muted" : "bg-signal/12 text-ink")}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm", n.read_at ? "text-muted" : "font-semibold text-ink")}>{n.title}</span>
                      {n.body && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{n.body}</span>}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted">{ago(n.created_at)}</span>
                  </>
                );
                const cls = "flex gap-3 px-4 py-3 text-left transition hover:bg-page/70";
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        className={cls}
                        onClick={() => {
                          markRead([n.id]);
                          setOpen(false);
                        }}
                      >
                        {body}
                      </Link>
                    ) : (
                      <button type="button" className={cn(cls, "w-full")} onClick={() => markRead([n.id])}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// Ask the server to email any new notifications now (it also runs daily).
// Fire and forget: the in-app notice already exists either way.
export function dispatchNotificationEmails() {
  fetch("/api/notifications/dispatch", { method: "POST" }).catch(() => {});
}
