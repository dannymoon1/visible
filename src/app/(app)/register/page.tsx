"use client";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, AtSign, Lock, Mail } from "lucide-react";
import {
  AuthField,
  AuthHeading,
  AuthLayout,
  AuthPasswordField,
  AuthSubmit,
  AuthSwitch,
} from "@/components/auth/AuthParts";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const router = useRouter();

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // If these are empty, Supabase treats it as an anonymous attempt
    if (!email || !password || !firstName.trim()) {
      toast.error("Please fill in your first name, email and password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        // Saved as the user's metadata; the dashboard reads and edits these
        data: {
          username: username,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    });
    if (error) {
      console.error("Supabase Error:", error);
      toast.error(error.message);
    } else {
      toast.success("Account created! You can now sign in.");
      router.push("/login");
    }
    setLoading(false);
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
      <AuthHeading
        title="Create your account"
        lead="It takes about a minute."
      />

      <form onSubmit={handleRegister} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <AuthField
            id="firstName"
            label="First name"
            type="text"
            autoComplete="given-name"
            required
            placeholder="Ada"
            onChange={(e) => setFirstName(e.target.value)}
          />
          <AuthField
            id="lastName"
            label="Last name"
            type="text"
            autoComplete="family-name"
            placeholder="Okon"
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
          onChange={(e) => setEmail(e.target.value)}
        />

        <AuthField
          id="username"
          label="Username"
          type="text"
          icon={AtSign}
          autoComplete="username"
          required
          placeholder="Choose a unique username"
          onChange={(e) => setUsername(e.target.value)}
        />

        <AuthPasswordField
          id="password"
          label="Password"
          icon={Lock}
          autoComplete="new-password"
          required
          placeholder="Create a password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <AuthSubmit loading={loading} icon={ArrowRight}>
          {loading ? "Creating account..." : "Create account"}
        </AuthSubmit>
      </form>

      <p className="mt-6 text-center text-[13px] leading-relaxed text-muted">
        By creating an account you agree to post honestly and follow each
        campaign&apos;s brief.
      </p>

      <AuthSwitch prompt="Already have an account?" href="/login" label="Sign in" />
    </AuthLayout>
  );
}
