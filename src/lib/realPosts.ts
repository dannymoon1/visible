import type { AvatarKey } from "@/components/site/CreatorAvatar";

// Videos for the homepage "Real posts" section (DESIGN.md §8, section 2).
//
// Today these are licensed sample clips (iStock under its standard licence,
// Pexels and Mixkit free for commercial use), so they carry no creator names or businesses: their
// licences don't let us imply the people in them endorse anyone. The section
// labels them as sample footage while REAL_POSTS_ARE_SAMPLES is true.
//
// As founding creators' campaign videos come in, with their written
// permission, replace entries one by one and add `creator` and `business`:
//   - clip: public/hero/clips/<clip>.{mp4,webm} (9:16, 360x640, 4–6s, muted)
//           plus a poster still <clip>.{avif,webp}
export const REAL_POSTS_ARE_SAMPLES = true;

export type Platform = "TikTok" | "Instagram" | "Facebook";

export interface RealPost {
  clip: string;
  // Real campaign posts only
  creator?: { handle: string; platform: Platform; avatar?: AvatarKey };
  business?: string;
  // Where a sample clip came from, for our records
  source?: string;
}

// Samples show either someone making content (camera, ring light, selfie
// vlog) or the kind of local business a creator would post about, mixed so
// the strip alternates. Retired clips live in design-sources/retired/hero-clips/.
// Originals are in design-sources/creators/; iStock clips are recorded by their
// iStock ID (the number in the original filename). Landscape iStock originals
// were cropped to 9:16 around the subject. The makeup clip's Pexels link still
// needs recording (the file came without its ID).
export const REAL_POSTS: RealPost[] = [
  { clip: "skincare", source: "iStock 2341098756" },
  { clip: "makeup", source: "Pexels (link to record)" },
  { clip: "foodtruck", source: "iStock 2156789043" },
  { clip: "talker", source: "https://www.pexels.com/video/4994156/" },
  { clip: "vlog", source: "iStock 2098563417" },
  { clip: "braids", source: "iStock 2267431985" },
  { clip: "unbox", source: "https://www.pexels.com/video/6995100/" },
  { clip: "foodcourt", source: "iStock 2187456932" },
  { clip: "talk", source: "https://mixkit.co/free-stock-video/42323/" },
  { clip: "gimbal", source: "https://www.pexels.com/video/8360262/" },
  { clip: "fashion", source: "https://www.pexels.com/video/16303018/" },
];
