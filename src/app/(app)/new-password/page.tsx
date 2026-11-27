"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { landingPath } from "@/lib/afterSignIn";
import { AuthHeading, AuthLayout, AuthPasswordField, AuthSubmit } from "@/components/auth/AuthParts";

// The last step of a password reset. The emailed code (/reset-password) or
// button (/auth/confirm) has already signed the person in, so this only sets
// the new password, then takes them where sign-in would.
// Without a session, the middleware sends people to /login.

export default function NewPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setSaving(true);
    setError("");
    const { data, error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError(
        updateError.code === "same_password"
          ? "That's your current password. Choose a new one."
          : updateError.message
      );
      return;
    }
    toast.success("Password changed. You're signed in.");
    router.replace(await landingPath(data.user));
    router.refresh();
  };

  return (
    <AuthLayout title="Locked out? It happens." lead="Get a code by email and choose a new password in a minute.">
      <AuthHeading title="Choose a new password" lead="You'll use it the next time you sign in." />

      <form onSubmit={save} className="space-y-5" noValidate>
        <AuthPasswordField
          id="password"
          label="New password"
          icon={Lock}
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? "password-error" : undefined}
        />
        {error && (
          <p id="password-error" role="alert" className="-mt-2 text-sm text-error">
            {error}
          </p>
        )}

        <AuthSubmit loading={saving} icon={ArrowRight}>
          {saving ? "Saving..." : "Save new password"}
        </AuthSubmit>
      </form>
    </AuthLayout>
  );
}
