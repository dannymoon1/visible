import Link from "next/link";
import { ArrowRight, Facebook, Instagram } from "lucide-react";
import Logo from "@/components/site/Logo";
import { ButtonLink } from "@/components/site/ButtonLink";
import { SOCIALS, TikTokMark } from "@/components/site/BrandIcons";

// The closing panel and the footer in one (DESIGN.md §8, section 8; modelled
// on Content Rewards' closing card, decided 2026-11-13). A light card floats
// on a warm glow from both sides; two pieces of the logo's ring of dots break
// out of its corners and turn slowly. Only links that lead somewhere real.

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#guarantee", label: "Our guarantee" },
  { href: "/#creators", label: "For creators" },
  { href: "/#faq", label: "Questions" },
  { href: "/login", label: "Log in" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms/creators", label: "Creator terms" },
];

const SOCIAL_LINKS = [
  { href: SOCIALS.tiktok, label: "TikTok", icon: TikTokMark },
  { href: SOCIALS.instagram, label: "Instagram", icon: Instagram },
  { href: SOCIALS.facebook, label: "Facebook", icon: Facebook },
];

// The logo's gathering, drawn big: eight dots on a ring around a centre dot
function RingOfDots({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g className="footer-ring-spin">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={i} cx={100 + 72 * Math.cos(a)} cy={100 + 72 * Math.sin(a)} r="17" fill="currentColor" />;
        })}
      </g>
      <circle cx="100" cy="100" r="26" className="fill-signal" />
    </svg>
  );
}

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden pt-10 pb-6 sm:pt-16 sm:pb-10">
      <div className="footer-glow pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative">
          <RingOfDots className="footer-ring absolute -top-14 -left-10 w-36 text-signal sm:-top-20 sm:-left-16 sm:w-52" />
          <RingOfDots className="footer-ring absolute -right-12 -bottom-16 w-40 text-signal opacity-80 sm:-right-20 sm:-bottom-24 sm:w-60" />

          <div className="relative rounded-[2rem] bg-surface px-6 pt-20 pb-8 ring-1 ring-line sm:rounded-[2.5rem] sm:px-12 sm:pt-28 sm:pb-10">
            <div className="text-center">
              <h2 className="mx-auto max-w-2xl font-heading text-[2.5rem] leading-[1] font-medium tracking-[-0.035em] text-balance sm:text-6xl">
                Get your business talked about this week.
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-lg text-muted text-pretty">
                Tell us about your business. Creators near you do the rest.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <ButtonLink href="/order">
                  Start a campaign <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </ButtonLink>
                <ButtonLink href="/#how-it-works" variant="secondary">
                  See how it works
                </ButtonLink>
              </div>
            </div>

            <div className="mt-20 flex flex-col gap-8 sm:mt-28 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <Link href="/" aria-label="Visibility Campaigns home" className="shrink-0">
                  <Logo className="h-9" />
                </Link>
                <ul className="flex items-center gap-1">
                  {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${SOCIALS.handle} on ${label}`}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-signal"
                      >
                        <Icon className="h-[1.05rem] w-[1.05rem]" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              <nav aria-label="Footer">
                <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
                  {LINKS.map(({ href, label }) => (
                    <li key={href}>
                      <Link href={href} className="transition-colors hover:text-ink">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="mt-8 flex flex-col gap-2 text-xs text-muted sm:flex-row sm:justify-between">
              <p>© {year} Visibility Campaigns. Starting in Uyo and Ikot Ekpene, Akwa Ibom.</p>
              <p>Every creator post carries a paid-partnership label.</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
