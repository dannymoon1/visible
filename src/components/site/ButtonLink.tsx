import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Buttons are flat: one solid colour, no shadow, no gradient. Hover deepens
// the colour a touch, pressing sinks the button slightly, and an arrow inside
// (any svg after the text) nudges forward on hover.
const VARIANTS: Record<"primary" | "secondary" | "dark", string> = {
  // Orange takes dark ink text, never white (CLAUDE.md → Colour rules)
  primary: "bg-signal text-on-signal hover:brightness-95",
  secondary: "border border-line bg-transparent text-ink hover:border-ink/40",
  // On light or orange panels, where an orange button would disappear
  dark: "bg-[#14161A] text-[#F2F3F5] hover:bg-[#25282E] dark:bg-[#F2F3F5] dark:text-[#14161A] dark:hover:bg-white",
};

const SIZES: Record<"sm" | "md", string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-12 px-6 text-base",
};

interface ButtonLinkProps {
  href: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: ReactNode;
}

export function ButtonLink({ href, variant = "primary", size = "md", className, children }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group/btn inline-flex items-center justify-center gap-2 rounded-full font-heading font-semibold whitespace-nowrap",
        "transition-[filter,background-color,border-color,scale] duration-200 active:scale-[0.97]",
        "[&>svg:last-child]:transition-transform [&>svg:last-child]:duration-200 hover:[&>svg:last-child]:translate-x-0.5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {children}
    </Link>
  );
}
