import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { ArrowRight, Check, Plus } from "lucide-react";
import { ButtonLink } from "@/components/site/ButtonLink";
import CreatorAvatar, { type AvatarKey } from "@/components/site/CreatorAvatar";
import HeroStage from "@/components/site/HeroStage";
import Problem from "@/components/site/Problem";
import TheTurn from "@/components/site/TheTurn";
import HowItWorks from "@/components/site/HowItWorks";
import RealPosts from "@/components/site/RealPosts";
import Guarantee from "@/components/site/Guarantee";
import WhoItsFor from "@/components/site/WhoItsFor";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: {
    absolute: "Visibility Campaigns — be the business everyone's talking about",
  },
};

export default function HomePage() {
  return (
    <>
      {/* Promise → problem → solution → proof → guarantee (DESIGN.md §8). The
          closing call to action lives in the footer (SiteFooter.tsx). */}
      <Hero />
      <Problem />
      <TheTurn />
      <HowItWorks />
      <RealPosts />
      <Guarantee />
      <WhoItsFor />
      <Creators />
      <Faq />
    </>
  );
}

function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

/* ---------------------------------------------------------------- */

function Hero() {
  return (
    <section className="overflow-hidden pb-20 sm:pb-28">
      {/* Above the globe, so its top tiles never cover the button */}
      <Container className="relative z-10 pt-14 text-center sm:pt-20 lg:pt-24">
        <h1 className="hero-reveal mx-auto max-w-4xl font-heading text-[2.75rem] leading-[0.98] font-medium tracking-[-0.035em] text-balance sm:text-7xl lg:text-[5.25rem]">
          Be the <span className="text-signal text-ember">business</span> {""} everyone&apos;s talking about.
        </h1>
        <p
          className="hero-reveal mx-auto mt-6 max-w-xl text-lg text-muted text-pretty sm:text-xl"
          style={{ "--d": "0.08s" } as CSSProperties}
        >
          Real creators your customers already trust post about you in their own words. Every view verified, every
          result in one report.
        </p>
        <div
          className="hero-reveal mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ "--d": "0.16s" } as CSSProperties}
        >
          <ButtonLink href="/order" className="pl-1.5">
            {/* Fixed dark circle in both modes: this is the dark-background logo file */}
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#14161A] p-1.5" aria-hidden="true">
              <img src="/logo/v2/visibility-campaigns-icon-dark.svg" alt="" className="h-full w-full" />
            </span>
            Start a campaign
          </ButtonLink>
        </div>
      </Container>
      <HeroStage />
    </section>
  );
}

/* ---------------------------------------------------------------- */

// The creators card (DESIGN.md §8, section 7). Its picture is the logo made
// of people: eight founding creators' faces in a ring around the orange
// centre, turning slowly (still with reduced motion).
const RING: AvatarKey[] = ["makeup", "suya", "dancer", "tailor", "barber", "student", "fitness", "stylist"];

const CREATOR_POINTS = [
  "A brief to work from, never a script",
  "Paid for every verified view",
  "TikTok, Instagram and Facebook",
];

function Creators() {
  return (
    <section id="creators" className="cv-auto scroll-mt-16 py-24 sm:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0B0D10] px-6 py-14 text-[#F2F3F5] sm:rounded-[2.5rem] sm:px-12 sm:py-20 lg:px-16">
          <div className="problem-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative grid items-center gap-14 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
            <div className="max-w-lg">
              <h2 className="font-heading text-[2.5rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-6xl">
                Your audience trusts you. Get paid for it.
              </h2>
              <p className="mt-5 text-lg text-[#9AA1AD] text-pretty">
                Join campaigns from businesses near you, post in your own words, and earn for the verified views you
                bring.
              </p>
              <ul className="mt-8 space-y-3">
                {CREATOR_POINTS.map((t) => (
                  <li key={t} className="flex items-center gap-3 text-[#F2F3F5]/90">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" className="mt-10">
                Join as a creator <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonLink>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[18rem] sm:max-w-[24rem]" aria-hidden="true">
              <span className="absolute inset-[11%] rounded-full border border-white/10" />
              <span className="creator-core absolute inset-[39%] rounded-full bg-signal" />
              <div className="creator-ring absolute inset-0">
                {RING.map((who, i) => {
                  const a = (i / RING.length) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <span
                      key={who}
                      className="creator-face absolute w-[19%]"
                      style={{ left: `${50 + 39 * Math.cos(a)}%`, top: `${50 + 39 * Math.sin(a)}%`, translate: "-50% -50%" }}
                    >
                      <CreatorAvatar who={who} large className="w-full ring-[3px] ring-[#0B0D10]" />
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- */

const FAQS = [
  {
    q: "How much does it cost?",
    a: "You choose your budget when you start a campaign, and you can start small. You see how many creator spots it buys before you pay, in naira.",
  },
  {
    q: "How do you stop fake views?",
    a: "Every creator is checked before they can join, every post is matched to their verified account, and every view is checked for signs of faking. Views that fail never reach your bill, and a creator caught cheating is removed and not paid.",
  },
  {
    q: "Do I write what creators say?",
    a: "You write a short brief: what makes you special and what you want people to do. Creators say it in their own words, because that's what their followers trust. They never read from a script.",
  },
  {
    q: "Which platforms do creators post on?",
    a: "TikTok, Instagram and Facebook, from the creators' own accounts, marked as a paid partnership.",
  },
  {
    q: "How do I know if it worked?",
    a: "Your report shows every post with its verified views, plus the website visits, WhatsApp chats and creator codes used at your counter that came from it.",
  },
  {
    q: "Where do you work?",
    a: "We're starting city by city, beginning in Akwa Ibom. Start a campaign and tell us where you are, and we'll let you know when creators near you are ready.",
  },
];

function Faq() {
  return (
    <section id="faq" className="cv-auto scroll-mt-16 py-24 sm:py-32">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
        <h2 className="font-heading text-4xl leading-[1.05] font-medium tracking-[-0.03em] text-balance sm:text-5xl">
          Questions business owners ask us
        </h2>
        <div className="divide-y divide-line border-y border-line">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-heading text-lg font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <Plus
                  className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="-mt-2 max-w-2xl pb-6 text-muted text-pretty">{a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
