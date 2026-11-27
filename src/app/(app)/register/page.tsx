"use client";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { REF_COOKIE, VISITOR_COOKIE, readCookie } from "@/lib/trackingLinks";
import {
  clearPendingSignup,
  confirmRedirect,
  readPendingSignup,
  savePendingSignup,
  type PendingSignup,
} from "@/lib/pendingSignup";
import {
  AuthField,
  AuthHeading,
  AuthLayout,
  AuthPasswordField,
  AuthSubmit,
  AuthSwitch,
} from "@/components/auth/AuthParts";
import VerifyEmail from "@/components/auth/VerifyEmail";
import { Captcha, useCaptcha } from "@/components/auth/Turnstile";

// Sign-up, in two steps on one screen:
//   1. name, email, password → Supabase sends an 8-digit code
//   2. "check your inbox": typing the code signs them in and opens /welcome
// The handle, city and platforms are asked in onboarding (/welcome), not here.

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [notice, setNotice] = useState<string | undefined>();
  const router = useRouter();
  const captcha = useCaptcha();

  // Back on this screen with a code still waiting (reload, or an email link
  // that had expired): reopen the inbox step
  useEffect(() => {
    const failed = new URLSearchParams(window.location.search).get("confirm") === "failed";
    const waiting = readPendingSignup();
    /* eslint-disable react-hooks/set-state-in-effect -- reads browser-only state once on mount */
    if (waiting) setPending(waiting);
    if (failed) {
      setNotice(
        waiting
          ? "That link has expired or was already used. Type the code from the latest email, or send a new one."
          : "That link has expired or was already used. Sign up again or sign in."
      );
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // If these are empty, Supabase treats it as an anonymous attempt
    if (!email || !password || !firstName.trim()) {
      toast.error("Please fill in your first name, email and password");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        emailRedirectTo: confirmRedirect(),
        // Cloudflare Turnstile, checked by Supabase when captcha is on
        captchaToken: captcha.token,
        // Saved as the user's metadata; the dashboard reads and edits these
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          // The tracking link they came through, if any (src/lib/trackingLinks.ts);
          // the database credits it to their profile
          signup_ref: readCookie(REF_COOKIE),
          signup_visitor: readCookie(VISITOR_COOKIE),
        },
      },
    });
    setLoading(false);
    // A token works once
    captcha.reset();

    if (error) {
      console.error("Supabase Error:", error);
      toast.error(error.message);
      return;
    }

    // Email confirmation switched off in Supabase: already signed in
    if (data.session) {
      clearPendingSignup();
      router.replace("/welcome");
      router.refresh();
      return;
    }

    // Supabase answers an already-confirmed email with a user that has no
    // identities, and sends nothing
    if (data.user && data.user.identities?.length === 0) {
      toast.error("There's already an account with this email. Sign in instead.");
      return;
    }

    const sentAt = Date.now();
    savePendingSignup(cleanEmail, sentAt);
    setNotice(undefined);
    setPending({ email: cleanEmail, sentAt });
  };

  const changeEmail = () => {
    clearPendingSignup();
    setNotice(undefined);
    setPending(null);
  };

  return (
    <AuthLayout
      title="Get paid for the trust you've built."
      lead="Post about local businesses in your own words. You're paid for the real views you bring."
      points={[
        "Join campaigns from businesses near you",
        "Paid for real, verified views",
        "Every post and payout in one place",
      ]}
    >
      {pending ? (
        <VerifyEmail
          key={pending.email}
          email={pending.email}
          sentAt={pending.sentAt}
          notice={notice}
          onChangeEmail={changeEmail}
        />
      ) : (
        <>
          <AuthHeading title="Create your account" lead="It takes about a minute." />

          {notice && (
            <p role="alert" className="-mt-4 mb-6 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">
              {notice}
            </p>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <AuthField
                id="firstName"
                label="First name"
                type="text"
                autoComplete="given-name"
                required
                placeholder="Ada"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <AuthField
                id="lastName"
                label="Last name"
                type="text"
                autoComplete="family-name"
                placeholder="Okon"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

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

            <AuthPasswordField
              id="password"
              label="Password"
              icon={Lock}
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Captcha {...captcha.props} />

            <AuthSubmit loading={loading || captcha.pending} icon={ArrowRight}>
              {loading ? "Creating account..." : captcha.pending ? "One moment..." : "Create account"}
            </AuthSubmit>
          </form>

          <p className="mt-6 text-center text-[13px] leading-relaxed text-muted">
            By creating an account you agree to our{" "}
            <Link href="/terms/creators" target="_blank" className="font-medium text-ink underline underline-offset-2">
              Creator terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-ink underline underline-offset-2">
              Privacy policy
            </Link>
            .
          </p>

          <AuthSwitch prompt="Already have an account?" href="/login" label="Sign in" />
        </>
      )}
    </AuthLayout>
  );
}
