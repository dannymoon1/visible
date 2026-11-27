import type { ComponentType } from "react";
import {
  ChatCircle,
  Globe,
  LinkedinLogo,
  SnapchatLogo,
  ThreadsLogo,
  XLogo,
} from "@phosphor-icons/react";
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon, YouTubeShortsIcon } from "@/components/icons/brands";

// Anything that draws an icon from a className (brand marks, Phosphor icons)
export type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

// One icon per platform in PLATFORMS (src/lib/campaignOptions.ts): the
// official brand marks (src/components/icons/brands.tsx). Platforms older
// campaigns may still list keep a Phosphor logo, so their history keeps its icons.
export const PLATFORM_ICONS: Record<string, IconComponent> = {
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  TikTok: TikTokIcon,
  "YouTube Shorts": YouTubeShortsIcon,
  YouTube: YouTubeIcon,
  // Legacy
  X: XLogo,
  LinkedIn: LinkedinLogo,
  WhatsApp: ChatCircle,
  Snapchat: SnapchatLogo,
  Threads: ThreadsLogo,
};

export function platformIcon(name: string): IconComponent {
  return PLATFORM_ICONS[name] ?? Globe;
}

// Campaign platforms: the new array column, falling back to the
// older comma-separated `platform` text for legacy tasks
export { taskPlatforms } from "@/lib/taskPlatforms";
