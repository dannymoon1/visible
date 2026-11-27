"use client";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail } from "lucide-react";
import { confirmRedirect, savePendingSignup } from "@/lib/pendingSignup";
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

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error?.code === "email_not_confirmed") {
      // Signed up but never typed the code: send a fresh one and reopen the
      // inbox step on the sign-up screen
      const cleanEmail = email.trim().toLowerCase();
      await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: { emailRedirectTo: confirmRedirect() },
      });
      savePendingSignup(cleanEmail);
      toast.message("Confirm your email first. We've sent you a new code.");
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

        <AuthSubmit loading={loading} icon={ArrowRight}>
          {loading ? "Signing in..." : "Sign in"}
        </AuthSubmit>
      </form>

      <AuthSwitch prompt="New here?" href="/register" label="Create an account" />
    </AuthLayout>
  );
}
