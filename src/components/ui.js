"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

// =========================================================
// Shared UI kit — every page builds from these so the app
// looks and behaves consistently.
// =========================================================

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatNaira(value) {
  return `₦${Number(value || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ---------------------------------------------------------
// Buttons
// ---------------------------------------------------------
const BUTTON_VARIANTS = {
  primary:
    "bg-ink-900 text-white hover:bg-ink-800 shadow-soft focus-visible:ring-ink-900/30",
  brand:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-brand focus-visible:ring-brand-500/40",
  secondary:
    "bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 hover:border-ink-300 shadow-soft focus-visible:ring-ink-300/50",
  ghost:
    "text-ink-600 hover:bg-ink-100 hover:text-ink-900 focus-visible:ring-ink-300/50",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 shadow-soft focus-visible:ring-emerald-500/40",
  danger:
    "bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:ring-red-300/50",
  gold:
    "bg-gradient-to-b from-gold-400 to-gold-500 text-ink-950 hover:from-gold-300 hover:to-gold-400 shadow-soft focus-visible:ring-gold-400/50",
};

const BUTTON_SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  disabled,
  href,
  ...props
}) {
  const classes = cn(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap",
    "transition-all duration-150 active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-4",
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    className
  );

  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon className="h-4 w-4" strokeWidth={2.25} />
      )}
      {children}
      {IconRight && !loading && <IconRight className="h-4 w-4" strokeWidth={2.25} />}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {content}
    </button>
  );
}

// ---------------------------------------------------------
// Surfaces
// ---------------------------------------------------------
export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-ink-200/70 bg-white shadow-soft",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 px-6 py-5",
        className
      )}
    >
      <div>
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        {description && (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[15px] leading-relaxed text-ink-500">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "brand", hint }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    gold: "bg-gold-100 text-gold-600",
    neutral: "bg-ink-100 text-ink-600",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {Icon && (
          <span className={cn("rounded-xl p-2", tones[tone])}>
            <Icon className="h-4 w-4" strokeWidth={2.25} />
          </span>
        )}
      </div>
      <p className="tabular mt-3 text-2xl font-semibold tracking-tight text-ink-950">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </Card>
  );
}

// ---------------------------------------------------------
// Badges
// ---------------------------------------------------------
const BADGE_TONES = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  gold: "bg-gold-100 text-gold-600 ring-gold-300",
};

const DOT_TONES = {
  neutral: "bg-ink-400",
  brand: "bg-brand-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  gold: "bg-gold-500",
};

export function Badge({ tone = "neutral", dot = false, className, children }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        BADGE_TONES[tone],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT_TONES[tone])} />}
      {children}
    </span>
  );
}

// Maps common status strings to badge tones
export function StatusBadge({ status }) {
  const value = String(status || "").toLowerCase();
  const tone =
    ["approved", "completed", "paid", "pass", "success"].includes(value)
      ? "success"
      : ["rejected", "failed", "fail", "cancelled"].includes(value)
      ? "danger"
      : ["pending", "review", "processing"].includes(value)
      ? "warning"
      : "neutral";

  return (
    <Badge tone={tone} dot className="capitalize">
      {value || "unknown"}
    </Badge>
  );
}

// ---------------------------------------------------------
// Forms
// ---------------------------------------------------------
const FIELD_BASE =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 placeholder:text-ink-400 " +
  "shadow-[inset_0_1px_1px_rgb(22_22_29/0.03)] transition " +
  "hover:border-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 " +
  "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

export function Field({ label, hint, error, htmlFor, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-medium text-ink-700"
        >
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className, icon: Icon, ...props }) {
  if (Icon) {
    return (
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input className={cn(FIELD_BASE, "h-11 pl-10", className)} {...props} />
      </div>
    );
  }
  return <input className={cn(FIELD_BASE, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(FIELD_BASE, "py-3 leading-relaxed resize-y", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(FIELD_BASE, "h-11 pr-8", className)} {...props}>
      {children}
    </select>
  );
}

// ---------------------------------------------------------
// Feedback
// ---------------------------------------------------------
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 rounded-2xl bg-ink-100 p-3 text-ink-400">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="font-semibold text-ink-800">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function PageLoader({ label = "Loading..." }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

// Wraps wide tables so they scroll on phones instead of breaking the page
export function TableWrap({ children }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export const tableClasses = {
  table: "w-full text-left text-sm",
  thead: "border-b border-ink-100 bg-ink-50/60",
  th: "px-6 py-3 text-xs font-semibold uppercase tracking-wider text-ink-500",
  tr: "border-b border-ink-100 last:border-0 transition-colors hover:bg-ink-50/50",
  td: "px-6 py-4 align-top text-ink-700",
};
