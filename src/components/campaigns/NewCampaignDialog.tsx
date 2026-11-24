"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Play, SealCheck, Storefront, UsersThree, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import Modal from "@/components/ui/Modal";
import { pillButton } from "@/components/ui/AppParts";
import CreatorAvatar, { type AvatarKey } from "@/components/site/CreatorAvatar";
import { cn } from "@/lib/cn";
import type { CampaignType } from "@/lib/campaignOptions";

// "New campaign": the brand picks Open or Verified before the builder opens
// (campaign creation plan, screen 1). Each type has its own colour, its own
// selected colour and a drawn illustration; one line of text, no prices
// (prices live in the builder). Illustrations are built in code with the
// creator-face sprite already used on the site, so nothing new downloads.

interface TypeOption {
  key: CampaignType;
  title: string;
  line: string;
  icon: PhosphorIcon;
  // Card colours: background wash, accent (selected outline, tick, icon)
  wash: string;
  accent: string;
  art: (props: { active: boolean }) => ReactNode;
}

const OPTIONS: TypeOption[] = [
  {
    key: "open",
    title: "Open",
    line: "Any creator can join and post.",
    icon: UsersThree,
    wash: "radial-gradient(120% 85% at 85% 100%, #FFE2BF 0%, #FFF3E3 42%, #FFFFFF 78%)",
    accent: "#C2610C",
    art: OpenArt,
  },
  {
    key: "verified",
    title: "Verified",
    line: "Only verified creators, in fixed spots.",
    icon: SealCheck,
    wash: "radial-gradient(120% 85% at 85% 100%, #C9EEDF 0%, #EAF8F1 42%, #FFFFFF 78%)",
    accent: "#0E8A6A",
    art: VerifiedArt,
  },
];

