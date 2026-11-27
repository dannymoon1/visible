import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Where the "Confirm my email" button in our auth emails lands
// (supabase/templates/confirm-signup.html, docs/setup/auth-email.md).
// It confirms the email, signs the person in on this device, and sends them on.
//
//   /auth/confirm?token_hash=…&type=email&next=/welcome   our sign-up template
//   /auth/confirm?token_hash=…&type=recovery&next=/new-password   password reset
//   /auth/confirm?code=…&next=/welcome                    Supabase's default
//                                                         template (same browser only)

const OTP_TYPES: EmailOtpType[] = ["email", "signup", "magiclink", "recovery", "invite", "email_change"];

// Only paths on this site, never "//evil.com" or a full URL
function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/welcome";
  return value;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  let ok = false;
  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) return NextResponse.redirect(new URL(next, url.origin));

  // Used, expired or opened in another browser: the screen the email came from
  // explains and offers the code box and a new email
  const back = type === "recovery" || next === "/new-password" ? "/reset-password?link=failed" : "/register?confirm=failed";
  return NextResponse.redirect(new URL(back, url.origin));
}
