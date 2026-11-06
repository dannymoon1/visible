import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
