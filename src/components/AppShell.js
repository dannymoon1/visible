"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "sonner";
import {
  Home,
  Trophy,
  LayoutGrid,
  CreditCard,
  Wallet,
  ShieldCheck,
  Banknote,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import RealtimeBalance from "@/components/RealtimeBalance";
import { cn } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/", label: "Tasks", icon: LayoutGrid },
  { href: "/order", label: "Start Campaign", icon: CreditCard },
  { href: "/withdraw", label: "Earnings", icon: Wallet },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Review Submissions", icon: ShieldCheck },
  { href: "/admin/payouts", label: "Manage Payouts", icon: Banknote },
];

// Pages that render full-screen without the sidebar
const BARE_ROUTES = ["/login", "/register"];

export default function AppShell({ children }) {
  const [profile, setProfile] = useState(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const bare = BARE_ROUTES.includes(pathname);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email || "");
        setDisplayName(nameFromUser(user));

        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single();

        setProfile(data);
      }
    }

    loadProfile();
  }, [pathname]);

  // Show the new name right away when the user edits their profile
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "USER_UPDATED" && session?.user) {
        setDisplayName(nameFromUser(session.user));
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/login");
    router.refresh();
  };

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

  return (
    <>
      {/* ============ MOBILE TOP BAR ============ */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-ink-200/70 bg-white/80 px-4 backdrop-blur-xl md:hidden">
        <Brand dark={false} />
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
          className="fixed inset-0 z-40 bg-ink-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ============ SIDEBAR ============ */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-ink-950 text-ink-300",
          "transition-transform duration-300 ease-out md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Soft brand glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgb(106_47_245/0.25),transparent_70%)]" />

        <div className="relative flex items-center justify-between px-6 pb-6 pt-7">
          <Brand dark />
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {profile?.is_admin && (
          <div className="relative px-4">
            <RealtimeBalance />
          </div>
        )}

        <nav className="relative mt-6 flex-1 space-y-6 overflow-y-auto px-4">
          <NavGroup label="Workspace" items={NAV} pathname={pathname} />
          {profile?.is_admin && (
            <NavGroup label="Administration" items={ADMIN_NAV} pathname={pathname} />
          )}
        </nav>

        {/* Account */}
        <div className="relative border-t border-white/5 p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-semibold uppercase text-white">
              {(displayName || email || "?")[0]}
            </div>
            <Link href="/dashboard" className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white hover:text-brand-200">
                {displayName || email || "Guest"}
              </p>
              <p className="text-xs text-ink-400">
                {profile?.is_admin ? "Administrator" : "Partner"}
              </p>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-white/5 hover:text-red-400"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ============ MAIN CONTENT ============ */}
      <main className="min-h-screen pt-16 md:ml-72 md:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
          {children}
        </div>
      </main>

      {toaster}
    </>
  );
}

// "Ada Okafor" from registration details, falling back to username
function nameFromUser(user) {
  const meta = user?.user_metadata || {};
  return [meta.first_name, meta.last_name].filter(Boolean).join(" ") || meta.username || "";
}

function Brand({ dark }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 font-display text-lg font-semibold text-white shadow-brand">
        V
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block font-display text-lg font-semibold tracking-tight",
            dark ? "text-white" : "text-ink-950"
          )}
        >
          Visible
        </span>
        <span
          className={cn(
            "block text-[10px] font-semibold uppercase tracking-[0.2em]",
            dark ? "text-gold-400" : "text-ink-400"
          )}
        >
          Partner Portal
        </span>
      </span>
    </Link>
  );
}

function NavGroup({ label, items, pathname }) {
  return (
    <div>
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
        {label}
      </p>
      <div className="space-y-1">
        {items.map(({ href, label: text, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                  : "text-ink-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  active ? "text-brand-300" : "text-ink-500 group-hover:text-ink-300"
                )}
                strokeWidth={2}
              />
              {text}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold-400" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
