import Link from "next/link";
import Logo from "@/components/site/Logo";
import ThemeToggle from "@/components/site/ThemeToggle";
import { ButtonLink } from "@/components/site/ButtonLink";

// Only links that lead somewhere real. Agents are off the site for now
// (decided 2026-11-13); /creators returns when that page is built.
const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#guarantee", label: "Our guarantee" },
  { href: "/#creators", label: "For creators" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-page/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Visibility Campaigns home" className="shrink-0">
          <Logo className="h-9 sm:h-10" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className="transition-colors hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-ink sm:block"
          >
            Log in
          </Link>
          <ButtonLink href="/order" size="sm" className="ml-1">
            Start a campaign
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
