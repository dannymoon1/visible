"use client";

import { useState } from "react";
import { Check, Ticket } from "lucide-react";
import CreatorAvatar from "@/components/site/CreatorAvatar";
import { ResultRows, ScreenTitle } from "@/components/app/parts";
import { POSTS, TOTALS, count, verifiedPosts } from "@/lib/demo/adiaha";

// Results: everything your campaigns brought, and the counter tool. When a
// customer says "Enoabasi sent me", staff type the creator's code here: it's
// how walk-ins get counted.
const CODES = verifiedPosts.map((p) => ({ code: p.creator.name.toUpperCase(), avatar: p.creator.avatar }));

export default function Results() {
  const [code, setCode] = useState("");
  const [logged, setLogged] = useState<string | null>(null);
  const match = CODES.find((c) => c.code === code.trim().toUpperCase());

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-8">
      <div className="flex flex-col gap-6">
        <ScreenTitle title="Results" />
        <section className="rounded-[1.75rem] bg-surface p-5 ring-1 ring-line sm:p-7">
          <p className="text-muted">Verified views, all campaigns</p>
          <p className="mt-1 font-mono text-[2.6rem] leading-none tracking-[-0.03em] tabular-nums">{count(TOTALS.views + 22410)}</p>
          <p className="mt-2 text-sm text-muted">From {POSTS.length + 8} posts by local creators</p>
        </section>
        <ResultRows title="This campaign brought you" />
      </div>

      <section className="h-fit rounded-[1.75rem] bg-surface p-5 ring-1 ring-line sm:p-7 lg:mt-16">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-page text-signal">
          <Ticket className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold">Did a creator send this customer?</h2>
        <p className="mt-1 text-muted text-pretty">Type the code they mention. Each code counts as a walk-in for that creator.</p>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (match) {
              setLogged(match.code);
              setCode("");
            }
          }}
        >
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setLogged(null);
            }}
            placeholder="e.g. NKEM"
            autoCapitalize="characters"
            className="min-w-0 flex-1 rounded-2xl bg-page px-4 py-3 font-mono text-lg uppercase tracking-wider outline-none ring-1 ring-line focus:ring-2 focus:ring-ink"
            aria-label="Creator code"
          />
          <button type="submit" disabled={!match} className="press rounded-2xl bg-ink px-5 font-medium text-page disabled:opacity-40">
            Count it
          </button>
        </form>
        {logged && (
          <p className="mt-3 flex items-center gap-2 text-sm text-verified">
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            Counted for {logged}
          </p>
        )}

        <p className="mt-6 text-sm text-muted">Codes for this campaign</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {CODES.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => setCode(c.code)}
                className="press inline-flex items-center gap-2 rounded-full bg-page py-1 pr-3 pl-1 font-mono text-sm"
              >
                <CreatorAvatar who={c.avatar} large className="h-6 w-6" />
                {c.code}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
