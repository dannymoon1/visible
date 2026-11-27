"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Megaphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";

// Discover when there are no campaigns, or only a few (tier 1 of the
// creator-launch build): a new creator sees what's coming and what to do
// meanwhile, not a blank page. The checklist ticks itself off from their
// account. Claims stay to what the product does (CLAUDE.md → The model):
// no amounts, no promised dates.

type Readiness = { profile: boolean; payout: boolean; verified: boolean };

function useReadiness() {
  const [ready, setReady] = useState<Readiness | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at, is_verified_creator")
        .eq("id", user.id)
        .maybeSingle();
      const meta = user.user_metadata ?? {};
      if (cancelled) return;
      setReady({
        profile: Boolean(profile?.onboarded_at),
        payout: Boolean(meta.bank_name && meta.account_number && meta.account_name),
        verified: Boolean(profile?.is_verified_creator),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

export default function DiscoverComingSoon({ few = false }: { few?: boolean }) {
  const ready = useReadiness();

  const steps = [
    {
      done: ready?.profile,
      title: "Set up your creator profile",
      body: "Your handle, city and the platforms you post on.",
      href: "/welcome",
      cta: "Set it up",
    },
    {
      done: ready?.payout,
      title: "Add your payout account",
      body: "So we can pay you on the 5th of the month after you earn.",
      href: "/withdraw",
      cta: "Add it",
    },
    {
      done: ready?.verified,
      title: "Get verified",
      body: "We check your platforms by hand. Verified creators can join verified campaigns, and we email you when one starts.",
    },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <section
      aria-labelledby="coming-soon-title"
      className={cn("rounded-[28px] border border-line bg-surface", few ? "p-5 sm:p-6" : "p-5 sm:p-8")}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-signal/15 text-ink">
        <Megaphone className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 id="coming-soon-title" className="mt-4 font-heading text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
        {few ? "More campaigns are coming" : "The first campaigns are on their way"}
      </h2>
      <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
        {few
          ? "Businesses near you are still setting theirs up. New ones show here the day they start."
          : "Businesses in Uyo and Ikot Ekpene are setting up their campaigns now. They show here the day they start."}
      </p>

      {!(few && allDone) && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-ink">{allDone ? "You're ready" : "Get ready meanwhile"}</h3>
          <ol className="mt-3 space-y-2.5">
            {steps.map((s) => (
              <li key={s.title} className="flex items-start gap-3 rounded-2xl bg-page p-3.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                    s.done ? "border-verified bg-verified text-white" : "border-line bg-surface"
                  )}
                  aria-hidden="true"
                >
                  {s.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[15px] font-medium", s.done ? "text-muted" : "text-ink")}>
                    {s.title}
                    <span className="sr-only">{s.done ? " (done)" : " (to do)"}</span>
                  </p>
                  {!s.done && <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.body}</p>}
                  {!s.done && s.href && ready && (
                    <Link
                      href={s.href}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
                    >
                      {s.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}

      {!few && (
        <>
          <h3 className="mt-6 text-sm font-semibold text-ink">How you&apos;ll earn</h3>
          <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-muted">
            <li>
              <span className="font-medium text-ink">Open campaigns:</span> anyone can join. You&apos;re paid for the views your
              post brings once it passes 1,000 views.
            </li>
            <li>
              <span className="font-medium text-ink">Verified campaigns:</span> a fee for each approved post, plus pay for
              views from the first view.
            </li>
            <li>
              <span className="font-medium text-ink">You keep 100%.</span> Everything you earn in a month is paid on the 5th of
              the next.
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
