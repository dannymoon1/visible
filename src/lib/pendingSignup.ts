// The email waiting for its emailed code, kept in this browser so the
// "check your inbox" step survives a reload. One entry for sign-up and one for
// a password reset (kind "recovery", /reset-password). Cheap Android phones often reload
// the tab after the person switches to their email app and back.
// Cleared once the code is accepted. Codes expire after 1 hour (Supabase Auth
// setting, docs/setup/auth-email.md), so an older entry is ignored.

export type CodeKind = "signup" | "recovery";
const keyFor = (kind: CodeKind) => `vc-pending-${kind}`;
const MAX_AGE_MS = 60 * 60 * 1000;

export type PendingSignup = { email: string; sentAt: number };

export function readPendingSignup(kind: CodeKind = "signup"): PendingSignup | null {
  try {
    const raw = localStorage.getItem(keyFor(kind));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PendingSignup>;
    if (typeof value.email !== "string" || typeof value.sentAt !== "number") return null;
    if (Date.now() - value.sentAt > MAX_AGE_MS) return null;
    return { email: value.email, sentAt: value.sentAt };
  } catch {
    return null;
  }
}

export function savePendingSignup(email: string, sentAt = Date.now(), kind: CodeKind = "signup") {
  try {
    localStorage.setItem(keyFor(kind), JSON.stringify({ email, sentAt }));
  } catch {
    // Storage blocked: the step still works until the page reloads
  }
}

export function clearPendingSignup(kind: CodeKind = "signup") {
  try {
    localStorage.removeItem(keyFor(kind));
  } catch {
    // Nothing to clear
  }
}

// Where an email link should land: /auth/confirm signs the person in there.
// Only used when Supabase still sends its default template (our template
// builds the link itself from the Site URL).
export function confirmRedirect(next = "/welcome") {
  return `${window.location.origin}/auth/confirm?next=${next}`;
}

// A code is 8 digits: the project's Supabase Auth → Email OTP length.
// Change both together.
export const CODE_LENGTH = 8;

// Seconds before "Send a new code" works again; matches the SMTP minimum interval
export const RESEND_WAIT_S = 60;
