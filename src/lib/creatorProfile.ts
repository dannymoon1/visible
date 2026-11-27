// Creator onboarding rules: the handle and each platform's profile link.
// The database checks the same rules in save_creator_onboarding()
// (supabase/migrations/20261127000000_creator_onboarding.sql); change both together.
// Tests: pnpm test:creator

export const ONBOARDING_PLATFORMS = ["TikTok", "Instagram", "Facebook", "YouTube"] as const;
export type OnboardingPlatform = (typeof ONBOARDING_PLATFORMS)[number];

// "@Ada.Cooks " → "ada.cooks"
export function cleanHandle(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function handleError(handle: string): string | null {
  if (!handle) return "Choose a handle";
  if (handle.length < 3) return "Use at least 3 characters";
  if (handle.length > 30) return "Use 30 characters or fewer";
  if (!/^[a-z0-9._]+$/.test(handle)) return "Use only letters, numbers, dots and underscores";
  return null;
}

const HOSTS: Record<OnboardingPlatform, RegExp> = {
  Facebook: /^(www\.|m\.|web\.)?(facebook|fb)\.com$/i,
  Instagram: /^(www\.)?instagram\.com$/i,
  TikTok: /^(www\.|m\.|vm\.|vt\.)?tiktok\.com$/i,
  YouTube: /^((www\.|m\.)?youtube\.com|youtu\.be)$/i,
};

// A bare username becomes the profile address
const FROM_HANDLE: Record<OnboardingPlatform, (h: string) => string> = {
  Facebook: (h) => `https://www.facebook.com/${h}`,
  Instagram: (h) => `https://www.instagram.com/${h}`,
  TikTok: (h) => `https://www.tiktok.com/@${h}`,
  YouTube: (h) => `https://www.youtube.com/@${h}`,
};

export type ProfileLink = { url: string; error: null } | { url: null; error: string };

// Accepts a profile link ("tiktok.com/@ada", "https://www.instagram.com/ada/")
// or just the username ("@ada"), and returns the https address to save.
export function profileLink(platform: OnboardingPlatform, input: string): ProfileLink {
  const value = input.trim();
  if (!value) return { url: null, error: `Add your ${platform} profile link or username` };

  const looksLikeUrl = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\//i.test(value) || /^https?:\/\//i.test(value);
  if (!looksLikeUrl) {
    const handle = value.replace(/^@+/, "");
    if (!/^[A-Za-z0-9._-]{2,50}$/.test(handle)) {
      return { url: null, error: `Paste your ${platform} profile link, or type your username` };
    }
    return { url: FROM_HANDLE[platform](handle), error: null };
  }

  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return { url: null, error: `Check your ${platform} profile link` };
  }
  if (!HOSTS[platform].test(parsed.hostname)) {
    return { url: null, error: `This isn't a link to ${platform}` };
  }
  const path = parsed.pathname.replace(/\/+$/, "");
  if (!path || path === "/") {
    return { url: null, error: `Use the link to your own ${platform} profile` };
  }
  // https, no tracking query (?igsh=…, ?_t=…), except Facebook's profile.php?id=
  const keepQuery = platform === "Facebook" && path === "/profile.php" ? parsed.search : "";
  const url = `https://${parsed.hostname.toLowerCase()}${path}${keepQuery}`;
  if (url.length > 300) return { url: null, error: "That link is too long" };
  return { url, error: null };
}

// The username in a saved profile link, for the handle map other screens use
// ("https://www.tiktok.com/@ada" → "ada")
export function usernameFromLink(url: string): string {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get("id");
    if (id) return id;
    const segments = parsed.pathname.split("/").filter(Boolean);
    return (segments[segments.length - 1] ?? "").replace(/^@/, "");
  } catch {
    return "";
  }
}
