import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import AppShell from "@/components/AppShell";
import { brandFonts } from "@/lib/fonts";

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

// The prototype screens are light-only until they are rebuilt to the brief.
// vc-light pins the brand tokens to light; brandFonts makes Outfit, Figtree
// and Plex Mono available to the screens already rebuilt (Discover, Campaigns).
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${fraunces.variable} ${brandFonts} vc-light min-h-screen bg-ink-50 font-sans text-ink-900 [color-scheme:light] [font-feature-settings:"cv11","ss01"]`}
    >
      <AppShell>{children}</AppShell>
    </div>
  );
}