export default function NewCampaignDialog({
  open,
  onClose,
  initialChoice = null,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  // In the builder: the current type, and what to do with a new choice
  // (instead of opening the builder)
  initialChoice?: CampaignType | null;
  onChoose?: (type: CampaignType) => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<CampaignType | null>(initialChoice);
  const [opening, setOpening] = useState(false);

  // Fetch the builder while the brand is choosing, so Continue feels instant
  useEffect(() => {
    if (open && !onChoose) router.prefetch("/order/new");
  }, [open, onChoose, router]);

  const start = () => {
    if (!choice || opening) return;
    if (onChoose) {
      onChoose(choice);
      return;
    }
    setOpening(true);
    // new=1: a fresh draft, not one left from before (that one is offered on
    // Campaigns as "Continue your draft")
    router.push(`/order/new?type=${choice}&new=1`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={onChoose ? "Campaign type" : "New campaign"}
      description="Who should post about your business?"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={pillButton("ghost")}>
            Cancel
          </button>
          <button type="button" onClick={start} disabled={!choice || opening} className={pillButton("ink", "min-w-[8.5rem]")}>
            {opening ? "Opening…" : onChoose ? "Use this type" : "Continue"}
          </button>
        </div>
      }
    >
      <div className="grid gap-3 sm:flex sm:justify-center sm:gap-[var(--cards-gap)]" role="radiogroup" aria-label="Campaign type">
        {OPTIONS.map((o) => (
          <TypeCard key={o.key} option={o} active={choice === o.key} onSelect={() => setChoice(o.key)} onConfirm={start} />
        ))}
      </div>
    </Modal>
  );
}

function TypeCard({
  option,
  active,
  onSelect,
  onConfirm,
}: {
  option: TypeOption;
  active: boolean;
  onSelect: () => void;
  onConfirm: () => void;
}) {
  const { title, line, icon: Icon, wash, accent, art: Art } = option;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      onDoubleClick={onConfirm}
      style={{ background: wash, "--accent": accent } as CSSProperties}
      className={cn(
        // Phones: full-width cards 22rem tall. From sm, .vc-type-card sizes the
        // card to the screen (globals.css) and 1em inside follows its height
        "vc-type-card group press relative h-[22rem] shrink-0 overflow-hidden rounded-[1.5rem] text-left ring-1 transition-[box-shadow] duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-inset",
        "ring-inset",
        active ? "ring-2 ring-[var(--accent)]" : "ring-line hover:ring-[color-mix(in_oklab,var(--accent)_35%,var(--color-line))]"
      )}
    >
      <span className="vc-type-card-body absolute inset-0 flex flex-col p-[1.25em] sm:p-[1.5em]">
        <span className="flex items-start justify-between">
          <span className="flex h-[2.75em] w-[2.75em] items-center justify-center rounded-[1em] bg-white/80 shadow-[0_1px_2px_rgb(20_22_26/0.06)] ring-1 ring-black/5">
            <Icon weight="duotone" className="h-[1.5em] w-[1.5em] text-[var(--accent)]" aria-hidden="true" />
          </span>
          <span
            className={cn(
              "flex h-[1.5em] w-[1.5em] items-center justify-center rounded-full transition-colors duration-200",
              active ? "bg-[var(--accent)] text-white" : "bg-white/80 ring-1 ring-line"
            )}
            aria-hidden="true"
          >
            <Check weight="bold" className={cn("h-[0.875em] w-[0.875em] transition-[opacity,scale] duration-200", active ? "opacity-100" : "scale-50 opacity-0")} />
          </span>
        </span>

        {/* The text keeps a readable size while the picture scales with the card */}
        <span className="relative z-[1] mt-[1em] block sm:mt-[1.25em]">
          <span className="block font-heading text-[1.65rem] leading-none font-semibold tracking-[-0.03em] text-ink sm:text-[max(1.5rem,1.9em)]">{title}</span>
          <span className="mt-1.5 block text-[0.95rem] text-muted sm:text-[max(0.875rem,0.95em)]">{line}</span>
        </span>

        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%]" aria-hidden="true">
          <span className="block h-full w-full sm:origin-bottom sm:scale-[1.18]">
            <Art active={active} />
          </span>
        </span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------
// Open: many creators, each posting in their own style

const POSTS: { who: AvatarKey; views: string; tone: string; tilt: number; x: number; y: number }[] = [
  { who: "suya", views: "1.8K", tone: "linear-gradient(150deg,#FFB86B,#F07A3A)", tilt: -11, x: -104, y: 16 },
  { who: "stylist", views: "3.4K", tone: "linear-gradient(150deg,#FFD08A,#F2994A)", tilt: 0, x: 0, y: 0 },
  { who: "market", views: "2.1K", tone: "linear-gradient(150deg,#FFC59E,#E86F51)", tilt: 11, x: 104, y: 16 },
];

const CROWD: { who: AvatarKey; x: string; y: string; size: number }[] = [
  { who: "barber", x: "14%", y: "4%", size: 30 },
  { who: "student", x: "27%", y: "-4%", size: 22 },
  { who: "dancer", x: "76%", y: "0%", size: 28 },
  { who: "bakery", x: "65%", y: "-6%", size: 22 },
];

function OpenArt({ active }: { active: boolean }) {
  return (
    <span className="relative block h-full w-full">
      {CROWD.map((c) => (
        <span
          key={c.who}
          className="absolute rounded-full bg-white p-[0.125em] shadow-[0_4px_12px_-4px_rgb(20_22_26/0.25)] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-translate-y-1"
          style={{ left: c.x, top: c.y }}
        >
          <CreatorAvatar who={c.who} large className="block" style={{ width: `${c.size / 16}em`, height: `${c.size / 16}em` }} />
        </span>
      ))}
      <span className="absolute top-[14%] right-[13%] rounded-full bg-[var(--accent)] px-[0.7em] py-[0.2em] font-mono text-[0.6875em] font-semibold text-white shadow-sm">
        +24
      </span>

      {POSTS.map((p, i) => {
        const spread = active ? 1.14 : 1;
        return (
          <span
            key={p.who}
            className="absolute bottom-[-7%] left-1/2 w-[6.2em] sm:bottom-[-2%] rounded-[1em] bg-white p-[0.375em] shadow-[0_14px_30px_-12px_rgb(20_22_26/0.35)] ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] sm:w-[7.4em]"
            style={{
              transform: `translateX(calc(-50% + ${(p.x * spread) / 16}em)) translateY(${(p.y - (i === 1 && active ? 8 : 0)) / 16}em) rotate(${p.tilt * spread}deg)`,
              zIndex: i === 1 ? 2 : 1,
            }}
          >
            <span className="flex items-center gap-[0.375em] px-[0.125em] pb-[0.375em]">
              <CreatorAvatar who={p.who} large className="h-[1.25em] w-[1.25em]" />
              <span className="h-[0.375em] w-[2.5em] rounded-full bg-line" />
            </span>
            <span className="relative block aspect-square overflow-hidden rounded-[0.75em]" style={{ background: p.tone }}>
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-[2em] w-[2em] items-center justify-center rounded-full bg-white/85 backdrop-blur-sm">
                  <Play weight="fill" className="ml-[0.125em] h-[0.875em] w-[0.875em] text-ink" />
                </span>
              </span>
              <span className="absolute bottom-[0.6em] left-[0.6em] flex items-center gap-[0.4em] rounded-full bg-black/45 px-[0.6em] py-[0.2em] font-mono text-[0.625em] text-white backdrop-blur-sm">
                <Eye weight="bold" className="h-[1.2em] w-[1.2em]" />
                {p.views}
              </span>
            </span>
          </span>
        );
      })}
    </span>
  );
}

// ---------------------------------------------------------------
// Verified: the Gathering ring of verified creators around the business

const RING: AvatarKey[] = ["makeup", "gadget", "tailor", "fitness", "salon", "pharmacist", "decorator", "barber"];

function VerifiedArt({ active }: { active: boolean }) {
  const radius = 3.75; // em
  return (
    <span className="relative block h-full w-full">
      <span
        className="absolute bottom-[5%] left-1/2 h-[9.75em] sm:bottom-[8%] w-[9.75em] transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ transform: `translateX(-50%) scale(${active ? 1.05 : 1})` }}
      >
        <span className="absolute inset-[1em] rounded-full border border-dashed border-[color-mix(in_oklab,var(--accent)_30%,transparent)]" />
        <span className="absolute inset-[2.75em] rounded-full bg-white/60" />

        {RING.map((who, i) => {
          const a = (i / RING.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <span
              key={who}
              className="absolute top-1/2 left-1/2"
              style={{ transform: `translate(calc(-50% + ${Math.cos(a) * radius}em), calc(-50% + ${Math.sin(a) * radius}em))` }}
            >
              <span className="relative block rounded-full bg-white p-[0.125em] shadow-[0_6px_14px_-6px_rgb(20_22_26/0.35)]">
                <CreatorAvatar who={who} large className="h-[2em] w-[2em]" />
                <span
                  className={cn(
                    "absolute -right-[0.25em] -bottom-[0.25em] flex h-[1.125em] w-[1.125em] items-center justify-center rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    active ? "scale-110" : "scale-100"
                  )}
                  style={{ transitionDelay: active ? `${i * 30}ms` : "0ms" }}
                >
                  <SealCheck weight="fill" className="h-[1em] w-[1em] text-[var(--accent)]" />
                </span>
              </span>
            </span>
          );
        })}

        <span className="absolute top-1/2 left-1/2 flex h-[3em] w-[3em] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1em] bg-signal shadow-[0_10px_24px_-10px_rgb(255_106_26/0.8)]">
          <Storefront weight="fill" className="h-[1.5em] w-[1.5em] text-ink" />
        </span>
      </span>
    </span>
  );
}
