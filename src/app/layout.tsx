import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import LinkTracker from "@/components/LinkTracker";

// Fonts and page chrome live in the route-group layouts:
// (marketing) for the public site, (app) for the logged-in screens.

export const metadata: Metadata = {
  metadataBase: new URL("https://visibilitycampaigns.com"),
  title: {
    default: "Visibility Campaigns — get talked about by people your customers trust",
    template: "%s · Visibility Campaigns",
  },
  description:
    "Local creators your customers already trust post about your business in their own words. See every view, click and WhatsApp chat it brings.",
  icons: {
    icon: [
      { url: "/logo/v2/visibility-campaigns-icon-light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/logo/v2/visibility-campaigns-icon-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/logo/v2/visibility-campaigns-app-icon-light.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1114" },
  ],
};

// Runs before first paint: the visitor's saved choice (ThemeToggle), else
// their system setting, which it keeps following until they choose
const THEME_SCRIPT = `(function(){var d=document.documentElement;try{var m=matchMedia("(prefers-color-scheme: dark)");var a=function(){var s=localStorage.getItem("vc-theme");d.dataset.theme=s==="light"||s==="dark"?s:m.matches?"dark":"light"};a();m.addEventListener("change",a)}catch(e){d.dataset.theme="light"}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <LinkTracker />
      </body>
    </html>
  );
}
