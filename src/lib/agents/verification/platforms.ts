// Checks through each platform's API that the user's comment really exists.
//
// Every checker returns:
//   { status: "found" | "not_found" | "unverifiable" | "error",
//     detail: "human-readable explanation",
//     comment: { text, author, createdAt } }   // only when found
//
// "unverifiable" means we have no API access for this post. Those
// submissions go to manual review; they are never auto-passed.

export type EngagementStatus = "found" | "not_found" | "unverifiable" | "error";

export interface FoundComment {
  text: string | undefined;
  author: string | undefined;
  createdAt: string | undefined;
}

export interface EngagementResult {
  status: EngagementStatus;
  detail: string;
  comment?: FoundComment;
}

export type DetectedPlatformName = "youtube" | "x" | "instagram" | "tiktok" | "unknown";

export interface DetectedPlatform {
  platform: DetectedPlatformName;
  id?: string | null;
}

// Response shapes of the platform APIs (only the fields read here)
interface YouTubeCommentThreads {
  items?: {
    snippet: {
      topLevelComment: {
        snippet: { authorDisplayName: string; textOriginal: string; publishedAt: string };
      };
    };
  }[];
  nextPageToken?: string;
}

interface XSearchResponse {
  data?: { text: string; created_at?: string }[];
}

interface XTweetResponse {
  data?: { text: string; created_at?: string };
  includes?: { users?: { username?: string }[] };
}

interface InstagramPage<T> {
  data?: T[];
  paging?: { next?: string };
}

interface YouTubeVideos {
  items?: {
    snippet?: { title?: string; description?: string; channelTitle?: string; publishedAt?: string };
  }[];
}

const TIMEOUT_MS = 10000;
const MAX_PAGES = 5;

export function detectPlatform(link: string | null | undefined): DetectedPlatform {
  let url: URL;
  try {
    // String() keeps the old behaviour: null/undefined become invalid URLs and throw
    url = new URL(String(link));
  } catch {
    return { platform: "unknown" };
  }

  const host = url.hostname.replace(/^www\.|^m\./, "");
  const path = url.pathname;

  if (host === "youtu.be") {
    return { platform: "youtube", id: path.slice(1) };
  }
  if (host.endsWith("youtube.com")) {
    const shorts = path.match(/^\/shorts\/([\w-]+)/);
    return { platform: "youtube", id: shorts ? shorts[1] : url.searchParams.get("v") };
  }
  if (host === "x.com" || host === "twitter.com") {
    const match = path.match(/\/status\/(\d+)/);
    return { platform: "x", id: match?.[1] };
  }
  if (host === "instagram.com") {
    const match = path.match(/\/(?:p|reel|reels|tv)\/([\w-]+)/);
    return { platform: "instagram", id: match?.[1] };
  }
  if (host.endsWith("tiktok.com")) {
    return { platform: "tiktok" };
  }
  return { platform: "unknown" };
}

export async function verifyEngagement({
  link,
  handle,
}: {
  link: string | null | undefined;
  handle: string | null | undefined;
}): Promise<EngagementResult> {
  const { platform, id } = detectPlatform(link);
  const username = normalizeHandle(handle);

  if (!username) {
    return { status: "not_found", detail: "No social media handle was submitted." };
  }

  try {
    switch (platform) {
      case "youtube":
        return await checkYouTube(id, username);
      case "x":
        return await checkX(id, username);
      case "instagram":
        return await checkInstagram(id, username);
      case "tiktok":
        return {
          status: "unverifiable",
          detail: "TikTok has no public comment API. Check this one manually.",
        };
      default:
        return {
          status: "unverifiable",
          detail: "Unrecognised post link. Check this one manually.",
        };
    }
  } catch (error) {
    const message = errorMessage(error);
    console.error(`Engagement check failed (${platform}):`, message);
    return { status: "error", detail: `${platform} API error: ${message}` };
  }
}

