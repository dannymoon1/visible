import SourceNote from "@/components/site/SourceNote";
import { TikTokMark } from "@/components/site/BrandIcons";
import type { ReactNode } from "react";
import {
  BadgeCheck,
  Bot,
  Check,
  Facebook,
  Instagram,
  MessageSquareWarning,
  ScanEye,
  Scale,
  ShieldCheck,
  TrendingUp,
  UserX,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// The guarantee (DESIGN.md §8, section 5): how every creator, post and view is
// checked, so businesses and creators can both trust the numbers. The rule
// (decided 2026-11-03): a cheating creator is removed and unpaid; a standby
// takes the spot; if none can post, the money becomes credit, or a refund on
// request.
//
// The panel rises out of the page: transparent at the top, orange at the
// bottom (after Content Rewards' verification layer).
//
// Every check named here is a promise the ops console has to keep from day one.

const PLATFORMS: { name: string; icon: (p: { className?: string }) => ReactNode }[] = [
  { name: "TikTok", icon: TikTokMark },
  { name: "Instagram", icon: (p) => <Instagram {...p} aria-hidden="true" /> },
  { name: "Facebook", icon: (p) => <Facebook {...p} aria-hidden="true" /> },
];

const STAGES: { n: string; label: string; note?: string; visual: ReactNode }[] = [
  {
    n: "I",
    label: "Creator verified",
    visual: (
      <ul className="guarantee-card w-full max-w-[13rem] space-y-3.5 rounded-2xl p-4">
        {PLATFORMS.map(({ name, icon: Icon }) => (
          <li key={name} className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0" />
            <span className="leading-tight">
              <span className="block text-sm font-medium">{name}</span>
              <span className="flex items-center gap-1 text-xs text-[#0E8A6A]">
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                Verified
              </span>
            </span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    n: "II",
    label: "Every post matched",
    visual: (
      <div className="relative flex h-40 w-40 items-center justify-center">
        <span className="guarantee-ring absolute inset-0 rounded-full" aria-hidden="true" />
        <span className="guarantee-ring absolute inset-5 rounded-full" aria-hidden="true" />
        <span className="guarantee-ring absolute inset-10 rounded-full" aria-hidden="true" />
        <span className="guarantee-pulse guarantee-ring absolute inset-10 rounded-full" aria-hidden="true" />
        <span className="guarantee-card relative flex h-14 w-14 items-center justify-center rounded-full">
          <ScanEye className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
    ),
  },
  {
    n: "III",
    label: "Bot and fake checks",
    note: "We compare each post's views with its likes, comments, shares and watch time, flag sudden spikes and bot-like accounts, and look at the creator's account history. Views that fail are taken out before billing.",
    visual: (
      <div className="flex flex-col items-center gap-2">
        {[
          { icon: Bot, t: "Bot viewers", r: "-3deg", x: "0.75rem" },
          { icon: TrendingUp, t: "Sudden view spikes", r: "2deg", x: "-0.5rem" },
          { icon: MessageSquareWarning, t: "Fake likes and comments", r: "-1.5deg", x: "0.5rem" },
        ].map(({ icon: Icon, t, r, x }) => (
          <span
            key={t}
            className="guarantee-card flex items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap"
            style={{ rotate: r, translate: `${x} 0` }}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t}
          </span>
        ))}
      </div>
    ),
  },
  {
    n: "IV",
    label: "Only real views billed",
    visual: (
      <div className="guarantee-card w-full max-w-[15.5rem] rounded-2xl p-2 text-sm whitespace-nowrap">
        <div className="flex items-center gap-3 rounded-xl bg-white/70 py-2.5 pr-3 pl-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0E8A6A]/12 text-[#0E8A6A]">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="flex-1 font-medium">Verified views</span>
          <span className="text-xs text-[#0E8A6A]">Billed</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 pr-3 pl-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#C53030]/10 text-[#C53030]">
            <UserX className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="flex-1 font-medium">Flagged views</span>
          <span className="text-xs text-[#C53030]">Removed</span>
        </div>
      </div>
    ),
  },
];

const PROMISES: { side: string; items: { icon: LucideIcon; title: string; body: string }[] }[] = [
  {
    side: "For businesses",
    items: [
      {
        icon: ShieldCheck,
        title: "You pay only for verified views.",
        body: "Views that fail our checks are taken out before anything reaches your bill.",
      },
      {
        icon: UserX,
        title: "Cheaters lose the spot and the money.",
        body: "A creator caught faking views is removed and not paid, and a standby takes the spot. If none can post, that money becomes credit for your next campaign, or a refund if you ask.",
      },
      {
        icon: BadgeCheck,
        title: "You see every single post.",
        body: "Each post is linked in your report with its own views, clicks and chats.",
      },
    ],
  },
  {
    side: "For creators",
    items: [
      {
        icon: Scale,
        title: "Cheats can't take your share.",
        body: "Creators are paid only for verified views, so faked views earn nothing and can't eat into money meant for honest creators.",
      },
      {
        icon: Wallet,
        title: "Your pay is set aside first.",
        body: "Businesses pay before a campaign starts, and creator money is held in a separate account.",
      },
      {
        icon: Users,
        title: "The same checks for everyone.",
        body: "Every creator passes the same checks on each platform. Bought followers and bought views don't count.",
      },
    ],
  },
];

export default function Guarantee() {
  return (
    <section id="guarantee" className="cv-auto scroll-mt-16 pb-20 sm:pb-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="guarantee-panel grain relative overflow-hidden rounded-b-[2rem] px-5 pt-20 pb-10 sm:rounded-b-[2.5rem] sm:px-10 sm:pt-40">
          <h2 className="relative mx-auto max-w-3xl text-center font-heading text-[2.5rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-6xl">
            Real views from real people. Checked before anyone gets paid.
          </h2>
          {/* The influencer pain lives here, beside its answer */}

          <ol className="relative mt-14 grid gap-12 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {STAGES.map(({ n, label, note, visual }, i) => (
              <li key={n} className="relative flex flex-col items-center">
                <div className="flex h-44 w-full items-center justify-center">{visual}</div>
                {/* Dashed link to the next stage */}
                {i < STAGES.length - 1 && (
                  <span className="guarantee-dash absolute top-[5.5rem] -right-5 hidden w-10 border-t border-dashed lg:block" aria-hidden="true" />
                )}
                {/* Divider between labels, like the reference */}
                {i > 0 && <span className="guarantee-divider absolute bottom-0 left-0 hidden h-12 w-px -translate-x-2 lg:block" aria-hidden="true" />}
                <span className="guarantee-label mt-8 font-serif text-lg opacity-60">{n}</span>
                <span className="guarantee-label mt-1 inline-flex items-center gap-1 font-heading text-lg font-medium [&_button]:text-current [&_button]:opacity-60">
                  {label}
                  {note && <SourceNote text={note} label="How it works" />}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-14 grid gap-12 sm:mt-16 lg:grid-cols-2 lg:gap-0">
          {PROMISES.map(({ side, items }, s) => (
            <div key={side} className={s === 0 ? "lg:border-r lg:border-line lg:pr-10" : "lg:pl-10"}>
              <h3 className="font-heading text-2xl font-medium tracking-[-0.02em]">{side}</h3>
              <ul className="mt-2 divide-y divide-line">
                {items.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="flex gap-4 py-6">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-signal" aria-hidden="true" />
                    <p className="text-muted text-pretty">
                      <span className="font-semibold text-ink">{title}</span> {body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
