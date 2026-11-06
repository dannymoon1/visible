"use client";

import { useState, type CSSProperties } from "react";
import { Banknote, Sprout, Ticket, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

// Who it's for (DESIGN.md §8, section 6): expanding panels, one per kind of
// business, each taking its category tint, with what a campaign does for it.
// No figures: these are what each goal looks like, not results. Below them,
// the practical reasons it fits a small business.
//
//   desktop → hover, focus or tap a panel to open it
//   phones  → a swipeable row of open cards

const KINDS = [
  { name: "Food spots", image: "food", tint: "#E8932A", outcome: "More orders on WhatsApp, more people at the counter." },
  { name: "Beauty and salons", image: "beauty", tint: "#E5674F", outcome: "Fuller booking lists and new faces in the chair." },
  { name: "Fashion", image: "fashion", tint: "#8E4C8A", outcome: "More DMs and more visits to your online store." },
  { name: "Gadgets", image: "gadgets", tint: "#1F8A8A", outcome: "More people asking for prices, and walking in to buy." },
  { name: "Health and pharmacy", image: "health", tint: "#3D7FB8", outcome: "Your neighbourhood knows where to find you." },
  { name: "Fitness", image: "fitness", tint: "#C2563A", outcome: "More sign-ups for your next class or challenge." },
];

const BENEFITS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Banknote, title: "Pay in naira", body: "Bank transfer, USSD or card. No dollar card needed." },
  { icon: Sprout, title: "Start small", body: "Try one campaign, see the report, then grow what works." },
  { icon: Ticket, title: "Count walk-ins, not just likes", body: "Creator links and codes show who came because of a post." },
  { icon: UserRound, title: "Help setting up", body: "Where we have agents, one can set up your first campaign with you." },
];

export default function WhoItsFor() {
  const [open, setOpen] = useState(0);

  return (
    <section className="cv-auto border-t border-line py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-center font-mono text-sm text-signal">Who it&apos;s for</p>
        <h2 className="mx-auto mt-4 max-w-3xl text-center font-heading text-[2.5rem] leading-[1.02] font-medium tracking-[-0.03em] text-balance sm:text-6xl">
          Built for businesses people talk about.
        </h2>
      </div>

      {/* Phones: swipe. Desktop: panels that open */}
      <ul
        className="mt-14 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 lg:mx-auto lg:h-[30rem] lg:max-w-6xl lg:snap-none lg:overflow-visible"
        aria-label="Kinds of business"
      >
        {KINDS.map((k, i) => (
          <li
            key={k.name}
            className={cn(
              "who-panel relative h-[26rem] w-[78vw] max-w-[20rem] shrink-0 snap-center overflow-hidden rounded-[1.75rem] lg:h-full lg:w-auto lg:max-w-none lg:shrink",
              open === i ? "lg:flex-[5]" : "lg:flex-[1]"
            )}
            style={{ "--tint": k.tint } as CSSProperties}
            data-open={open === i ? "" : undefined}
            onMouseEnter={() => setOpen(i)}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              onFocus={() => setOpen(i)}
              aria-expanded={open === i}
              className="absolute inset-0 h-full w-full text-left text-white focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white"
            >
              <picture>
                <source
                  type="image/avif"
                  srcSet={`/hero/who/${k.image}-640.avif 640w, /hero/who/${k.image}-960.avif 960w`}
                  sizes="(min-width: 1024px) 36rem, 78vw"
                />
                <img
                  src={`/hero/who/${k.image}-640.webp`}
                  srcSet={`/hero/who/${k.image}-640.webp 640w, /hero/who/${k.image}-960.webp 960w`}
                  sizes="(min-width: 1024px) 36rem, 78vw"
                  alt=""
                  width={960}
                  height={960}
                  loading="lazy"
                  decoding="async"
                  className="who-img absolute inset-0 h-full w-full object-cover"
                />
              </picture>
              <span className="who-tint absolute inset-0" aria-hidden="true" />

              {/* Closed (desktop): the name runs up the panel */}
              <span className="who-closed absolute inset-x-0 bottom-6 hidden justify-center lg:flex">
                <span className="font-heading text-lg font-medium whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                  {k.name}
                </span>
              </span>

              {/* Open: name and what a campaign does */}
              <span className="who-open absolute inset-x-0 bottom-0 block p-6 sm:p-8">
                <span className="block font-heading text-3xl leading-tight font-medium tracking-[-0.02em] sm:text-4xl">
                  {k.name}
                </span>
                <span className="mt-2 block max-w-xs text-white/85 text-pretty">{k.outcome}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <ul className="mx-auto mt-16 grid max-w-6xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {BENEFITS.map(({ icon: Icon, title, body }) => (
          <li key={title}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-signal ring-1 ring-line">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="mt-4 font-heading text-lg font-medium">{title}</p>
            <p className="mt-1 text-muted text-pretty">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
