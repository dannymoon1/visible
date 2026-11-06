import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

// Creator faces, all in one small sprite (public/hero/avatars.{avif,webp}, 40px
// each) so 18 profile pictures cost one request. The order must match the
// sprite, which is cropped from the creator images in design-sources/landing/.
export const AVATARS = [
  "decorator",
  "gadget",
  "suya",
  "fitness",
  "market",
  "tailor",
  "bakery",
  "makeup",
  "dancer",
  "stylist",
  "barber",
  "salon",
  "pharmacist",
  "student",
] as const;

export type AvatarKey = (typeof AVATARS)[number];

// `large` uses a sharper 128px sprite (avatars-lg) for faces shown big,
// below the fold; the small one stays in the hero's light first view.
export default function CreatorAvatar({ who, large, className }: { who: AvatarKey; large?: boolean; className?: string }) {
  const i = AVATARS.indexOf(who);
  const style: CSSProperties = {
    backgroundSize: `${AVATARS.length * 100}% 100%`,
    backgroundPosition: `${(i / (AVATARS.length - 1)) * 100}% 0`,
  };
  return <span className={cn(large ? "avatar-sprite-lg" : "avatar-sprite", "block aspect-square shrink-0 rounded-full bg-line", className)} style={style} />;
}