// ---------------------------------------------------------------
// YouTube: public comments are readable with a free API key
// ---------------------------------------------------------------
async function checkYouTube(
  videoId: string | null | undefined,
  username: string
): Promise<EngagementResult> {
  if (!process.env.YOUTUBE_API_KEY) {
    return { status: "unverifiable", detail: "YOUTUBE_API_KEY is not configured." };
  }
  if (!videoId) {
    return { status: "unverifiable", detail: "Could not read the YouTube video ID." };
  }

  let pageToken: string | undefined = "";

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      part: "snippet",
      videoId,
      maxResults: "100",
      order: "time",
      key: process.env.YOUTUBE_API_KEY,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const data = await getJson<YouTubeCommentThreads>(
      `https://www.googleapis.com/youtube/v3/commentThreads?${params}`
    );

    for (const thread of data.items || []) {
      const c = thread.snippet.topLevelComment.snippet;
      if (normalizeHandle(c.authorDisplayName) === username) {
        return {
          status: "found",
          detail: "Comment found via the YouTube API.",
          comment: { text: c.textOriginal, author: c.authorDisplayName, createdAt: c.publishedAt },
        };
      }
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return {
    status: "not_found",
    detail: `No comment from @${username} in the latest ${MAX_PAGES * 100} comments.`,
  };
}

// ---------------------------------------------------------------
// X (Twitter): needs a paid API tier (Basic or above) bearer token.
// Recent search only covers the last 7 days.
// ---------------------------------------------------------------
async function checkX(tweetId: string | null | undefined, username: string): Promise<EngagementResult> {
  if (!process.env.X_BEARER_TOKEN) {
    return { status: "unverifiable", detail: "X_BEARER_TOKEN is not configured." };
  }
  if (!tweetId) {
    return { status: "unverifiable", detail: "Could not read the post ID from the X link." };
  }

  const params = new URLSearchParams({
    query: `conversation_id:${tweetId} from:${username}`,
    "tweet.fields": "text,created_at",
    max_results: "10",
  });

  const data = await getJson<XSearchResponse>(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
    Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
  });

  const reply = data.data?.[0];
  if (reply) {
    return {
      status: "found",
      detail: "Reply found via the X API.",
      comment: { text: reply.text, author: username, createdAt: reply.created_at },
    };
  }

  return {
    status: "not_found",
    detail: `No reply from @${username} found (X search covers the last 7 days only).`,
  };
}

// ---------------------------------------------------------------
// Instagram: the Graph API only returns comments on posts owned by
// the business account whose token you have (e.g. your clients'
// accounts connected to your Meta app).
// ---------------------------------------------------------------
async function checkInstagram(
  shortcode: string | null | undefined,
  username: string
): Promise<EngagementResult> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !accountId) {
    return {
      status: "unverifiable",
      detail: "Instagram API is not configured. Check this one manually.",
    };
  }

  // Find the media ID for this post among the connected account's posts
  let mediaId: string | null | undefined = null;
  let next: string | undefined = `https://graph.facebook.com/v21.0/${accountId}/media?fields=id,shortcode&limit=100&access_token=${token}`;

  for (let page = 0; page < MAX_PAGES && next && !mediaId; page++) {
    const data: InstagramPage<{ id: string; shortcode?: string }> = await getJson(next);
    mediaId = data.data?.find((m) => m.shortcode === shortcode)?.id;
    next = data.paging?.next;
  }

  if (!mediaId) {
    return {
      status: "unverifiable",
      detail: "This Instagram post isn't owned by the connected business account. Check it manually.",
    };
  }

  next = `https://graph.facebook.com/v21.0/${mediaId}/comments?fields=text,username,timestamp&limit=100&access_token=${token}`;

  for (let page = 0; page < MAX_PAGES && next; page++) {
    const data: InstagramPage<{ text?: string; username?: string; timestamp?: string }> = await getJson(next);
    const match = data.data?.find((c) => normalizeHandle(c.username) === username);
    if (match) {
      return {
        status: "found",
        detail: "Comment found via the Instagram Graph API.",
        comment: { text: match.text, author: match.username, createdAt: match.timestamp },
      };
    }
    next = data.paging?.next;
  }

  return { status: "not_found", detail: `No comment from @${username} on this post.` };
}

// ---------------------------------------------------------------
// Posts: the user published their own post about the campaign.
// Confirms the link is a post on the platform they chose, owned by
// the handle they gave, and (where an API allows) that it exists.
// ---------------------------------------------------------------
const PLATFORM_KEYS: Partial<Record<string, DetectedPlatformName>> = {
  X: "x",
  YouTube: "youtube",
  Instagram: "instagram",
  TikTok: "tiktok",
};

