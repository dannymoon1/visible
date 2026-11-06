import Link from "next/link";
import Logo from "@/components/site/Logo";
import { ButtonLink } from "@/components/site/ButtonLink";

const NAV = [
  { href: "/creators", label: "For creators" },
  { href: "/agents", label: "Become an agent" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-line bg-page/90 backdrop-blur">
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

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-ink sm:block"
          >
            Log in
          </Link>
          <ButtonLink href="/order" size="sm">
            Start a campaign
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
