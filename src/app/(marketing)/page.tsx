import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { ArrowRight, Plus } from "lucide-react";
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
      {/* Promise → problem → solution → proof → guarantee (DESIGN.md §8) */}
      <Hero />
      <Problem />
      <TheTurn />
      <HowItWorks />
      <RealPosts />
      <Guarantee />
      <WhoItsFor />
      <CreatorsAndAgents />
      <Faq />
      <FinalCta />
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

// Founding creators scattered around the line (DESIGN.md §8, section 7)
const SCATTER: { who: AvatarKey; x: string; y: string; size: string }[] = [
  { who: "makeup", x: "7%", y: "12%", size: "3.25rem" },
  { who: "suya", x: "84%", y: "9%", size: "2.75rem" },
  { who: "dancer", x: "89%", y: "60%", size: "3.5rem" },
  { who: "student", x: "4%", y: "66%", size: "2.5rem" },
  { who: "fitness", x: "72%", y: "87%", size: "2.25rem" },
  { who: "tailor", x: "20%", y: "88%", size: "2.75rem" },
];

function CreatorsAndAgents() {
  return (
    <section className="cv-auto border-t border-line py-24 sm:py-32">
      <Container className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0B0D10] px-8 py-20 text-[#F2F3F5] sm:px-14 sm:py-24">
          <div className="problem-glow pointer-events-none absolute inset-0" aria-hidden="true" />
          {SCATTER.map(({ who, x, y, size }) => (
            <span key={who} className="absolute hidden sm:block" style={{ left: x, top: y, width: size }} aria-hidden="true">
              <CreatorAvatar who={who} large className="w-full ring-2 ring-white/10" />
            </span>
          ))}
          <div className="relative mx-auto max-w-md text-center">
            <p className="font-mono text-sm text-[#FF7A33]">For creators</p>
            <h2 className="mt-4 font-heading text-4xl leading-[1.05] font-medium tracking-[-0.03em] text-balance sm:text-5xl">
              Your audience trusts you. Get paid for it.
            </h2>
            <p className="mt-4 text-lg text-[#9AA1AD] text-pretty">
              Join campaigns from businesses near you, post in your own words, and earn for the verified views you
              bring.
            </p>
            <ButtonLink href="/creators" className="mt-8">
              Join as a creator <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] bg-surface px-8 py-12 ring-1 ring-line sm:px-10">
          <div>
            <p className="font-mono text-sm text-signal">For agents</p>
            <h2 className="mt-4 font-heading text-3xl leading-[1.08] font-medium tracking-[-0.02em] text-balance sm:text-4xl">
              Know business owners? Earn when they grow.
            </h2>
            <p className="mt-4 text-muted text-pretty">
              Bring businesses on board as a Visibility Agent and earn a share of every campaign they run for six
              months.
            </p>
          </div>
          <ButtonLink href="/agents" variant="secondary" className="mt-10 self-start">
            Become an agent <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
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
    <section className="cv-auto border-t border-line py-24 sm:py-32">
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

/* ---------------------------------------------------------------- */

function FinalCta() {
  return (
    <section className="cv-auto pb-24 sm:pb-32">
      <Container>
        <div className="final-cta grain relative overflow-hidden rounded-[2rem] px-6 py-20 text-center text-[#14161A] sm:rounded-[2.5rem] sm:py-28">
          <h2 className="relative mx-auto max-w-3xl font-heading text-[2.75rem] leading-[0.98] font-medium tracking-[-0.035em] text-balance sm:text-7xl">
            Get your business talked about this week.
          </h2>
          <p className="relative mx-auto mt-5 max-w-md text-lg text-[#14161A]/75 text-pretty">
            Tell us about your business. Creators near you do the rest.
          </p>
          <ButtonLink href="/order" variant="dark" className="relative mt-9">
            Start a campaign <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
