"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Building2, Check, Globe, MapPin, MessageCircle, Store, Users, X, type LucideIcon } from "lucide-react";
import { BASE, CAMPAIGN, naira } from "@/lib/demo/adiaha";
import { cn } from "@/lib/cn";

// New campaign: four steps, one question each. The budget step shows what
// the money buys as the logo's ring, one dot per creator spot.
// Spots ≈ budget × 70% ÷ ₦1,750 (CLAUDE.md → The model).

const STEPS = ["Your business", "Budget", "Where", "Pay"] as const;

const GOALS: { id: string; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "chats", label: "WhatsApp chats", hint: "People message you", icon: MessageCircle },
  { id: "walkins", label: "Walk-ins", hint: "People come to your shop", icon: Store },
  { id: "visits", label: "Website visits", hint: "People open your site or store", icon: Globe },
  { id: "followers", label: "Followers", hint: "People follow your page", icon: Users },
];

const AREAS = ["Uyo", "Ikot Ekpene", "Eket", "Oron"];
const PLATFORMS = ["TikTok", "Instagram", "Facebook"];
const PAY = [
  { id: "transfer", label: "Bank transfer", hint: "Pay into a one-time account number" },
  { id: "ussd", label: "USSD", hint: "Dial a code from any phone" },
  { id: "card", label: "Card", hint: "Naira debit card" },
];

const spotsFor = (budget: number) => Math.max(1, Math.floor((budget * 0.7) / 1750));

