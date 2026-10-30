import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Reads the campaign's reference links so the post assistant can use what
// is actually on those pages. The URLs come from advertisers, so every
// request is guarded against reaching internal or private addresses (SSRF).

const TIMEOUT_MS = 8000;
const MAX_BYTES = 512 * 1024; // stop reading a page after 512 KB
const MAX_REDIRECTS = 3;
const MAX_CHARS_PER_PAGE = 3000;
const MAX_LINKS = 6;
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map(); // url -> { at, result }

// Returns [{ url, title, description, text }] or [{ url, error }] per link.
export async function readReferences(urls) {
  const unique = [...new Set(urls.filter(Boolean))].slice(0, MAX_LINKS);
  return Promise.all(unique.map(readCached));
}

async function readCached(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  let result;
  try {
    result = { url, ...(await readPage(url)) };
  } catch (error) {
    result = { url, error: error.message };
  }

  cache.set(url, { at: Date.now(), result });
  return result;
}

async function readPage(startUrl) {
  let url = startUrl;

  // Follow redirects by hand so every hop is checked
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);

    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "VisibleBot/1.0 (+campaign reference reader)",
        Accept: "text/html,text/plain;q=0.9",
      },
    });

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location"), url).toString();
      continue;
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const type = res.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) {
      throw new Error(`Unsupported content (${type.split(";")[0] || "unknown"})`);
    }

    const body = await readLimited(res);
    return type.includes("text/plain") ? { text: clip(body) } : extractFromHtml(body);
  }

  throw new Error("Too many redirects");
}

// ---------------------------------------------------------------
// SSRF guard: public http(s) hosts only
// ---------------------------------------------------------------
async function assertPublicUrl(value) {
  const url = new URL(value);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https links are read");
  }
  if (url.username || url.password) throw new Error("Links with credentials are not read");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Non-standard ports are not read");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true, verbatim: true });

  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Link points to a private or internal address");
  }
}

function isPrivateAddress(address) {
  const ip = address.toLowerCase();

  if (isIP(ip) === 4) {
    const [a, b, c] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)
    );
  }

  // IPv4-mapped IPv6, e.g. ::ffff:127.0.0.1
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);

  return (
    ip === "::" || ip === "::1" ||
    /^f[cd]/.test(ip) || // unique local fc00::/7
    /^fe[89ab]/.test(ip) || // link-local fe80::/10
    /^ff/.test(ip) || // multicast
    ip.startsWith("64:ff9b:") // NAT64
  );
}

// ---------------------------------------------------------------
// Reading and extracting
// ---------------------------------------------------------------
async function readLimited(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    text += decoder.decode(value, { stream: true });
    if (received >= MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }

  return text;
}

function extractFromHtml(html) {
  const meta = (name) =>
    html.match(
      new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i")
    )?.[1] ||
    html.match(
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i")
    )?.[1];

  const title = meta("og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const description = meta("og:description") || meta("description");

  // Prefer the main content area when the page marks one
  const main =
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<body[\s\S]*?<\/body>/i)?.[0] ||
    html;

  const text = main
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|tr|section)>/gi, "\n")
    // Quoted attribute values may contain ">" (e.g. JSON in data-* attributes)
    .replace(/<\/?[a-z!][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/gi, " ")
    .replace(/<[^>]*>/g, " ");

  return {
    title: clean(title),
    description: clean(description),
    text: clip(clean(text)),
  };
}

function clean(value) {
  if (!value) return "";
  return decodeEntities(value)
    .replace(/[ \t\f\v\r]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function clip(text) {
  return text.length > MAX_CHARS_PER_PAGE ? `${text.slice(0, MAX_CHARS_PER_PAGE)}…` : text;
}
