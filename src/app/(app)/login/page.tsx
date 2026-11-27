"use client";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { RESEND_WAIT_S, savePendingSignup } from "@/lib/pendingSignup";
import { Captcha, useCaptcha } from "@/components/auth/Turnstile";
import {
  AuthField,
  AuthHeading,
  AuthLayout,
  AuthPasswordField,
  AuthSubmit,
  AuthSwitch,
} from "@/components/auth/AuthParts";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const captcha = useCaptcha();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha.token },
    });
    // A token works once
    captcha.reset();

    if (error?.code === "email_not_confirmed") {
      // Signed up but never typed the code: reopen the inbox step on the
      // sign-up screen, with "Send a new code" ready to tap (it needs its own
      // captcha token, so it isn't sent from here)
      savePendingSignup(email.trim().toLowerCase(), Date.now() - RESEND_WAIT_S * 1000);
      toast.message("Confirm your email first. Use the code we sent you, or send a new one.");
      router.push("/register");
      return;
    } else if (error) {
      toast.error(error.message);
    } else {
      // Creators who never finished onboarding go back to it; business
      // owners chose "Start a campaign instead" there and aren't asked again
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarded_at, is_admin")
        .eq("id", data.user.id)
        .maybeSingle();
      const isBusiness = data.user.user_metadata?.account_type === "business";
      router.push(!profile?.onboarded_at && !isBusiness && !profile?.is_admin ? "/welcome" : "/dashboard");
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title="Welcome back."
      lead="Your campaigns, posts and earnings are right where you left them."
    >
      <AuthHeading title="Sign in" lead="Use the email you signed up with." />

      <form onSubmit={handleLogin} className="space-y-5">
        <AuthField
          id="email"
          label="Email address"
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="name@example.com"
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthPasswordField
          id="password"
          label="Password"
          icon={Lock}
          autoComplete="current-password"
          placeholder="Your password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Captcha {...captcha.props} />

        <AuthSubmit loading={loading || captcha.pending} icon={ArrowRight}>
          {loading ? "Signing in..." : captcha.pending ? "One moment..." : "Sign in"}
        </AuthSubmit>
      </form>

      <AuthSwitch prompt="New here?" href="/register" label="Create an account" />
    </AuthLayout>
  );
}
