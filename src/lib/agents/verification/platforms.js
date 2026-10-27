// Checks through each platform's API that the user's comment really exists.
//
// Every checker returns:
//   { status: "found" | "not_found" | "unverifiable" | "error",
//     detail: "human-readable explanation",
//     comment: { text, author, createdAt } }   // only when found
//
// "unverifiable" means we have no API access for this post. Those
// submissions go to manual review; they are never auto-passed.

const TIMEOUT_MS = 10000;
const MAX_PAGES = 5;

export function detectPlatform(link) {
  let url;
  try {
    url = new URL(link);
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

export async function verifyEngagement({ link, handle }) {
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
    console.error(`Engagement check failed (${platform}):`, error.message);
    return { status: "error", detail: `${platform} API error: ${error.message}` };
  }
}

// ---------------------------------------------------------------
// YouTube: public comments are readable with a free API key
// ---------------------------------------------------------------
async function checkYouTube(videoId, username) {
  if (!process.env.YOUTUBE_API_KEY) {
    return { status: "unverifiable", detail: "YOUTUBE_API_KEY is not configured." };
  }
  if (!videoId) {
    return { status: "unverifiable", detail: "Could not read the YouTube video ID." };
  }

  let pageToken = "";

  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      part: "snippet",
      videoId,
      maxResults: "100",
      order: "time",
      key: process.env.YOUTUBE_API_KEY,
    });
    if (pageToken) params.set("pageToken", pageToken);

    const data = await getJson(
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
async function checkX(tweetId, username) {
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

  const data = await getJson(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
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
async function checkInstagram(shortcode, username) {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !accountId) {
    return {
      status: "unverifiable",
      detail: "Instagram API is not configured. Check this one manually.",
    };
  }

  // Find the media ID for this post among the connected account's posts
  let mediaId = null;
  let next = `https://graph.facebook.com/v21.0/${accountId}/media?fields=id,shortcode&limit=100&access_token=${token}`;

  for (let page = 0; page < MAX_PAGES && next && !mediaId; page++) {
    const data = await getJson(next);
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
    const data = await getJson(next);
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

function normalizeHandle(handle) {
  return String(handle || "").trim().replace(/^@/, "").toLowerCase();
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.error?.message || data.detail || data.title || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data;
}
