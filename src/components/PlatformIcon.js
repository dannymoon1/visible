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
} from "lucide-react";

// One icon per platform in PLATFORMS (src/lib/campaignOptions.js)
export const PLATFORM_ICONS = {
  Facebook,
  Instagram,
  X: Twitter,
  TikTok: Music2,
  YouTube: Youtube,
  LinkedIn: Linkedin,
  WhatsApp: MessageCircle,
  Snapchat: Ghost,
  Threads: AtSign,
};

export function platformIcon(name) {
  return PLATFORM_ICONS[name] || Globe;
}

// Campaign platforms: the new array column, falling back to the
// older comma-separated `platform` text for legacy tasks
export function taskPlatforms(task) {
  if (Array.isArray(task?.platforms) && task.platforms.length) return task.platforms;
  return String(task?.platform || "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}
