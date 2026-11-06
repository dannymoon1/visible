import type { ReactNode } from "react";
import type { Metadata } from "next";
import { brandFonts } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Business app film",
  robots: { index: false },
};

// Bare frame for recording the homepage film (no app shell around it)
export default function FilmLayout({ children }: { children: ReactNode }) {
  return <div className={`${brandFonts} font-body`}>{children}</div>;
}
