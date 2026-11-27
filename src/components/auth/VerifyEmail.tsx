"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  CODE_LENGTH,
  RESEND_WAIT_S,
  clearPendingSignup,
  confirmRedirect,
  savePendingSignup,
} from "@/lib/pendingSignup";
import { AuthSubmit } from "@/components/auth/AuthParts";

// The "check your inbox" step after sign-up. Typing the emailed code confirms
// the email and signs the person in, then onboarding opens: no second sign-in.
export default function VerifyEmail({
  email,
  sentAt,
  notice,
  onChangeEmail,
}: {
  email: string;
  sentAt: number;
  notice?: string;
  onChangeEmail: () => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(notice ?? "");
  const [info, setInfo] = useState("");
  const [lastSent, setLastSent] = useState(sentAt);
  const [now, setNow] = useState(() => Date.now());
  const [resending, setResending] = useState(false);
  const submitted = useRef("");

  // Ticks the resend countdown
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const wait = Math.max(0, RESEND_WAIT_S - Math.floor((now - lastSent) / 1000));

  const verify = async (value: string) => {
    if (value.length !== CODE_LENGTH || submitted.current === value) return;
    submitted.current = value;
    setChecking(true);
    setError("");
    setInfo("");

    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: value, type: "email" });
    if (verifyError) {
      setChecking(false);
      setError(
        /expired|invalid/i.test(verifyError.message)
          ? "That code is wrong or has expired. Check the latest email, or send a new code."
          : verifyError.message
      );
      return;
    }

    clearPendingSignup();
    router.replace("/welcome");
    router.refresh();
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submitted.current = "";
    verify(code);
  };

  const resend = async () => {
    if (wait > 0 || resending) return;
    setResending(true);
    setError("");
    setInfo("");
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: confirmRedirect() },
    });
    setResending(false);
    if (resendError) {
      setError(resendError.message);
      return;
    }
    const sent = Date.now();
    setLastSent(sent);
    setNow(sent);
    savePendingSignup(email, sent);
    setInfo("New code sent. Use the code in the latest email.");
  };

  return (
    <div>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-signal/15 text-ink">
        <MailCheck className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-heading text-[2rem] leading-tight font-semibold tracking-[-0.03em]">
        Check your inbox
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-muted">
        We sent a code to <span className="font-semibold break-all text-ink">{email}</span>.
        Type it here to finish.
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-ink">
          Code from the email
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          autoFocus
          value={code}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
            setCode(digits);
            // Pasted or autofilled codes go through without a tap
            if (digits.length === CODE_LENGTH) verify(digits);
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby="code-status"
          className="h-14 w-full rounded-2xl border border-line bg-surface px-4 text-center font-mono text-2xl tracking-[0.5em] text-ink outline-none transition placeholder:tracking-[0.5em] placeholder:text-muted/40 focus:border-signal focus:ring-4 focus:ring-signal/15 aria-[invalid]:border-error"
          placeholder={"0".repeat(CODE_LENGTH)}
        />
        <p id="code-status" role="status" aria-live="polite" className="mt-2 min-h-5 text-sm">
          {error ? <span className="text-error">{error}</span> : <span className="text-verified">{info}</span>}
        </p>

        <AuthSubmit loading={checking} icon={ArrowRight}>
          {checking ? "Checking..." : "Confirm and continue"}
        </AuthSubmit>
      </form>

      <div className="mt-6 space-y-3 text-[15px] text-muted">
        <p>
          No email after a minute? Check Spam and Promotions. It comes from{" "}
          <span className="break-all text-ink">no-reply@visibilitycampaigns.online</span>.
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={resend}
            disabled={wait > 0 || resending}
            className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4 disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          >
            {resending ? "Sending..." : "Send a new code"}
          </button>
          {wait > 0 && <span className="font-mono text-sm tabular-nums">in {wait}s</span>}
        </p>
        <p>
          Wrong email?{" "}
          <button
            type="button"
            onClick={onChangeEmail}
            className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
          >
            Change it
          </button>
        </p>
      </div>
    </div>
  );
}
