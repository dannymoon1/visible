"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  clearPendingSignup,
  confirmRedirect,
  readPendingSignup,
  savePendingSignup,
  type PendingSignup,
} from "@/lib/pendingSignup";
import { AuthField, AuthHeading, AuthLayout, AuthSubmit, AuthSwitch } from "@/components/auth/AuthParts";
import VerifyEmail from "@/components/auth/VerifyEmail";
import { Captcha, useCaptcha } from "@/components/auth/Turnstile";

// "Forgot your password?", in the same shape as sign-up:
//   1. their email → Supabase emails a code (and a button for another device)
//   2. the code signs them in → /new-password, where they choose a new one
// We say the same thing whether or not the email has an account, so this page
// can't be used to find out who is signed up.

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const captcha = useCaptcha();

  // Back here after a reload, or from an email button that had expired
  useEffect(() => {
    const failed = new URLSearchParams(window.location.search).get("link") === "failed";
    const waiting = readPendingSignup("recovery");
    /* eslint-disable react-hooks/set-state-in-effect -- reads browser-only state once on mount */
    if (waiting) setPending(waiting);
    if (failed) {
      setNotice(
        waiting
          ? "That link has expired or was already used. Type the code from the latest email, or send a new one."
          : "That link has expired or was already used. Enter your email to get a new one."
      );
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: confirmRedirect("/new-password"),
      captchaToken: captcha.token,
    });
    setLoading(false);
    captcha.reset();
    if (error) {
      toast.error(error.message);
      return;
    }
    const sentAt = Date.now();
    savePendingSignup(cleanEmail, sentAt, "recovery");
    setNotice(undefined);
    setPending({ email: cleanEmail, sentAt });
  };

  const changeEmail = () => {
    clearPendingSignup("recovery");
    setNotice(undefined);
    setPending(null);
  };

  return (
    <AuthLayout title="Locked out? It happens." lead="Get a code by email and choose a new password in a minute.">
      {pending ? (
        <VerifyEmail
          key={pending.email}
          purpose="recovery"
          email={pending.email}
          sentAt={pending.sentAt}
          notice={notice}
          onChangeEmail={changeEmail}
        />
      ) : (
        <>
          <AuthHeading
            title="Reset your password"
            lead="Enter the email you signed up with. If it has an account, we'll send you a code."
          />

          {notice && (
            <p role="alert" className="-mt-4 mb-6 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">
              {notice}
            </p>
          )}

          <form onSubmit={send} className="space-y-5">
            <AuthField
              id="email"
              label="Email address"
              type="email"
              icon={Mail}
              autoComplete="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Captcha {...captcha.props} />

            <AuthSubmit loading={loading || captcha.pending} icon={ArrowRight}>
              {loading ? "Sending..." : captcha.pending ? "One moment..." : "Send me a code"}
            </AuthSubmit>
          </form>

          <AuthSwitch prompt="Remembered it?" href="/login" label="Sign in" />
        </>
      )}
    </AuthLayout>
  );
}