export async function verifyPost({
  postUrl,
  platform,
  handle,
}: {
  postUrl: string;
  platform: string | null | undefined;
  handle: string | null | undefined;
}): Promise<EngagementResult> {
  const username = normalizeHandle(handle);
  if (!username) {
    return { status: "not_found", detail: "No social media handle was submitted." };
  }

  let url: URL;
  try {
    url = new URL(postUrl);
  } catch {
    return { status: "not_found", detail: "No valid post link was submitted." };
  }

  const detected = detectPlatform(postUrl);
  const expected = platform ? PLATFORM_KEYS[platform] : undefined;
  if (expected && detected.platform !== "unknown" && detected.platform !== expected) {
    return {
      status: "not_found",
      detail: `The link is a ${detected.platform} post, but the user said they posted on ${platform}.`,
    };
  }

  // X and TikTok put the author's handle in the post URL
  const urlHandle =
    detected.platform === "x"
      ? url.pathname.split("/")[1]
      : detected.platform === "tiktok"
      ? url.pathname.match(/^\/@([^/]+)/)?.[1]
      : null;

  if (urlHandle && !["i", "intent"].includes(urlHandle) && normalizeHandle(urlHandle) !== username) {
    return {
      status: "not_found",
      detail: `The post link belongs to @${urlHandle}, not @${username}.`,
    };
  }

  try {
    if (detected.platform === "x") return await checkXPost(detected.id, username);
    if (detected.platform === "youtube") return await checkYouTubePost(detected.id, username);
  } catch (error) {
    const message = errorMessage(error);
    console.error(`Post check failed (${detected.platform}):`, message);
    return { status: "error", detail: `${detected.platform} API error: ${message}` };
  }

  return {
    status: "unverifiable",
    detail: urlHandle
      ? `Link format matches @${username}. Open the post to confirm it's live.`
      : `No API check for ${platform || "this platform"}. Open the post to confirm it's live and theirs.`,
  };
}

async function checkXPost(tweetId: string | null | undefined, username: string): Promise<EngagementResult> {
  if (!process.env.X_BEARER_TOKEN || !tweetId) {
    return { status: "unverifiable", detail: "X API not configured. Open the post to confirm it's live." };
  }

  const params = new URLSearchParams({ expansions: "author_id", "user.fields": "username", "tweet.fields": "text,created_at" });
  const data = await getJson<XTweetResponse>(`https://api.twitter.com/2/tweets/${tweetId}?${params}`, {
    Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
  });

  if (!data.data) return { status: "not_found", detail: "That X post doesn't exist or was deleted." };

  const author = data.includes?.users?.[0]?.username;
  if (normalizeHandle(author) !== username) {
    return { status: "not_found", detail: `That X post was made by @${author}, not @${username}.` };
  }

  return {
    status: "found",
    detail: "Post found via the X API.",
    comment: { text: data.data.text, author, createdAt: data.data.created_at },
  };
}

async function checkYouTubePost(
  videoId: string | null | undefined,
  username: string
): Promise<EngagementResult> {
  if (!process.env.YOUTUBE_API_KEY || !videoId) {
    return { status: "unverifiable", detail: "YouTube API not configured. Open the video to confirm it's live." };
  }

  const params = new URLSearchParams({ part: "snippet", id: videoId, key: process.env.YOUTUBE_API_KEY });
  const data = await getJson<YouTubeVideos>(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  const video = data.items?.[0]?.snippet;

  if (!video) return { status: "not_found", detail: "That YouTube video doesn't exist or is private." };

  const text = [video.title, video.description].filter(Boolean).join("\n\n");

  // The API gives the channel's display name, which may differ from the handle
  if (normalizeHandle(video.channelTitle).replace(/\s+/g, "") !== username) {
    return {
      status: "unverifiable",
      detail: `Video is live on the channel "${video.channelTitle}". Confirm it belongs to @${username}.`,
      comment: { text, author: video.channelTitle, createdAt: video.publishedAt },
    };
  }

  return {
    status: "found",
    detail: "Video found via the YouTube API.",
    comment: { text, author: video.channelTitle, createdAt: video.publishedAt },
  };
}

// ---------------------------------------------------------------

function normalizeHandle(handle: string | null | undefined): string {
  return String(handle || "").trim().replace(/^@/, "").toLowerCase();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Reads an API's JSON response. T describes the documented response shape
// (only the fields read here). It is not validated at runtime: a malformed
// body surfaces as a thrown TypeError, which every caller catches and reports
// as an "error" status, exactly as before the TypeScript conversion.
async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const body = isRecord(data) ? data : {};
    const apiError = isRecord(body.error) ? body.error.message : undefined;
    const message = apiError || body.detail || body.title || `HTTP ${res.status}`;
    throw new Error(String(message));
  }
  return data as T;
}
