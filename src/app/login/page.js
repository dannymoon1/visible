"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { Button, Field, Input } from "@/components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Middleware will now let us through to the home page
      router.push("/");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* ============ BRAND PANEL (desktop) ============ */}
      <aside className="relative hidden w-1/2 max-w-[640px] flex-col justify-between overflow-hidden bg-ink-950 p-12 text-white lg:flex xl:p-16">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-[radial-gradient(circle,rgb(106_47_245/0.35),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgb(106_47_245/0.18),transparent_70%)]" />

        <div className="relative">
          <BrandMark dark />
        </div>

        <div className="relative max-w-md animate-fade-in">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold-400">
            Welcome back
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight xl:text-5xl">
            Your influence,{" "}
            <span className="italic text-brand-300">rewarded.</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-300">
            Pick up where you left off — new campaigns, fresh tasks and your
            earnings are waiting.
          </p>

          <ul className="mt-10 space-y-4">
            <ValuePoint icon={Zap}>Real-time balance updates</ValuePoint>
            <ValuePoint icon={Wallet}>Fast, reliable payouts</ValuePoint>
            <ValuePoint icon={ShieldCheck}>Secure, verified campaigns</ValuePoint>
          </ul>
        </div>

        <figure className="relative max-w-md border-l-2 border-gold-400/70 pl-5">
          <blockquote className="font-display text-lg italic leading-relaxed text-ink-100">
            “The simplest way I&apos;ve found to turn everyday engagement into
            real income.”
          </blockquote>
          <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
            SocialEarn Partner
          </figcaption>
        </figure>
      </aside>

      {/* ============ FORM PANEL ============ */}
      <main className="flex flex-1 items-center justify-center bg-ink-50/40 px-5 py-12 sm:px-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-10 lg:hidden">
            <BrandMark />
          </div>

          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-950">
            Sign in
          </h2>
          <p className="mt-2 text-[15px] text-ink-500">
            Log in to manage your earnings.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                type="email"
                icon={Mail}
                autoComplete="email"
                placeholder="name@example.com"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  icon={Lock}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pr-11"
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              loading={loading}
              iconRight={ArrowRight}
              className="mt-2 w-full"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-500">
            New here?{" "}
            <Link
              href="/register"
              className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function BrandMark({ dark = false }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 font-display text-lg font-semibold text-white shadow-brand">
        V
      </span>
      <span className="leading-tight">
        <span
          className={`block font-display text-lg font-semibold tracking-tight ${
            dark ? "text-white" : "text-ink-950"
          }`}
        >
          Visible
        </span>
        <span
          className={`block text-[10px] font-semibold uppercase tracking-[0.2em] ${
            dark ? "text-gold-400" : "text-ink-400"
          }`}
        >
          Partner Portal
        </span>
      </span>
    </div>
  );
}

function ValuePoint({ icon: Icon, children }) {
  return (
    <li className="flex items-center gap-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-gold-400 ring-1 ring-inset ring-white/10">
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <span className="text-[15px] font-medium text-ink-100">{children}</span>
    </li>
  );
}
