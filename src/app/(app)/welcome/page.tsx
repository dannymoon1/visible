"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brandFonts } from "@/lib/fonts";
import { cn } from "@/lib/cn";
import { CITIES, NIGERIAN_STATES } from "@/lib/campaignPlaces";
import {
  ONBOARDING_PLATFORMS,
  cleanHandle,
  handleError,
  profileLink,
  usernameFromLink,
  type OnboardingPlatform,
} from "@/lib/creatorProfile";
import { getSocialAccounts } from "@/components/ConnectAccounts";
import { platformIcon } from "@/components/PlatformIcon";

// Creator onboarding, straight after the email is confirmed (tier 1 of the
// creator-launch build). Handle, city, and the platforms they post on with a
// link to each profile, so admins can verify them by hand
// (/admin/creators) and pick who joins verified campaigns. Saved by
// save_creator_onboarding() (migration 20261127000000_creator_onboarding.sql).

const OTHER = "other";
const cityKey = (city: string, state: string) => `${city}|${state}`;

const FIELD =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-signal focus:ring-4 focus:ring-signal/15 aria-[invalid=true]:border-error";

// Our own chevron, so every dropdown looks the same on Android and iPhone
const SELECT = "appearance-none bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10";
const CHEVRON = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235E6470' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
};

type Errors = Partial<Record<"handle" | "city" | "platforms" | OnboardingPlatform, string>>;

