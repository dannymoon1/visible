"use client";

import { useState } from "react";
import type { ComponentType, CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { brandFonts } from "@/lib/fonts";
import { cn } from "@/lib/cn";

// Shared look for the login and register screens, built to the brief
// (CLAUDE.md → Brand and voice, DESIGN.md §2–5): Dusk brand panel with the
// Gathering ring, Outfit headings, Figtree body, Ember primary button.

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export function AuthLayout({
  title,
  lead,
  points,
  children,
}: {
  title: string;
  lead: string;
  points?: string[];
  children: ReactNode;
}) {
  return (
    <div
      className={`${brandFonts} flex min-h-screen bg-page font-body text-ink [color-scheme:light_dark]`}
    >
      {/* ============ BRAND PANEL (desktop) ============ */}
      <aside
        className="grain relative m-3 hidden w-[46%] max-w-[620px] flex-col justify-between overflow-hidden rounded-[28px] p-10 text-[#F2F3F5] lg:flex xl:p-14"
        style={{ backgroundImage: "linear-gradient(160deg, #14161A, #2A1A12)" }}
      >
        <Link href="/" aria-label="Visibility Campaigns home" className="relative w-fit">
          {/* The panel is dark in both modes, so it always takes the dark logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/v2/visibility-campaigns-logo-dark.svg"
            alt="Visibility Campaigns"
            className="h-10 w-auto"
          />
        </Link>

        <GatheringArt />

        <div className="relative max-w-md">
          <h1 className="hero-reveal font-heading text-4xl leading-[1.08] font-semibold tracking-[-0.03em] xl:text-[2.75rem]">
            {title}
          </h1>
          <p
            className="hero-reveal mt-4 text-[17px] leading-relaxed text-[#B9BEC7]"
            style={{ "--d": "0.08s" } as CSSProperties}
          >
            {lead}
          </p>
          {points && (
            <ul
              className="hero-reveal mt-8 space-y-3"
              style={{ "--d": "0.16s" } as CSSProperties}
            >
              {points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-[15px] text-[#DADDE2]">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#FF7A33]" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* ============ FORM PANEL ============ */}
      <main className="flex flex-1 flex-col px-5 py-6 sm:px-10">
        <Link href="/" aria-label="Visibility Campaigns home" className="w-fit lg:hidden">
          {/* The app shell is light-only (vc-light), so always the light logo */}
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo, next/image would not optimise it */}
          <img src="/logo/v2/visibility-campaigns-logo-light.svg" alt="Visibility Campaigns" className="h-9 w-auto" />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="hero-reveal w-full max-w-[400px]">{children}</div>
        </div>
      </main>
    </div>
  );
}

// The logo's ring, drawn large: eight creators gathering around the business.
// The dots pop in clockwise once on load (the page's one motion moment).
const DOTS = [
  [231, 90, 46],
  [337.07, 133.93, 40],
  [381, 240, 36],
  [337.07, 346.07, 32],
  [231, 390, 28],
  [124.93, 346.07, 32],
  [81, 240, 36],
  [124.93, 133.93, 40],
] as const;

function GatheringArt() {
  return (
    <div className="relative mx-auto my-8 aspect-square w-full max-w-[340px]" aria-hidden="true">
      <div className="auth-glow absolute -inset-[30%]" />
      <svg viewBox="0 0 462 462" className="relative h-full w-full overflow-visible">
        <defs>
          <linearGradient id="auth-ember" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF8A3D" />
            <stop offset="0.55" stopColor="#FF6A1A" />
            <stop offset="1" stopColor="#F2541E" />
          </linearGradient>
        </defs>
        <circle
          cx="231"
          cy="240"
          r="150"
          fill="none"
          stroke="rgb(255 255 255 / 0.12)"
          strokeWidth="1.5"
          strokeDasharray="3 9"
        />
        {DOTS.map(([cx, cy, r], i) => (
          <circle
            key={i}
            className="auth-dot"
            style={{ "--i": i } as CSSProperties}
            cx={cx}
            cy={cy}
            r={r}
            fill="#F2F3F5"
          />
        ))}
        <circle className="auth-core" cx="231" cy="240" r="72" fill="url(#auth-ember)" />
      </svg>

      {/* Floating chips carry small facts (DESIGN.md §4) */}
      <Chip className="top-[6%] -right-[8%]" delay={0.9}>
        <span className="h-2 w-2 rounded-full bg-[#F0B43C]" />
        Posted
      </Chip>
      <Chip className="bottom-[10%] -left-[10%]" delay={1.05}>
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2BC59A] text-[#0F1114]">
          <Check className="h-3 w-3" strokeWidth={3.5} />
        </span>
        Views verified
      </Chip>
    </div>
  );
}

function Chip({
  className,
  delay,
  children,
}: {
  className: string;
  delay: number;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "hero-reveal absolute flex items-center gap-2 rounded-full bg-white/[0.08] px-3.5 py-2 text-sm font-medium text-[#F2F3F5] ring-1 ring-white/15 backdrop-blur-md",
        className
      )}
      style={{ "--d": `${delay}s` } as CSSProperties}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------
// Form parts

const FIELD =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-ink outline-none transition placeholder:text-muted/70 hover:border-muted/50 focus:border-signal focus:ring-4 focus:ring-signal/15";

export function AuthHeading({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-heading text-[2rem] leading-tight font-semibold tracking-[-0.03em]">
        {title}
      </h2>
      <p className="mt-2 text-[15px] text-muted">{lead}</p>
    </div>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  icon?: Icon;
};

export function AuthField({ id, label, icon: FieldIcon, className, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        {FieldIcon && (
          <FieldIcon className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
        )}
        <input id={id} className={cn(FIELD, FieldIcon && "pl-11", className)} {...props} />
      </div>
    </div>
  );
}

export function AuthPasswordField(props: Omit<FieldProps, "type">) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <AuthField {...props} type={show ? "text" : "password"} className="pr-12" />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 bottom-1.5 flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-line/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}

// Orange takes dark ink text, never white (CLAUDE.md → Colour rules)
export function AuthSubmit({
  loading,
  icon: ButtonIcon,
  children,
}: {
  loading: boolean;
  icon?: Icon;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-signal font-heading text-base font-semibold text-on-signal transition duration-150 hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
      {ButtonIcon && !loading && <ButtonIcon className="h-4 w-4" strokeWidth={2.5} />}
    </button>
  );
}

// Orange text fails contrast on white, so links are ink with an orange underline
export function AuthSwitch({ prompt, href, label }: { prompt: string; href: string; label: string }) {
  return (
    <p className="mt-8 text-center text-[15px] text-muted">
      {prompt}{" "}
      <Link
        href={href}
        className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 transition hover:decoration-[3px]"
      >
        {label}
      </Link>
    </p>
  );
}
