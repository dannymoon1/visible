import type { ReactNode } from "react";
import { brandFonts } from "@/lib/fonts";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import SectionLinks from "@/components/site/SectionLinks";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${brandFonts} flex min-h-screen flex-col bg-page font-body text-ink`}
    >
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <SectionLinks />
    </div>
  );
}
