"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Mail,
  AtSign,
  Phone,
  CalendarDays,
  Check,
  X,
  ShieldCheck,
  Landmark,
  CreditCard,
  User,
  Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, Field, Input, Badge, cn } from "@/components/ui";

// Reads the registration + profile details (stored as Supabase user metadata)
export function getProfileDetails(user, profile) {
  const meta = user?.user_metadata || {};
  const username = meta.username || profile?.username || "";
  const firstName = meta.first_name || "";
  const lastName = meta.last_name || "";

  return {
    firstName,
    lastName,
    username,
    phone: meta.phone || "",
    bankName: meta.bank_name || "",
    accountNumber: meta.account_number || "",
    accountName: meta.account_name || "",
    email: user?.email || "",
    // Users who registered before names were collected fall back to username/email
    displayFirstName: firstName || username || user?.email?.split("@")[0] || "there",
    fullName: [firstName, lastName].filter(Boolean).join(" ") || username || user?.email || "",
  };
}

// The circular button shows ONE letter: the first name's initial
function initial(details) {
  return (details.firstName || details.username || details.email || "?")[0].toUpperCase();
}

// =========================================================
// Circular avatar button + hover tooltip + profile modal
// =========================================================
export default function ProfileButton({ user, profile, onSaved }) {
  const [open, setOpen] = useState(false);
  const details = getProfileDetails(user, profile);
  const missingBank = !details.bankName || !details.accountNumber || !details.accountName;

  return (
    <>
      <div className="group relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`View and edit profile for ${details.fullName}`}
          aria-haspopup="dialog"
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full",
            "bg-gradient-to-br from-brand-400 to-brand-700 font-display text-xl font-semibold text-white",
            "shadow-brand ring-4 ring-white transition-all duration-200",
            "hover:scale-105 hover:shadow-lifted focus-visible:outline-none focus-visible:ring-brand-300"
          )}
        >
          {initial(details)}

          {/* Small dot nudging the user to add bank details */}
          {missingBank && (
            <span className="absolute right-0 top-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-gold-500" />
          )}
        </button>

        {/* Hover / focus tooltip */}
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute left-0 top-full z-30 mt-3 w-max max-w-[240px] rounded-xl bg-ink-900 px-3.5 py-2.5 text-left shadow-lifted",
            "invisible translate-y-1 opacity-0 transition-all duration-150",
            "group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
            "group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
          )}
        >
          <span className="absolute -top-1 left-5 h-2.5 w-2.5 rotate-45 bg-ink-900" />
          <p className="text-sm font-semibold text-white">{details.fullName}</p>
          <p className="mt-0.5 text-xs text-ink-300">
            {missingBank ? "Add your bank details to get paid" : "View & edit your profile"}
          </p>
        </div>
      </div>

      {open && (
        <ProfileModal
          user={user}
          profile={profile}
          details={details}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

// =========================================================
// Modal
// =========================================================
function ProfileModal({ user, profile, details, onClose, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(details);
  const dialogRef = useRef(null);

  // Latest values for the Escape handler, without re-running the setup effect
  const closeRef = useRef(onClose);
  const savingRef = useRef(saving);
  useEffect(() => {
    closeRef.current = onClose;
    savingRef.current = saving;
  });

  // Escape closes, background doesn't scroll, focus moves into the dialog (once, on open)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !savingRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, []);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const username = form.username.trim().replace(/^@/, "");
    const accountNumber = form.accountNumber.replace(/\s/g, "");

    if (!firstName) {
      toast.error("First name is required.");
      return;
    }
    if (accountNumber && !/^\d{10}$/.test(accountNumber)) {
      toast.error("Account number must be 10 digits.");
      return;
    }

    setSaving(true);

    // 1. Save everything to the account's metadata (where registration stored it)
    const { data, error } = await supabase.auth.updateUser({
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
        username,
        phone: form.phone.trim(),
        bank_name: form.bankName.trim(),
        account_number: accountNumber,
        account_name: form.accountName.trim(),
      },
    });

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // 2. Keep the profiles table's username in sync (used by payouts/emails)
    if (username !== details.username) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile username update failed:", profileError);
        toast.warning("Profile saved, but your username couldn't be updated.", {
          description: profileError.message,
        });
      }
    }

    setSaving(false);
    setEditing(false);
    toast.success("Profile updated");
    onSaved?.(data.user, username);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-NG", { month: "long", year: "numeric" })
    : "—";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm animate-fade-in"
        onClick={() => !saving && onClose()}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-lifted outline-none animate-fade-in sm:rounded-3xl"
      >
        {/* Header */}
        <div className="relative shrink-0 bg-ink-950 px-6 pb-6 pt-6 text-white">
          <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgb(106_47_245/0.45),transparent_70%)]" />

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="absolute right-4 top-4 rounded-lg p-2 text-ink-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-display text-2xl font-semibold ring-4 ring-white/10">
              {initial(details)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="profile-modal-title" className="truncate font-display text-xl font-semibold">
                  {details.fullName}
                </h2>
                {profile?.is_admin && (
                  <Badge tone="gold">
                    <ShieldCheck className="h-3 w-3" /> Admin
                  </Badge>
                )}
              </div>
              {details.username && (
                <p className="text-sm font-medium text-brand-200">@{details.username}</p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-400">
                <CalendarDays className="h-3 w-3" /> Member since {memberSince}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        {editing ? (
          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
              <Section title="Personal details">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First name" htmlFor="pf-first">
                    <Input id="pf-first" value={form.firstName} onChange={update("firstName")} required />
                  </Field>
                  <Field label="Last name" htmlFor="pf-last">
                    <Input id="pf-last" value={form.lastName} onChange={update("lastName")} />
                  </Field>
                </div>
                <Field label="Username" htmlFor="pf-username">
                  <Input id="pf-username" icon={AtSign} value={form.username} onChange={update("username")} />
                </Field>
                <Field label="Phone number" htmlFor="pf-phone">
                  <Input
                    id="pf-phone"
                    type="tel"
                    icon={Phone}
                    autoComplete="tel"
                    placeholder="0801 234 5678"
                    value={form.phone}
                    onChange={update("phone")}
                  />
                </Field>
                <Field label="Email address" hint="Contact support to change your email.">
                  <Input icon={Mail} value={form.email} disabled />
                </Field>
              </Section>

              <Section
                title="Bank details"
                description="Used to pre-fill your withdrawal requests."
              >
                <Field label="Bank name" htmlFor="pf-bank">
                  <Input
                    id="pf-bank"
                    icon={Landmark}
                    placeholder="e.g. GTBank"
                    value={form.bankName}
                    onChange={update("bankName")}
                  />
                </Field>
                <Field label="Account number" htmlFor="pf-acct">
                  <Input
                    id="pf-acct"
                    icon={CreditCard}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit NUBAN"
                    value={form.accountNumber}
                    onChange={update("accountNumber")}
                  />
                </Field>
                <Field label="Account name" htmlFor="pf-acct-name">
                  <Input
                    id="pf-acct-name"
                    icon={User}
                    placeholder="Name on account"
                    value={form.accountName}
                    onChange={update("accountName")}
                  />
                </Field>
              </Section>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setForm(details);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="brand" icon={Check} loading={saving} className="flex-1">
                Save changes
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
              <Section title="Personal details">
                <InfoGrid
                  rows={[
                    ["First name", details.firstName],
                    ["Last name", details.lastName],
                    ["Username", details.username && `@${details.username}`],
                    ["Phone", details.phone],
                    ["Email", details.email],
                  ]}
                />
              </Section>

              <Section title="Bank details">
                {details.bankName || details.accountNumber ? (
                  <InfoGrid
                    rows={[
                      ["Bank", details.bankName],
                      ["Account number", details.accountNumber && maskAccount(details.accountNumber)],
                      ["Account name", details.accountName],
                    ]}
                  />
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-gold-300 bg-gold-100/60 p-4">
                    <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" />
                    <p className="text-sm text-ink-700">
                      Add your bank details so withdrawals are quicker to request.
                    </p>
                  </div>
                )}
              </Section>
            </div>

            <div className="flex shrink-0 gap-3 border-t border-ink-100 bg-ink-50/60 px-6 py-4">
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button
                type="button"
                variant="brand"
                icon={Pencil}
                className="flex-1"
                onClick={() => {
                  setForm(details);
                  setEditing(true);
                }}
              >
                Edit profile
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

function Section({ title, description, children }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">{title}</h3>
        {description && <p className="mt-1 text-xs text-ink-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function InfoGrid({ rows }) {
  return (
    <dl className="divide-y divide-ink-100 rounded-xl border border-ink-200/70">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-ink-500">{label}</dt>
          <dd className={cn("min-w-0 truncate text-right font-medium", value ? "text-ink-900" : "text-ink-300")}>
            {value || "Not set"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// "0123456789" -> "•••••• 6789"
function maskAccount(number) {
  return `•••••• ${String(number).slice(-4)}`;
}
