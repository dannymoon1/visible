import type { ReactNode } from "react";
import Link from "next/link";

// Shared look for the privacy policy and the creator terms (tier 1 of the
// creator-launch build). While `draft` is on, the page says so at the top and
// is kept out of search engines (each page's metadata). Turn it off once the
// founder, and ideally a Nigerian lawyer, has approved the text.

export function LegalPage({
  title,
  updated,
  draft,
  intro,
  children,
}: {
  title: string;
  updated: string;
  draft: boolean;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl px-4 pt-28 pb-20 sm:px-6 sm:pt-36">
      {draft && (
        <p role="note" className="mb-8 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
          <span className="font-semibold">Draft, not yet in force.</span> This text is waiting for review and may change
          before launch.
        </p>
      )}
      <h1 className="font-heading text-4xl leading-tight font-semibold tracking-[-0.03em] sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-8 text-[17px] leading-relaxed text-ink">{intro}</div>
      <div className="mt-4">{children}</div>
      <p className="mt-14 border-t border-line pt-6 text-sm text-muted">
        See also our{" "}
        <Link href="/privacy" className="font-medium text-ink underline decoration-signal decoration-2 underline-offset-4">
          Privacy policy
        </Link>{" "}
        and{" "}
        <Link href="/terms/creators" className="font-medium text-ink underline decoration-signal decoration-2 underline-offset-4">
          Creator terms
        </Link>
        .
      </p>
    </article>
  );
}

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="font-heading text-2xl font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 space-y-4 text-[16px] leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-signal">{children}</ul>;
}

// Something the founder still has to fill in or decide. Visible on the draft
// so nothing goes live with a gap.
export function Fill({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-warning/20 px-1 text-ink">[{children}]</mark>;
}
