import type { AvatarKey } from "@/components/site/CreatorAvatar";

// Made-up campaign for the made-up skincare brand Adiaha Skin, used by the
// demo business app (/demo/business) and the homepage video. Nothing here is
// a real business, creator or result.

// Where the demo app lives
export const BASE = "/demo/business";

export type Platform = "TikTok" | "Instagram" | "Facebook";
export type PostStatus = "verified" | "checking" | "removed";
export type SpotState = "open" | "joined" | "posted" | "verified";

export interface DemoPost {
  id: string;
  creator: { name: string; handle: string; avatar: AvatarKey; area: string };
  platform: Platform;
  image: string; // public/demo/posts/<image>.{avif,webp}
  caption: string;
  postedAgo: string;
  status: PostStatus;
  views: number;
  taps: number;
  chats: number;
  codes: number;
  // Shown when status is "removed" or "checking"
  note?: string;
}

export const BUSINESS = {
  name: "Adiaha Skin",
  owner: "Adiaha",
  initial: "A",
  area: "Uyo",
  wallet: 18500,
  credit: 3500,
};

export const CAMPAIGN = {
  id: "shea-week",
  name: "Shea butter week",
  goal: "Website visits",
  spots: 8,
  daysLeft: 3,
  startedAgo: "4 days ago",
  brief:
    "Shea butter and black soap skincare, made in small batches. Free delivery on every order this week.",
  where: ["adiahaskin.shop", "Studio, Ewet Housing"] as [website: string, address: string],
  // Verified views per day since the campaign opened
  daily: [1240, 4980, 9310, 12650, 14000],
  removedViews: 1912,
};

export const POSTS: DemoPost[] = [
  {
    id: "p1",
    creator: { name: "Enoabasi", handle: "beatbyenoabasi", avatar: "makeup", area: "Uyo" },
    platform: "TikTok",
    image: "makeup",
    caption: "My skin don thank me 😍 Adiaha shea set, see the glow",
    postedAgo: "2 days ago",
    status: "verified",
    views: 12840,
    taps: 402,
    chats: 21,
    codes: 9,
  },
  {
    id: "p2",
    creator: { name: "Nkem", handle: "nkem.styles", avatar: "stylist", area: "Uyo" },
    platform: "Instagram",
    image: "stylist",
    caption: "Before my clients sit, I tell them about this black soap",
    postedAgo: "2 days ago",
    status: "verified",
    views: 9310,
    taps: 288,
    chats: 14,
    codes: 6,
  },
  {
    id: "p3",
    creator: { name: "Kemi", handle: "kemi.reviews", avatar: "student", area: "Uyo" },
    platform: "TikTok",
    image: "student",
    caption: "Honest review: one week with Adiaha shea butter",
    postedAgo: "1 day ago",
    status: "verified",
    views: 8122,
    taps: 245,
    chats: 11,
    codes: 4,
  },
  {
    id: "p4",
    creator: { name: "Joy", handle: "Joy Effiong", avatar: "bakery", area: "Uyo" },
    platform: "Facebook",
    image: "bakery",
    caption: "Flour all day, soft hands anyway. Thank you Adiaha 🙏🏾",
    postedAgo: "1 day ago",
    status: "verified",
    views: 5866,
    taps: 181,
    chats: 12,
    codes: 5,
  },
  {
    id: "p5",
    creator: { name: "Imaobong", handle: "fitwithimaobong", avatar: "fitness", area: "Uyo" },
    platform: "Instagram",
    image: "fitness",
    caption: "After-gym skin routine, 3 steps",
    postedAgo: "5 hours ago",
    status: "checking",
    views: 4120,
    taps: 120,
    chats: 6,
    codes: 3,
    note: "We're checking the views. They count once they pass.",
  },
  {
    id: "p6",
    creator: { name: "Zara", handle: "zara.moves", avatar: "dancer", area: "Uyo" },
    platform: "TikTok",
    image: "dancer",
    caption: "Glow check 💃🏾",
    postedAgo: "3 days ago",
    status: "removed",
    views: 1912,
    taps: 0,
    chats: 0,
    codes: 0,
    note: "1,912 views came from accounts outside Nigeria in one hour. Removed and not billed. A standby took the spot.",
  },
];

// The eight spots on the campaign's ring, in order around it
export const SPOTS: { avatar: AvatarKey; state: SpotState }[] = [
  { avatar: "makeup", state: "verified" },
  { avatar: "stylist", state: "verified" },
  { avatar: "student", state: "verified" },
  { avatar: "bakery", state: "verified" },
  { avatar: "fitness", state: "posted" },
  { avatar: "salon", state: "joined" },
  { avatar: "tailor", state: "joined" },
  { avatar: "suya", state: "joined" },
];

export const verifiedPosts = POSTS.filter((p) => p.status === "verified");
export const TOTALS = {
  views: verifiedPosts.reduce((s, p) => s + p.views, 0),
  taps: verifiedPosts.reduce((s, p) => s + p.taps, 0),
  chats: verifiedPosts.reduce((s, p) => s + p.chats, 0),
  codes: verifiedPosts.reduce((s, p) => s + p.codes, 0),
};

export const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;
export const count = (n: number) => n.toLocaleString("en-NG");
