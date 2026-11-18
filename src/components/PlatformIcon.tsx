import {
  Facebook,
  Instagram,
  Twitter,
  Music2,
  Youtube,
  Linkedin,
  MessageCircle,
  Ghost,
  AtSign,
  Globe,
  type LucideIcon,
} from "lucide-react";

// One icon per platform in PLATFORMS (src/lib/campaignOptions.ts), plus the
// platforms older campaigns may still list, so their history keeps its icons
export const PLATFORM_ICONS: Record<string, LucideIcon> = {
  Facebook,
  Instagram,
  TikTok: Music2,
  "YouTube Shorts": Youtube,
  YouTube: Youtube,
  // Legacy
  X: Twitter,
  LinkedIn: Linkedin,
  WhatsApp: MessageCircle,
  Snapchat: Ghost,
  Threads: AtSign,
};

export function platformIcon(name: string): LucideIcon {
  return PLATFORM_ICONS[name] ?? Globe;
}

// Campaign platforms: the new array column, falling back to the
// older comma-separated `platform` text for legacy tasks
export function taskPlatforms(
  task: { platforms?: string[] | null; platform?: string | null } | null | undefined
): string[] {
  if (Array.isArray(task?.platforms) && task.platforms.length) return task.platforms;
  return String(task?.platform || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}
