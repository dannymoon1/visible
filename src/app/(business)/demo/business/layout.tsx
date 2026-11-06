import type { ReactNode } from "react";
import type { Metadata } from "next";
import { brandFonts } from "@/lib/fonts";
import BusinessShell from "@/components/app/BusinessShell";

export const metadata: Metadata = {
  title: "Business app demo",
  robots: { index: false },
};

// The business app with a made-up campaign (src/lib/demo/adiaha.ts), for
// showing and for recording the homepage video. The real app reuses these
// screens behind login.
export default function BusinessDemoLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${brandFonts} font-body`}>
      <BusinessShell>{children}</BusinessShell>
    </div>
  );
}
