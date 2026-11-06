"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { X, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PLATFORM_ICONS, platformIcon } from "@/components/PlatformIcon";
import { Button, Field, Input, cn } from "@/components/ui";

// Platforms a creator can link, in the order the modal lists them
export const SOCIAL_PLATFORMS = ["TikTok", "Instagram", "YouTube", "X", "Facebook"];

// Linked handles live in the account's metadata: { TikTok: "ada.cooks", ... }
export function getSocialAccounts(user) {
  const accounts = user?.user_metadata?.social_accounts;
  return accounts && typeof accounts === "object" ? accounts : {};
}

// "@ada", "https://www.tiktok.com/@ada/" → "ada"
function cleanHandle(value) {
  let handle = value.trim();
  try {
    if (/^https?:\/\//i.test(handle)) {
      const segments = new URL(handle).pathname.split("/").filter(Boolean);
      handle = segments[segments.length - 1] || "";
    }
  } catch {
    // Not a URL, keep what was typed
  }
  return handle.replace(/^@/, "").trim();
}

// =========================================================
// "Choose a platform" modal → handle form for the chosen one
// =========================================================
export default function ConnectAccountsModal({ user, onClose, onSaved }) {
  const accounts = getSocialAccounts(user);
  const [platform, setPlatform] = useState(null);
  const [handle, setHandle] = useState("");
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef(null);

  // Latest values for the Escape handler, without re-running the setup effect
  const closeRef = useRef(onClose);
  const savingRef = useRef(saving);
  useEffect(() => {
    closeRef.current = onClose;
    savingRef.current = saving;
  });

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

  const choose = (name) => {
    setPlatform(name);
    setHandle(accounts[name] ? `@${accounts[name]}` : "");
  };

  const save = async (next) => {
    setSaving(true);
    const { data, error } = await supabase.auth.updateUser({
      data: { social_accounts: next },
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return false;
    }
    onSaved?.(data.user);
    return true;
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    const value = cleanHandle(handle);

    if (!/^[A-Za-z0-9._-]{2,50}$/.test(value)) {
      toast.error("Enter your username or profile link.");
      return;
    }
    if (await save({ ...accounts, [platform]: value })) {
      toast.success(`${platform} connected`);
      setPlatform(null);
    }
  };

  const handleDisconnect = async () => {
    const next = { ...accounts };
    delete next[platform];
    if (await save(next)) {
      toast.success(`${platform} disconnected`);
      setPlatform(null);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <div
        className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in"
        onClick={() => !saving && onClose()}
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-modal-title"
        className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-lifted outline-none animate-fade-in sm:rounded-2xl"
      >
        {/* Header */}
        <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-ink-100 px-14">
          {platform && (
            <button
              type="button"
              onClick={() => setPlatform(null)}
              disabled={saving}
              className="absolute left-4 rounded-full p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
              aria-label="Back to platforms"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <h2 id="connect-modal-title" className="text-[15px] font-semibold text-ink-900">
            {platform ? `Connect ${platform}` : "Choose a platform"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="absolute right-4 rounded-full bg-ink-100 p-1.5 text-ink-500 transition hover:bg-ink-200 hover:text-ink-900"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>

        {!platform ? (
          <ul className="space-y-2.5 overflow-y-auto p-5">
            {SOCIAL_PLATFORMS.map((name) => {
              const PlatformGlyph = platformIcon(name);
              const linked = accounts[name];

              return (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => choose(name)}
                    className="flex w-full items-center gap-3.5 rounded-2xl border border-ink-200/80 bg-white px-4 py-3.5 text-left transition hover:border-ink-300 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ink-300/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200/80 text-ink-900">
                      <PlatformGlyph className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink-900">{name}</span>
                      {linked && (
                        <span className="flex items-center gap-1 truncate text-xs text-verified">
                          <Check className="h-3 w-3" strokeWidth={3} /> @{linked}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 text-ink-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <form onSubmit={handleConnect} className="space-y-5 p-5">
            <div className="flex items-center gap-3.5 rounded-2xl bg-ink-50 px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink-200/80 bg-white text-ink-900">
                <PlatformMark name={platform} />
              </span>
              <p className="text-sm text-ink-600">
                Add the {platform} account you&apos;ll post from. We check its followers and views
                before you can join verified campaigns.
              </p>
            </div>

            <Field label={`${platform} username or profile link`} htmlFor="social-handle">
              <Input
                id="social-handle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourname"
                autoComplete="off"
                autoFocus
              />
            </Field>

            <div className={cn("flex gap-3", accounts[platform] ? "justify-between" : "justify-end")}>
              {accounts[platform] && (
                <Button type="button" variant="danger" onClick={handleDisconnect} disabled={saving}>
                  Disconnect
                </Button>
              )}
              <Button type="submit" loading={saving}>
                {accounts[platform] ? "Save" : "Connect"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}

function PlatformMark({ name }) {
  const Icon = PLATFORM_ICONS[name];
  return Icon ? <Icon className="h-4 w-4" strokeWidth={2.25} /> : null;
}