export default function NewCampaign() {
  const [step, setStep] = useState(0);
  const [brief, setBrief] = useState(CAMPAIGN.brief);
  const [goal, setGoal] = useState("visits");
  const [budget, setBudget] = useState(20000);
  const [areas, setAreas] = useState(["Uyo"]);
  const [platforms, setPlatforms] = useState(PLATFORMS);
  const [pay, setPay] = useState("transfer");
  const spots = spotsFor(budget);
  const last = step === STEPS.length - 1;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? (list.length > 1 ? list.filter((x) => x !== v) : list) : [...list, v]);

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress: four segments, filled up to this step */}
      <div className="flex items-center gap-3">
        <Link href={BASE} className="press -ml-2 flex h-10 w-10 items-center justify-center rounded-full" aria-label="Close">
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
        <ol className="flex flex-1 gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
          {STEPS.map((s, i) => (
            <li key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <span className={cn("block h-full rounded-full bg-ink transition-[width] duration-300", i <= step ? "w-full" : "w-0")} />
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 text-sm text-muted">
        Step {step + 1} of {STEPS.length}
      </p>

      {step === 0 && (
        <Step title="Tell us about your business">
          <Field label="What makes you special?" hint="Creators use this to talk about you in their own words. It's a brief, never a script.">
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-2xl bg-surface px-4 py-3.5 text-[1rem] leading-relaxed ring-1 ring-line outline-none focus:ring-2 focus:ring-ink"
            />
          </Field>
          <Field label="Where do people find you?">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input icon={Globe} defaultValue={CAMPAIGN.where[0]} label="Website or online store" />
              <Input icon={MapPin} defaultValue={CAMPAIGN.where[1]} label="Shop address" />
            </div>
          </Field>
          <Field label="What do you want more of?">
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(({ id, label, hint, icon: Icon }) => {
                const on = goal === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGoal(id)}
                    aria-pressed={on}
                    className={cn(
                      "press relative rounded-2xl p-4 text-left ring-1 transition-colors",
                      on ? "bg-ink text-page ring-ink" : "bg-surface ring-line hover:ring-muted"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", on ? "text-signal" : "text-muted")} aria-hidden="true" />
                    <span className="mt-3 block font-medium">{label}</span>
                    <span className={cn("block text-sm", on ? "text-page/70" : "text-muted")}>{hint}</span>
                    {on && <Check className="absolute top-4 right-4 h-4 w-4" strokeWidth={3} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </Field>
        </Step>
      )}

      {step === 1 && (
        <Step title="Set your budget">
          <div className="rounded-[1.75rem] bg-surface p-6 text-center ring-1 ring-line">
            <BudgetRing spots={spots} />
            <p className="mt-6 font-mono text-[2.6rem] leading-none tracking-[-0.03em] tabular-nums">{naira(budget)}</p>
            <p className="mt-2 text-muted">
              {spots} creator {spots === 1 ? "spot" : "spots"}
            </p>
            <input
              type="range"
              min={5000}
              max={150000}
              step={5000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="budget-range mt-6 w-full"
              aria-label="Budget"
            />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>{naira(5000)}</span>
              <span>{naira(150000)}</span>
            </div>
          </div>
          <p className="text-sm text-muted text-pretty">
            Creators are paid for the verified views they bring. You only pay for real views: anything that fails our checks
            comes back as credit.
          </p>
        </Step>
      )}

      {step === 2 && (
        <Step title="Where should creators be?">
          <Field label="Areas" hint="Creators whose followers are near you">
            <Chips options={AREAS} on={areas} onToggle={(v) => toggle(areas, setAreas, v)} />
          </Field>
          <Field label="Platforms">
            <Chips options={PLATFORMS} on={platforms} onToggle={(v) => toggle(platforms, setPlatforms, v)} />
          </Field>
        </Step>
      )}

      {step === 3 && (
        <Step title="Check and pay">
          <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] bg-surface ring-1 ring-line">
            <Summary label="Goal" value={GOALS.find((g) => g.id === goal)!.label} />
            <Summary label="Creators" value={`${spots} spots in ${areas.join(", ")}`} />
            <Summary label="Platforms" value={platforms.join(", ")} />
            <Summary label="Budget" value={naira(budget)} strong />
          </ul>
          <Field label="How do you want to pay?">
            <div className="flex flex-col gap-2">
              {PAY.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPay(p.id)}
                  aria-pressed={pay === p.id}
                  className={cn(
                    "press flex items-center gap-3 rounded-2xl bg-surface px-4 py-3.5 text-left ring-1",
                    pay === p.id ? "ring-2 ring-ink" : "ring-line"
                  )}
                >
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full ring-1", pay === p.id ? "bg-ink ring-ink" : "ring-muted")}>
                    {pay === p.id && <span className="h-2 w-2 rounded-full bg-page" />}
                  </span>
                  <span>
                    <span className="block font-medium">{p.label}</span>
                    <span className="block text-sm text-muted">{p.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </Field>
          <p className="flex items-center gap-2 text-sm text-muted">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            Creators&apos; money is held in a separate account until they&apos;re paid.
          </p>
        </Step>
      )}

      {/* Bottom bar: thumb reach on phones, inline on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-xl gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="press h-12 rounded-full px-5 font-medium ring-1 ring-line">
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => !last && setStep(step + 1)}
            className="press h-12 flex-1 rounded-full bg-ember font-heading font-semibold text-on-signal"
          >
            {last ? `Pay ${naira(budget)}` : step === 0 ? "Find creators" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="step-in mt-1">
      <h1 className="font-heading text-[1.9rem] leading-[1.08] font-semibold tracking-[-0.025em] sm:text-[2.3rem]">{title}</h1>
      <div className="mt-7 flex flex-col gap-7">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-medium">{label}</p>
      {hint && <p className="mt-0.5 text-sm text-muted text-pretty">{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Input({ icon: Icon, label, defaultValue }: { icon: LucideIcon; label: string; defaultValue: string }) {
  return (
    <label className="flex items-center gap-2.5 rounded-2xl bg-surface px-4 py-3 ring-1 ring-line focus-within:ring-2 focus-within:ring-ink">
      <Icon className="h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input defaultValue={defaultValue} className="min-w-0 flex-1 bg-transparent outline-none" />
    </label>
  );
}

function Chips({ options, on, onToggle }: { options: string[]; on: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = on.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onToggle(o)}
            aria-pressed={active}
            className={cn(
              "press inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[0.95rem] ring-1",
              active ? "bg-ink text-page ring-ink" : "bg-surface ring-line"
            )}
          >
            {active && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-4 px-4 py-3.5">
      <span className="text-muted">{label}</span>
      <span className={cn("text-right", strong && "font-mono text-lg tabular-nums")}>{value}</span>
    </li>
  );
}

// What the budget buys, as the ring: one dot per spot around the business
function BudgetRing({ spots }: { spots: number }) {
  const n = Math.min(spots, 60);
  const r = n > 24 ? 44 : 40;
  const dot = n > 24 ? 5 : n > 12 ? 8 : 11;
  return (
    <div className="relative mx-auto aspect-square w-44" aria-hidden="true">
      <span className="absolute top-1/2 left-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember" />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        return (
          <span
            key={`${n}-${i}`}
            className="budget-dot absolute rounded-full bg-ink"
            style={{
              width: `${dot}%`,
              height: `${dot}%`,
              left: `${50 + r * Math.cos(a) - dot / 2}%`,
              top: `${50 + r * Math.sin(a) - dot / 2}%`,
              animationDelay: `${i * 12}ms`,
            }}
          />
        );
      })}
    </div>
  );
}
