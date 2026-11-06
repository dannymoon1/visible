import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const VARIANTS: Record<"primary" | "secondary" | "dark", string> = {
  // Orange takes dark ink text, never white (CLAUDE.md → Colour rules)
  primary: "bg-signal bg-ember text-on-signal shadow-[0_8px_24px_-10px_rgb(255_106_26/0.7)] hover:brightness-105",
  secondary: "border border-line bg-surface text-ink hover:border-muted",
  // On orange panels, where an orange button would disappear
  dark: "bg-[#14161A] text-[#F2F3F5] hover:bg-[#25282E]",
};

const SIZES: Record<"sm" | "md", string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-12 px-5 text-base",
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
        "inline-flex items-center justify-center gap-2 rounded-full font-heading font-semibold whitespace-nowrap transition",
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
