"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail } from "lucide-react";
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Middleware will now let us through to the dashboard
      router.push("/dashboard");
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
