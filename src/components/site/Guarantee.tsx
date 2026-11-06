import SourceNote from "@/components/site/SourceNote";
import type { ReactNode } from "react";
import { BadgeCheck, Check, Flag, Link2, ShieldCheck, TrendingUp, UserX, Users, Coins, Eye, type LucideIcon } from "lucide-react";

// The guarantee (DESIGN.md §8, section 5): how every view is checked, and
// what happens to money behind views that fail. The rule (decided 2026-11-03):
// a cheating creator is removed and unpaid; a standby takes the spot; if none
// can post, the money becomes credit, or a refund on request.
//
// Every check named here is a promise the ops console has to keep from day one.

const STAGES: { n: string; label: string; visual: ReactNode }[] = [
  {
    n: "I",
    label: "Creator checked",
    visual: (
      <ul className="guarantee-card w-full max-w-[14rem] space-y-2.5 rounded-2xl p-4 text-sm">
        {["ID matches bank name", "Account 3+ months old", "Real recent views"].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0E8A6A] text-white">
              <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden="true" />
            </span>
            {t}
          </li>
        ))}
      </ul>
    ),
  },
  {
    n: "II",
    label: "Post matched",
    visual: (
      <div className="relative flex h-36 w-36 items-center justify-center">
        <span className="guarantee-pulse absolute inset-6 rounded-full border border-white" aria-hidden="true" />
        <span className="absolute inset-0 rounded-full border border-white/60" aria-hidden="true" />
        <span className="absolute inset-5 rounded-full border border-white/70 bg-white/20" aria-hidden="true" />
        <span className="guarantee-card relative flex h-14 w-14 items-center justify-center rounded-full">
          <Link2 className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
    ),
  },
  {
    n: "III",
    label: "Views checked",
    visual: (
      <div className="flex flex-col items-center gap-2">
        {[
          { icon: TrendingUp, t: "Sudden spikes", r: "-3deg" },
          { icon: Eye, t: "Views without engagement", r: "2deg" },
          { icon: Users, t: "Audience far from you", r: "-1.5deg" },
        ].map(({ icon: Icon, t, r }) => (
          <span key={t} className="guarantee-card flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ rotate: r }}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    n: "IV",
    label: "Verified report",
    visual: (
      <div className="guarantee-card flex items-center gap-3 rounded-2xl py-3 pr-5 pl-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#14161A]/10">
          <Flag className="h-5 w-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block font-mono text-xl leading-tight">1,912</span>
          <span className="block text-xs opacity-70">views removed, not billed</span>
        </span>
      </div>
    ),
  },
];

const PROMISES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "You only pay for verified views.",
    body: "Views that fail our checks are taken out before anything reaches your bill.",
  },
  {
    icon: UserX,
    title: "Cheaters lose the spot and the money.",
    body: "A creator caught faking views is removed and not paid. A standby creator takes their place.",
  },
  {
    icon: Coins,
    title: "Unfilled spots come back to you.",
    body: "If no standby can post, that money becomes credit for your next campaign. Prefer a refund? Just ask.",
  },
  {
    icon: BadgeCheck,
    title: "You see every single post.",
    body: "Each post is linked in your report with its own views, clicks and chats. Not just one total.",
  },
];

export default function Guarantee() {
  return (
    <section id="guarantee" className="cv-auto scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center font-mono text-sm text-signal">The guarantee</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-center font-heading text-[2.5rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-6xl">
          Real views from real people. Or you don&apos;t pay for them.
        </h2>
        {/* The influencer pain lives here, beside its answer */}
        <p className="mx-auto mt-5 max-w-xl text-center text-lg text-muted text-pretty">
          Paid an influencer before and got one story, no report and no proof? Followers and views can be bought: over
          half of Instagram influencers have used fake engagement
          <SourceNote text="HypeAuditor, State of Instagram Influencer Fraud, 2021: 55% of Instagram influencers engaged in some form of fraud." />
          . Here&apos;s how we make sure you only pay for real people.
        </p>

        <div className="guarantee-panel grain relative mt-14 overflow-hidden rounded-[2rem] px-6 pt-12 pb-10 sm:mt-16 sm:rounded-[2.5rem] sm:px-10">
          <ol className="relative grid gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {STAGES.map(({ n, label, visual }, i) => (
              <li key={n} className="relative flex flex-col items-center">
                <div className="flex h-44 w-full items-center justify-center">{visual}</div>
                {/* Dashed link to the next stage */}
                {i < STAGES.length - 1 && (
                  <span
                    className="absolute top-[5.5rem] -right-4 hidden w-8 border-t border-dashed border-[#14161A]/25 lg:block"
                    aria-hidden="true"
                  />
                )}
                <span className="mt-8 font-serif text-lg text-[#14161A]/60">{n}</span>
                <span className="mt-1 font-heading text-lg font-medium text-[#14161A]">{label}</span>
              </li>
            ))}
          </ol>
        </div>

        <ul className="mt-14 grid sm:grid-cols-2">
          {PROMISES.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className={[
                "flex gap-4 border-line py-8 sm:px-8",
                i < 2 ? "border-b" : "",
                i % 2 === 0 ? "sm:border-r" : "",
                i === 2 ? "border-b sm:border-b-0" : "",
              ].join(" ")}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
              <p className="text-muted text-pretty">
                <span className="font-semibold text-ink">{title}</span> {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
