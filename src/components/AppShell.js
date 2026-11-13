"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import {
  Home,
  Megaphone,
  Trophy,
  Wallet,
  CreditCard,
  ShieldCheck,
  Banknote,
  LayoutList,
  PanelLeft,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import RealtimeBalance from "@/components/RealtimeBalance";
import { cn } from "@/components/ui";

const NAV_GROUPS = [
  {
    label: "Discover",
    items: [
      { href: "/dashboard", label: "Home", icon: Home },
      { href: "/tasks", label: "Campaigns", icon: Megaphone },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "My work",
    items: [
      { href: "/withdraw", label: "Earnings", icon: Wallet },
      { href: "/order", label: "Start a campaign", icon: CreditCard },
    ],
  },
];

const ADMIN_GROUP = {
  label: "Admin",
  items: [
    { href: "/admin", label: "Review submissions", icon: ShieldCheck },
    { href: "/admin/campaigns", label: "Manage campaigns", icon: LayoutList },
    { href: "/admin/payouts", label: "Manage payouts", icon: Banknote },
  ],
};

// Pages that render full-screen without the sidebar
const BARE_ROUTES = ["/login", "/register"];

// Desktop collapsed state, remembered between visits in localStorage
const COLLAPSE_KEY = "vc-sidebar-collapsed";
const collapseListeners = new Set();
let memoryCollapsed = false;

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return memoryCollapsed;
  }
}

function writeCollapsed(value) {
  memoryCollapsed = value;
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Storage blocked, the toggle only lasts until the next reload
  }
  collapseListeners.forEach((listener) => listener());
}

function subscribeCollapsed(listener) {
  collapseListeners.add(listener);
  return () => collapseListeners.delete(listener);
}

export default function AppShell({ children }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);

  const pathname = usePathname();
  const bare = BARE_ROUTES.includes(pathname);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      setIsAdmin(Boolean(data?.is_admin));
    }

    loadProfile();
  }, [pathname]);

  const toggleCollapsed = () => writeCollapsed(!collapsed);

  // Close the mobile sidebar whenever the page changes
  // (adjusting state during render is React's recommended pattern for this)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setSidebarOpen(false);
  }

  // Prevent background scrolling while the mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const toaster = (
    <Toaster
      position="top-center"
      richColors
      toastOptions={{ className: "font-sans" }}
    />
  );

  if (bare) {
    return (
      <>
        {children}
        {toaster}
      </>
    );
  }

  const groups = isAdmin ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS;
  // The mobile drawer always shows labels, whatever the desktop setting
  const slim = collapsed && !sidebarOpen;

  return (
    <>
      {/* ============ MOBILE TOP BAR ============ */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-xl md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl p-2.5 text-ink-700 hover:bg-ink-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* ============ MOBILE BACKDROP ============ */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ============ SIDEBAR ============ */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col border-r border-ink-200/70 bg-white",
          "transition-[transform,width] duration-300 ease-out md:translate-x-0",
          collapsed ? "md:w-[72px]" : "md:w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between px-4",
            slim && "md:justify-center"
          )}
        >
          <div className={cn(slim && "md:hidden")}>
            <Brand />
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden rounded-lg p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900 md:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900 md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6 pt-3">
          {groups.map((group) => (
            <NavGroup key={group.label} {...group} pathname={pathname} slim={slim} />
          ))}
        </nav>

        {isAdmin && (
          <div className={cn("shrink-0 p-3", slim && "md:hidden")}>
            <RealtimeBalance />
          </div>
        )}
      </aside>

      {/* ============ MAIN CONTENT ============ */}
      <main
        className={cn(
          "min-h-screen pt-16 transition-[margin] duration-300 ease-out md:pt-0",
          collapsed ? "md:ml-[72px]" : "md:ml-64"
        )}
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10">
          {children}
        </div>
      </main>

      {toaster}
    </>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center" aria-label="Visibility Campaigns home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo/v2/visibility-campaigns-logo-light.svg"
        alt="Visibility Campaigns"
        className="h-8 w-auto"
      />
    </Link>
  );
}

function NavGroup({ label, items, pathname, slim }) {
  return (
    <div>
      <p className={cn("mb-1.5 px-3 text-xs font-medium text-ink-500", slim && "md:sr-only")}>
        {label}
      </p>
      <div className="space-y-0.5">
        {items.map(({ href, label: text, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              title={slim ? text : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
                slim && "md:justify-center md:px-0",
                active
                  ? "bg-ink-100 font-semibold text-ink-950"
                  : "font-medium text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              )}
            >
              <Icon
                className={cn(
                  "h-[19px] w-[19px] shrink-0 transition-colors",
                  active ? "text-ink-950" : "text-ink-400 group-hover:text-ink-600"
                )}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={cn(slim && "md:sr-only")}>{text}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
