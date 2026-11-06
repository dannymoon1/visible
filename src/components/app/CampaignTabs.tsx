"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// The campaign's three questions as tabs. Thumb-sized and sticky under the
// phone's top bar; a plain row on desktop.
export default function CampaignTabs({ base }: { base: string }) {
  const path = usePathname() ?? base;
  const tabs = [
    { href: base, label: "Posts" },
    { href: `${base}/creators`, label: "Creators" },
    { href: `${base}/report`, label: "Report" },
  ];
  return (
    <nav
      className="sticky top-14 z-20 -mx-4 mt-5 border-b border-line bg-page/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:px-0"
      aria-label="Campaign"
    >
      <ul className="flex gap-6">
        {tabs.map(({ href, label }) => {
          const on = path === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "relative block py-3 text-[0.95rem] transition-colors",
                  on ? "font-semibold text-ink" : "text-muted hover:text-ink"
                )}
              >
                {label}
                {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-ink" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
