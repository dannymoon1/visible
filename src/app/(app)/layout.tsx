import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import AppShell from "@/components/AppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Partner Portal",
};

// The prototype screens are light-only until they are rebuilt to the brief
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${fraunces.variable} min-h-screen bg-ink-50 font-sans text-ink-900 [color-scheme:light] [font-feature-settings:"cv11","ss01"]`}
    >
      <AppShell>{children}</AppShell>
    </div>
  );
}