export default function Welcome() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [handle, setHandle] = useState("");
  const [place, setPlace] = useState(cityKey("Uyo", "Akwa Ibom"));
  const [otherCity, setOtherCity] = useState("");
  const [otherState, setOtherState] = useState("");
  const [links, setLinks] = useState<Partial<Record<OnboardingPlatform, string>>>({});
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  // Fill in whatever we already know (an older account, or a second visit)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const [{ data: profile }, { data: platforms }] = await Promise.all([
        supabase.from("profiles").select("username, city, state").eq("id", user.id).maybeSingle(),
        supabase.from("creator_platforms").select("platform, profile_url").eq("user_id", user.id),
      ]);
      if (cancelled) return;

      setFirstName(String(user.user_metadata?.first_name ?? ""));
      if (profile?.username) setHandle(profile.username);
      if (profile?.city && profile.state) {
        const known = CITIES.some((c) => c.city === profile.city && c.state === profile.state);
        if (known) setPlace(cityKey(profile.city, profile.state));
        else {
          setPlace(OTHER);
          setOtherCity(profile.city);
          setOtherState(profile.state);
        }
      }
      const saved: Partial<Record<OnboardingPlatform, string>> = {};
      if (platforms?.length) {
        platforms.forEach((p) => (saved[p.platform as OnboardingPlatform] = p.profile_url));
      } else {
        // Handles linked earlier from the dashboard
        Object.entries(getSocialAccounts(user)).forEach(([name, h]) => {
          if ((ONBOARDING_PLATFORMS as readonly string[]).includes(name)) {
            saved[name as OnboardingPlatform] = profileLink(name as OnboardingPlatform, h).url ?? h;
          }
        });
      }
      setLinks(saved);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePlatform = (name: OnboardingPlatform) => {
    setLinks((cur) => {
      const next = { ...cur };
      if (name in next) delete next[name];
      else next[name] = "";
      return next;
    });
    setErrors((e) => ({ ...e, platforms: undefined, [name]: undefined }));
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors: Errors = {};

    const cleanedHandle = cleanHandle(handle);
    const hErr = handleError(cleanedHandle);
    if (hErr) nextErrors.handle = hErr;

    let city = "";
    let state = "";
    if (place === OTHER) {
      city = otherCity.trim();
      state = otherState;
      if (!city || !state) nextErrors.city = "Type your town and choose its state";
    } else {
      const [c = "", st = ""] = place.split("|");
      city = c;
      state = st;
    }

    const chosen = ONBOARDING_PLATFORMS.filter((p) => p in links);
    if (!chosen.length) nextErrors.platforms = "Choose at least one platform you post on";
    const platforms: { platform: OnboardingPlatform; url: string }[] = [];
    chosen.forEach((p) => {
      const result = profileLink(p, links[p] ?? "");
      if (result.url === null) nextErrors[p] = result.error;
      else platforms.push({ platform: p, url: result.url });
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = document.querySelector<HTMLElement>("[aria-invalid=true], #platforms-error");
      first?.focus();
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("save_creator_onboarding", {
      p_handle: cleanedHandle,
      p_city: city,
      p_state: state,
      p_platforms: platforms,
    });
    if (error) {
      setSaving(false);
      if (/handle/i.test(error.message)) setErrors({ handle: error.message });
      else toast.error(error.message);
      return;
    }

    // Other screens (dashboard, Discover filters) still read the handle map
    // in the account's metadata
    await supabase.auth.updateUser({
      data: {
        account_type: "creator",
        username: cleanedHandle,
        social_accounts: Object.fromEntries(platforms.map((p) => [p.platform, usernameFromLink(p.url)])),
      },
    });

    router.replace("/discover");
    router.refresh();
  };

  // A business owner who signed up here skips straight to the builder
  const goBusiness = async () => {
    await supabase.auth.updateUser({ data: { account_type: "business" } });
    router.push("/order/new");
  };

  return (
    <div className={`${brandFonts} min-h-screen bg-page font-body text-ink`}>
      <header className="mx-auto flex max-w-xl items-center px-4 pt-6 sm:px-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG logo */}
        <img src="/logo/v2/visibility-campaigns-logo-light.svg" alt="Visibility Campaigns" className="h-9 w-auto" />
      </header>

      <main className="mx-auto max-w-xl px-4 pt-10 pb-16 sm:px-6">
        <p className="text-sm font-medium text-verified">
          <Check className="mr-1 inline h-4 w-4 align-[-3px]" strokeWidth={3} aria-hidden="true" />
          Email confirmed
        </p>
        <h1 className="mt-3 font-heading text-[2rem] leading-tight font-semibold tracking-[-0.03em]">
          {firstName ? `Welcome, ${firstName}. ` : "Welcome. "}Set up your creator profile
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Three quick things. Our team uses them to verify you, and businesses see your handle when you join their campaign.
        </p>

        {!ready ? (
          <div className="flex justify-center py-20" role="status" aria-label="Loading">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-8 space-y-8">
            {/* ---------- Handle ---------- */}
            <section>
              <label htmlFor="handle" className="block font-heading text-lg font-semibold">
                1. Your handle
              </label>
              <p className="mt-1 text-sm text-muted">Your name on Visibility. Use the one people know you by.</p>
              <div className="relative mt-3">
                <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[15px] text-muted">@</span>
                <input
                  id="handle"
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value.replace(/\s/g, ""));
                    setErrors((x) => ({ ...x, handle: undefined }));
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={31}
                  placeholder="ada.cooks"
                  aria-invalid={Boolean(errors.handle)}
                  aria-describedby={errors.handle ? "handle-error" : undefined}
                  className={cn(FIELD, "pl-9")}
                />
              </div>
              {errors.handle && <FieldError id="handle-error">{errors.handle}</FieldError>}
            </section>

            {/* ---------- City ---------- */}
            <section>
              <label htmlFor="city" className="block font-heading text-lg font-semibold">
                2. Your city
              </label>
              <p className="mt-1 text-sm text-muted">Businesses look for creators near their customers.</p>
              <select
                id="city"
                value={place}
                onChange={(e) => {
                  setPlace(e.target.value);
                  setErrors((x) => ({ ...x, city: undefined }));
                }}
                className={cn(FIELD, SELECT, "mt-3")}
                style={CHEVRON}
              >
                <optgroup label="Akwa Ibom">
                  {CITIES.filter((c) => c.state === "Akwa Ibom").map((c) => (
                    <option key={c.city} value={cityKey(c.city, c.state)}>
                      {c.city}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Elsewhere in Nigeria">
                  {CITIES.filter((c) => c.state !== "Akwa Ibom").map((c) => (
                    <option key={c.city} value={cityKey(c.city, c.state)}>
                      {c.city}, {c.state}
                    </option>
                  ))}
                  <option value={OTHER}>Somewhere else</option>
                </optgroup>
              </select>
              {place === OTHER && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input
                    aria-label="Your town"
                    value={otherCity}
                    onChange={(e) => setOtherCity(e.target.value)}
                    maxLength={60}
                    placeholder="Your town"
                    aria-invalid={Boolean(errors.city) && !otherCity.trim()}
                    className={FIELD}
                  />
                  <select
                    aria-label="State"
                    value={otherState}
                    onChange={(e) => setOtherState(e.target.value)}
                    aria-invalid={Boolean(errors.city) && !otherState}
                    className={cn(FIELD, SELECT)}
                    style={CHEVRON}
                  >
                    <option value="">State</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {errors.city && <FieldError>{errors.city}</FieldError>}
            </section>

            {/* ---------- Platforms ---------- */}
            <section>
              <h2 className="font-heading text-lg font-semibold">3. Where you post</h2>
              <p className="mt-1 text-sm text-muted">
                Choose each platform you post on and add your profile link, or just your username. We check each one before you can join verified campaigns.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2.5" role="group" aria-label="Platforms you post on">
                {ONBOARDING_PLATFORMS.map((name) => {
                  const Glyph = platformIcon(name);
                  const on = name in links;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => togglePlatform(name)}
                      className={cn(
                        "flex h-12 items-center gap-2.5 rounded-2xl border px-3.5 text-left text-[15px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
                        on ? "border-ink bg-surface" : "border-line bg-surface/60 text-muted hover:border-muted/50"
                      )}
                    >
                      <Glyph className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="flex-1">{name}</span>
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border",
                          on ? "border-ink bg-ink text-page" : "border-line"
                        )}
                        aria-hidden="true"
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.platforms && (
                <FieldError id="platforms-error" focusable>
                  {errors.platforms}
                </FieldError>
              )}

              <div className="mt-4 space-y-4">
                {ONBOARDING_PLATFORMS.filter((p) => p in links).map((name) => (
                  <div key={name}>
                    <label htmlFor={`link-${name}`} className="mb-1.5 block text-sm font-medium">
                      {name} profile link or username
                    </label>
                    <input
                      id={`link-${name}`}
                      value={links[name] ?? ""}
                      onChange={(e) => {
                        setLinks((cur) => ({ ...cur, [name]: e.target.value }));
                        setErrors((x) => ({ ...x, [name]: undefined }));
                      }}
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={name === "TikTok" ? "tiktok.com/@yourname" : name === "YouTube" ? "youtube.com/@yourname" : `${name.toLowerCase()}.com/yourname`}
                      aria-invalid={Boolean(errors[name])}
                      aria-describedby={errors[name] ? `link-${name}-error` : undefined}
                      className={FIELD}
                    />
                    {errors[name] && <FieldError id={`link-${name}-error`}>{errors[name]}</FieldError>}
                  </div>
                ))}
              </div>
            </section>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-signal font-heading text-base font-semibold text-on-signal transition active:scale-[0.97] disabled:opacity-70"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save and see campaigns"}
              {!saving && <ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
            </button>

            <p className="text-center text-[15px] text-muted">
              Here to promote a business?{" "}
              <button
                type="button"
                onClick={goBusiness}
                className="font-semibold text-ink underline decoration-signal decoration-2 underline-offset-4"
              >
                Start a campaign instead
              </button>
            </p>
          </form>
        )}

        <p className="mt-10 text-center text-sm text-muted">
          Signed in with the wrong account?{" "}
          <Link href="/login" onClick={() => supabase.auth.signOut()} className="underline underline-offset-4">
            Sign out
          </Link>
        </p>
      </main>
    </div>
  );
}

function FieldError({ id, focusable, children }: { id?: string; focusable?: boolean; children: ReactNode }) {
  return (
    <p id={id} tabIndex={focusable ? -1 : undefined} role="alert" className="mt-2 text-sm text-error outline-none">
      {children}
    </p>
  );
}
