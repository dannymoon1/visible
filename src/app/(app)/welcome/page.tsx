"use client";

import Link from "next/link";

// Where a new account lands once its email is confirmed. Creator onboarding
// (handle, city, platforms) is built here next.
export default function Welcome() {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <h1 className="font-heading text-3xl font-semibold tracking-[-0.03em]">You&apos;re in.</h1>
      <p className="mt-3 text-[15px] text-muted">Your email is confirmed and you&apos;re signed in.</p>
      <Link
        href="/discover"
        className="mt-8 inline-flex h-12 items-center rounded-full bg-signal px-6 font-heading font-semibold text-on-signal"
      >
        See campaigns
      </Link>
    </div>
  );
}
