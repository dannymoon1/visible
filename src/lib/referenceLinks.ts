// Names a reference link from its address, for the chips in the builder and
// on the creator's campaign page: "@nkem.styles on TikTok", "Instagram post".

import type { Platform } from "@/lib/campaignOptions";

export interface LinkInfo {
  platform: Platform | null;
  // Short label, e.g. "@nkem.styles" or "Instagram post"
  label: string;
}

export function describeLink(href: string): LinkInfo {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { platform: null, label: href };
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|web|vm|vt)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);
  const handle = parts.find((p) => p.startsWith("@"));

  if (host.endsWith("tiktok.com")) return { platform: "TikTok", label: handle ?? "TikTok video" };
  if (host.endsWith("instagram.com")) {
    if (!parts[0] || ["p", "reel", "reels", "tv", "stories"].includes(parts[0])) {
      return { platform: "Instagram", label: parts[0] === "reel" || parts[0] === "reels" ? "Instagram reel" : "Instagram post" };
    }
    return { platform: "Instagram", label: `@${parts[0]}` };
  }
  if (host.endsWith("facebook.com") || host === "fb.watch" || host === "fb.com") {
    const page = parts[0] && !["watch", "share", "reel", "story.php", "permalink.php", "photo", "videos"].includes(parts[0]) ? parts[0] : null;
    return { platform: "Facebook", label: page ?? "Facebook post" };
  }
  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    if (parts[0] === "shorts") return { platform: "YouTube Shorts", label: "YouTube Short" };
    return { platform: "YouTube", label: handle ?? "YouTube video" };
  }
  return { platform: null, label: host };
}
