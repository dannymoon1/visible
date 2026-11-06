import type { AvatarKey } from "@/components/site/CreatorAvatar";

// Videos for the homepage "Real posts" section (DESIGN.md §8, section 2).
//
// Today these are licensed sample clips (Pexels and Mixkit, both free for
// commercial use), so they carry no creator names or businesses: their
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

export const REAL_POSTS: RealPost[] = [
  { clip: "selfie", source: "https://www.pexels.com/video/6201014/" },
  { clip: "barber", source: "https://mixkit.co/free-stock-video/40608/" },
  { clip: "talk", source: "https://mixkit.co/free-stock-video/42323/" },
  { clip: "call", source: "https://www.pexels.com/video/10375449/" },
  { clip: "feast", source: "https://www.pexels.com/video/6201016/" },
  { clip: "street", source: "https://mixkit.co/free-stock-video/32043/" },
  { clip: "filming", source: "https://www.pexels.com/video/6201017/" },
  { clip: "bar", source: "https://www.pexels.com/video/10375451/" },
  { clip: "facetime", source: "https://www.pexels.com/video/6201020/" },
  { clip: "barber2", source: "https://mixkit.co/free-stock-video/40607/" },
  { clip: "smile", source: "https://www.pexels.com/video/10375463/" },
  { clip: "scroll", source: "https://mixkit.co/free-stock-video/4837/" },
];
