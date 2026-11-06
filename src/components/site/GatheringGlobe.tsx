"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Hand, Heart, MessageCircle, Send, ThumbsUp, Share2, Bookmark } from "lucide-react";
import { cn } from "@/lib/cn";
import { LAND_DOTS } from "@/lib/landDots";
import CreatorAvatar, { type AvatarKey } from "@/components/site/CreatorAvatar";

// The Gathering Globe (DESIGN.md §8, section 1): a business at the centre of
// the world's conversation. The shop owner (passed in as `centre`) sits at the
// sphere's middle depth; creators' posts about local businesses sit on the
// sphere around her, passing in front of her and behind her as it turns. A
// faint dotted world map on the sphere says "reach the world from here".
//
// Motion is driven by the visitor, never a loop:
//   load   → posts burst out from behind her (CSS, so it plays on first paint
//            even before this script runs), then one small turn and rest
//   mouse  → the globe leans toward the cursor (desktop)
//   drag   → spins with momentum (mouse, or a sideways swipe on phones)
//   scroll → turns a little as the page moves
// No 3D library: points are rotated and projected here, then drawn with plain
// 2D transforms (posts always face the viewer) and one SVG for the map. The
// frame loop only runs while something is moving.

// The platforms we can track views on: TikTok, Instagram and Facebook.
// Every post names the business it's about, the way the platforms' own
// "Paid partnership" labels do (and the brief requires the label).
type Platform = "TikTok" | "Reels" | "Facebook";
type Post =
  | { kind: "video"; image: string; avatar: AvatarKey; handle: string; platform: Platform; business: string; caption: string }
  | { kind: "insta"; avatar: AvatarKey; handle: string; business: string; caption: string; tone: string }
  | { kind: "feed"; avatar: AvatarKey; name: string; business: string; caption: string };

// To add creators, drop a 3:4 image into public/hero/cards/<name>-{160,240}.{avif,webp},
// add their face to the avatar sprite, and add a "video" line.
// Creators keep one face and handle across platforms (the same people appear
// in the Real posts section). The soup and dress posts show no person, so
// their creators' faces come from the spare creator images.
const POSTS: Post[] = [
  { kind: "video", image: "afang", avatar: "market", handle: "mmamarketuyo", platform: "TikTok", business: "Mama Nkoyo's Kitchen", caption: "Mama Nkoyo afang na 10/10 🔥" },
  { kind: "insta", avatar: "tailor", handle: "stitchedbyidara", business: "Aunty B's Small Chops", tone: "dusk", caption: "Who dey Ikot Ekpene? Una need see Aunty B's small chops 👀" },
  { kind: "video", image: "stylist", avatar: "stylist", handle: "nkem.styles", platform: "Reels", business: "Glow Studio", caption: "Come do your hair with me at Glow Studio" },
  { kind: "feed", avatar: "bakery", name: "Joy Effiong", business: "Mama Nkoyo's Kitchen", caption: "Ordered from Mama Nkoyo's Kitchen. Food reach my house in 30 minutes!" },
  { kind: "video", image: "barber", avatar: "barber", handle: "fadebykelvin", platform: "TikTok", business: "Kelvin's Barbershop", caption: "Fresh cut for Sunday. Book Kelvin's chair" },
  { kind: "video", image: "suya", avatar: "suya", handle: "uyonights", platform: "TikTok", business: "Nwaniba Suya Spot", caption: "Best suya for Uyo no be lie. Nwaniba Road, from 6pm 🔥" },
  { kind: "insta", avatar: "makeup", handle: "beatbyenoabasi", business: "Glow Studio", tone: "plum", caption: "If you never try Glow Studio, you dey miss o 💅🏾" },
  { kind: "video", image: "dress", avatar: "decorator", handle: "decorbyamara", platform: "Reels", business: "Ada's Boutique", caption: "This ankara set from Ada's don finish me ✨" },
  { kind: "feed", avatar: "gadget", name: "Edet Akpan", business: "Gadget Hub", caption: "My go-to spot for gadgets now. Prices dey okay and service sharp." },
  { kind: "video", image: "pharmacist", avatar: "pharmacist", handle: "healthwithtimi", platform: "Facebook", business: "Timi's Pharmacy", caption: "Your neighbourhood pharmacy, open till 10pm" },
  { kind: "video", image: "dancer", avatar: "dancer", handle: "zara.moves", platform: "TikTok", business: "Case Corner", caption: "Phone case wey match my outfit? Case Corner 💃🏾" },
  { kind: "insta", avatar: "student", handle: "kemi.reviews", business: "Mama Nkoyo's Kitchen", tone: "teal", caption: "Weekend sorted: pepper soup and cold zobo 😋" },
  { kind: "video", image: "salon", avatar: "salon", handle: "braidsbyjoy", platform: "Reels", business: "Joy's Braids", caption: "Knotless braids, no headache. Book your slot" },
  { kind: "feed", avatar: "fitness", name: "Imaobong Ekpo", business: "Timi's Pharmacy", caption: "Pharmacy wey dey open late for Uyo. Thank God for Timi's." },
  { kind: "video", image: "student", avatar: "student", handle: "kemi.reviews", platform: "TikTok", business: "Campus Bites", caption: "I tried the new spot so you don't have to" },
  { kind: "video", image: "gadget", avatar: "gadget", handle: "techwithedet", platform: "TikTok", business: "Gadget Hub", caption: "UK-used iPhone, 100% battery health. Gadget Hub 📱" },
  { kind: "video", image: "bakery", avatar: "bakery", handle: "foodiewithjoy", platform: "Reels", business: "Sweet Crumbs Bakery", caption: "Red velvet wey sweet like this? Sweet Crumbs 🍰" },
  { kind: "video", image: "fitness", avatar: "fitness", handle: "fitwithimaobong", platform: "TikTok", business: "Core Fitness Uyo", caption: "Squat challenge at Core Fitness. You dey in?" },
];

const N = POSTS.length;

// Posts spread evenly on the sphere (Fibonacci spiral), rolled so that at
// rest no post covers her face, before or after the load turn. ROLL and
// REST_YAW below were searched offline for the widest gap (about 1.1cqi);
// re-run that search if the posts or their sizes change.
const ROLL = 1.117;
const POINTS = Array.from({ length: N }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / N;
  const r = Math.sqrt(1 - y * y);
  const theta = i * Math.PI * (3 - Math.sqrt(5));
  const x = r * Math.cos(theta);
  return {
    x: x * Math.cos(ROLL) - y * Math.sin(ROLL),
    y: x * Math.sin(ROLL) + y * Math.cos(ROLL),
    z: r * Math.sin(theta),
  };
});

// Geometry, in cqi (1% of the globe's width)
const RADIUS = 38; // posts
const MAP_RADIUS = 35.5; // the map sits just under the posts
const FOCAL = 125; // perspective distance: front ~1.4x, back ~0.77x
const BASE_PITCH = 0.22; // look slightly down onto the globe
const REST_YAW = 3.962;
const TURN = 0.55; // the one small turn after the burst

// The map is turned so Africa (about 20°E) faces the viewer once the turn ends
const deg = Math.PI / 180;
const MAP_LON_OFFSET = -20 * deg - (REST_YAW + TURN);
const toVec = (lat: number, lon: number) => {
  const la = lat * deg;
  const lo = lon * deg + MAP_LON_OFFSET;
  return { x: Math.cos(la) * Math.sin(lo), y: -Math.sin(la), z: Math.cos(la) * Math.cos(lo) };
};
const LAND = Array.from({ length: LAND_DOTS.length / 2 }, (_, i) => toVec(LAND_DOTS[2 * i]!, LAND_DOTS[2 * i + 1]!));
// Graticule: every 30° of latitude and longitude, sampled every 5°
const LINES = [
  ...[-60, -30, 0, 30, 60].map((lat) => Array.from({ length: 73 }, (_, k) => toVec(lat, -180 + k * 5))),
  ...Array.from({ length: 12 }, (_, m) => Array.from({ length: 37 }, (_, k) => toVec(-90 + k * 5, -180 + m * 30))),
];

type Vec = { x: number; y: number; z: number };

function rotate(p: Vec, yaw: number, pitch: number): Vec {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x1 = p.x * cy + p.z * sy;
  const z1 = -p.x * sy + p.z * cy;
  return { x: x1, y: p.y * cp - z1 * sp, z: p.y * sp + z1 * cp };
}

function project(v: Vec, radius: number) {
  const s = FOCAL / (FOCAL - v.z * radius);
  return { x: v.x * radius * s, y: v.y * radius * s, s };
}

// Where a post sits and how it looks at that depth
function placePost(i: number, yaw: number, pitch: number) {
  const v = rotate(POINTS[i]!, yaw, pitch);
  const p = project(v, RADIUS);
  const depth = (v.z + 1) / 2; // 0 back, 1 front
  return {
    x: p.x,
    y: p.y,
    s: p.s,
    transform: `translate(-50%, -50%) translate(${p.x.toFixed(2)}cqi, ${p.y.toFixed(2)}cqi) scale(${p.s.toFixed(3)})`,
    opacity: (0.25 + 0.75 * depth ** 1.3).toFixed(3),
    // Her disc sits at 1000: posts on the near side pass over her, the rest behind
    zIndex: String(1000 + Math.round(v.z * 500)),
  };
}

const f = (n: number) => n.toFixed(1);

// The front half of the map as SVG paths: land dots in three depth bands
// (fainter towards the edge, which rounds the sphere) and the graticule
function mapPaths(yaw: number, pitch: number) {
  const bands = ["", "", ""];
  for (const d of LAND) {
    const v = rotate(d, yaw, pitch);
    if (v.z <= 0.04) continue;
    const p = project(v, MAP_RADIUS);
    const band = v.z > 0.55 ? 0 : v.z > 0.25 ? 1 : 2;
    bands[band] += `M${f(p.x)} ${f(p.y)}h0`;
  }
  let lines = "";
  for (const line of LINES) {
    let pen = false;
    for (const pt of line) {
      const v = rotate(pt, yaw, pitch);
      if (v.z <= 0.02) {
        pen = false;
        continue;
      }
      const p = project(v, MAP_RADIUS);
      lines += `${pen ? "L" : "M"}${f(p.x)} ${f(p.y)}`;
      pen = true;
    }
  }
  return { bands, lines };
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function GatheringGlobe({ centre }: { centre: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const postRefs = useRef<Array<HTMLDivElement | null>>([]);
  const landRefs = useRef<Array<SVGPathElement | null>>([]);
  const linesRef = useRef<SVGPathElement>(null);
  const [dragged, setDragged] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let hinted = false;
    try {
      hinted = Boolean(sessionStorage.getItem("vc-globe-dragged"));
    } catch {}
    if (hinted) setDragged(true);

    // The turn plays once the CSS burst has finished (about 2.4s after the
    // page started loading), or straight away if this script arrived late
    const turnStart = Math.max(performance.now() + 150, 2400);
    const TURN_MS = 1600;

    let yaw = 0; // from drags and momentum
    let pitch = 0;
    let vel = 0;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    const track = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0 };
    let inView = true;
    let raf = 0;

    const render = (now: number) => {
      const turn = reduced ? TURN : TURN * easeInOut(clamp((now - turnStart) / TURN_MS, 0, 1));

      track.yaw += (track.tYaw - track.yaw) * 0.06;
      track.pitch += (track.tPitch - track.pitch) * 0.06;
      if (!dragging && Math.abs(vel) > 0.00005) {
        yaw += vel;
        vel *= 0.95;
      }
      const scrollYaw = window.scrollY * 0.0018;

      const totalYaw = REST_YAW + turn + yaw + track.yaw + scrollYaw;
      const totalPitch = clamp(BASE_PITCH + pitch + track.pitch, -0.7, 0.9);
      for (let i = 0; i < N; i++) {
        const el = postRefs.current[i];
        if (!el) continue;
        const v = placePost(i, totalYaw, totalPitch);
        el.style.transform = v.transform;
        el.style.opacity = v.opacity;
        el.style.zIndex = v.zIndex;
      }
      const map = mapPaths(totalYaw, totalPitch);
      map.bands.forEach((d, b) => landRefs.current[b]?.setAttribute("d", d));
      linesRef.current?.setAttribute("d", map.lines);

      const moving =
        (!reduced && now < turnStart + TURN_MS) ||
        dragging ||
        Math.abs(vel) > 0.00005 ||
        Math.abs(track.tYaw - track.yaw) > 0.0004 ||
        Math.abs(track.tPitch - track.pitch) > 0.0004;
      raf = moving && inView ? requestAnimationFrame(render) : 0;
    };

    const wake = () => {
      if (!raf && inView) raf = requestAnimationFrame(render);
    };

    // The globe leans toward the cursor, anywhere on the page (mouse only)
    const onMove = (e: PointerEvent) => {
      if (reduced || e.pointerType !== "mouse" || dragging) return;
      track.tYaw = (e.clientX / window.innerWidth - 0.5) * 0.42;
      track.tPitch = (e.clientY / window.innerHeight - 0.5) * 0.3;
      wake();
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      vel = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      stage.setPointerCapture(e.pointerId);
      stage.dataset.dragging = "true";
      wake();
    };

    const onDrag = (e: PointerEvent) => {
      if (!dragging) return;
      const size = stage.clientWidth;
      const dx = ((e.clientX - lastX) / size) * Math.PI;
      const now = performance.now();
      yaw += dx;
      // Up/down on a phone scrolls the page, so only mice tilt the globe
      if (e.pointerType === "mouse") pitch = clamp(pitch + ((e.clientY - lastY) / size) * Math.PI * 0.6, -0.8, 0.6);
      vel = (dx / Math.max(1, now - lastT)) * 16;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
      if (!hinted) {
        hinted = true;
        setDragged(true);
        try {
          sessionStorage.setItem("vc-globe-dragged", "1");
        } catch {}
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      delete stage.dataset.dragging;
      if (stage.hasPointerCapture(e.pointerId)) stage.releasePointerCapture(e.pointerId);
      // Holding still before letting go means no fling
      if (performance.now() - lastT > 80 || reduced) vel = 0;
      vel = clamp(vel, -0.12, 0.12);
      wake();
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true;
      wake();
    });
    observer.observe(stage);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onDrag);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", wake);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onDrag);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // Server render shows the globe at rest; the script takes over from here
  const restMap = mapPaths(REST_YAW, BASE_PITCH);

  return (
    // isolate: the globe's depth ordering stays inside it, under the navbar
    <div className="relative isolate mx-auto mt-12 w-[min(42rem,96vw)] sm:mt-16">
      <div className="hero-glow pointer-events-none absolute -inset-[25%]" aria-hidden="true" />

      <div
        ref={stageRef}
        className="globe relative aspect-square cursor-grab touch-pan-y select-none data-[dragging=true]:cursor-grabbing"
        role="img"
        aria-label="A shop owner at the centre of a globe of local creators' posts about local businesses, over a faint map of the world."
      >
        <svg
          viewBox="-50 -50 100 100"
          className="globe-map pointer-events-none absolute inset-0 h-full w-full text-ink"
          style={{ zIndex: 999 }}
          aria-hidden="true"
        >
          <path ref={linesRef} d={restMap.lines} fill="none" stroke="currentColor" strokeWidth="0.12" opacity="0.1" />
          {restMap.bands.map((d, b) => (
            <path
              key={b}
              ref={(el) => {
                landRefs.current[b] = el;
              }}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeLinecap="round"
              opacity={[0.26, 0.17, 0.09][b]}
            />
          ))}
        </svg>

        {POSTS.map((post, i) => {
          const v = placePost(i, REST_YAW, BASE_PITCH);
          return (
            <div
              key={i}
              ref={(el) => {
                postRefs.current[i] = el;
              }}
              className="absolute top-1/2 left-1/2 will-change-transform"
              style={{ transform: v.transform, opacity: Number(v.opacity), zIndex: Number(v.zIndex) }}
              aria-hidden="true"
            >
              {/* The burst: each post flies out from behind her to its place */}
              <div
                className="globe-burst"
                style={
                  {
                    "--i": i,
                    "--bx": `${(-v.x / v.s).toFixed(2)}cqi`,
                    "--by": `${(-v.y / v.s).toFixed(2)}cqi`,
                  } as CSSProperties
                }
              >
                <PostView post={post} />
              </div>
            </div>
          );
        })}

        <div className="globe-disc grain" aria-hidden="true">
          {centre}
        </div>
      </div>

      <p
        className={cn(
          "globe-hint mx-auto mt-2 flex w-fit items-center gap-2 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-sm text-muted backdrop-blur transition-opacity duration-500",
          dragged && "pointer-events-none opacity-0"
        )}
        aria-hidden="true"
      >
        <Hand className="h-4 w-4" />
        Drag to explore
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Posts, styled after the platforms creators actually use            */

const INSTA_TONES: Record<string, string> = {
  dusk: "bg-[linear-gradient(160deg,#14161A,#3A2316)]",
  ember: "bg-[linear-gradient(150deg,#FF8A3D,#F2541E)]",
  plum: "bg-[linear-gradient(160deg,#5B2A6E,#2E1638)]",
  teal: "bg-[linear-gradient(160deg,#0F6B63,#0A3D3A)]",
};

function PostView({ post }: { post: Post }) {
  if (post.kind === "video") return <VideoPost {...post} />;
  if (post.kind === "insta") return <InstaPost {...post} />;
  return <FeedPost {...post} />;
}

// The disclosure line each platform actually shows
function partnership(platform: Platform, business: string) {
  if (platform === "TikTok") return "Paid partnership";
  if (platform === "Reels") return `Paid partnership with ${business}`;
  return `Paid partnership · ${business}`;
}

// TikTok / Reels / Facebook video: full-bleed frame with the creator's overlay
function VideoPost({ image, avatar, handle, platform, business, caption }: Extract<Post, { kind: "video" }>) {
  const src = (w: number, ext: string) => `/hero/cards/${image}-${w}.${ext} ${w}w`;
  const sizes = "(min-width: 640px) 130px, 20vw";
  return (
    <div className="globe-post relative aspect-[3/4] w-[14cqi] overflow-hidden rounded-[1.8cqi] bg-line text-white">
      <picture>
        <source type="image/avif" srcSet={`${src(160, "avif")}, ${src(240, "avif")}`} sizes={sizes} />
        <img
          src={`/hero/cards/${image}-160.webp`}
          srcSet={`${src(160, "webp")}, ${src(240, "webp")}`}
          sizes={sizes}
          alt=""
          width={240}
          height={320}
          draggable={false}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </picture>
      <span className="absolute top-[1cqi] left-[1cqi] rounded-full bg-black/35 px-[0.9cqi] py-[0.2cqi] text-[1.05cqi] font-semibold backdrop-blur-sm">
        {platform}
      </span>
      <div className="absolute right-[0.9cqi] bottom-[5cqi] flex flex-col items-center gap-[1cqi] [&>svg]:h-[1.7cqi] [&>svg]:w-[1.7cqi] [&>svg]:drop-shadow">
        <Heart fill="currentColor" />
        <MessageCircle />
        <Send />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-[1cqi] pt-[5cqi] pb-[1.3cqi]">
        <div className="flex items-center gap-[0.6cqi] pr-[2.8cqi]">
          <CreatorAvatar who={avatar} className="w-[2.2cqi] ring-[0.15cqi] ring-white/80" />
          <p className="truncate text-[1.2cqi] font-semibold">@{handle}</p>
        </div>
        <p className="mt-[0.3cqi] truncate pr-[2.8cqi] text-[0.95cqi] opacity-75">{partnership(platform, business)}</p>
        <p className="mt-[0.4cqi] line-clamp-2 pr-[2.8cqi] text-[1.15cqi] leading-snug">{caption}</p>
      </div>
      {/* Playback bar */}
      <span className="absolute inset-x-0 bottom-0 h-[0.35cqi] bg-white/25">
        <span className="block h-full w-3/5 bg-white" />
      </span>
    </div>
  );
}

// Instagram feed post: a text post on colour, with Instagram's header and actions
function InstaPost({ avatar, handle, business, caption, tone }: Extract<Post, { kind: "insta" }>) {
  return (
    <div className="globe-post w-[14cqi] overflow-hidden rounded-[1.6cqi] border border-line bg-surface text-ink">
      <div className="flex items-center gap-[0.7cqi] px-[1cqi] py-[0.8cqi]">
        {/* Story ring around the avatar */}
        <span className="shrink-0 rounded-full bg-[linear-gradient(45deg,#FFB547,#FF6A1A,#C2185B)] p-[0.2cqi]">
          <CreatorAvatar who={avatar} className="w-[2.2cqi] border-[0.2cqi] border-surface" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[1.1cqi] font-semibold">{handle}</p>
          <p className="truncate text-[0.9cqi] text-muted">Paid partnership with {business}</p>
        </div>
      </div>
      <div className={cn("flex aspect-square items-center justify-center p-[1.4cqi] text-center text-white", INSTA_TONES[tone])}>
        <p className="font-heading text-[1.5cqi] leading-snug font-semibold text-balance">{caption}</p>
      </div>
      <div className="flex items-center gap-[1cqi] px-[1cqi] py-[0.9cqi] [&_svg]:h-[1.5cqi] [&_svg]:w-[1.5cqi]">
        <Heart />
        <MessageCircle />
        <Send />
        <Bookmark className="ml-auto" />
      </div>
    </div>
  );
}

// Facebook feed post with the reaction bar
function FeedPost({ avatar, name, business, caption }: Extract<Post, { kind: "feed" }>) {
  return (
    <div className="globe-post w-[18cqi] rounded-[1.6cqi] border border-line bg-surface px-[1.2cqi] pt-[1.2cqi] text-ink">
      <div className="flex items-center gap-[0.7cqi]">
        <CreatorAvatar who={avatar} className="w-[2.6cqi]" />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[1.2cqi] font-semibold">{name}</p>
          <p className="truncate text-[0.95cqi] text-muted">Paid partnership · {business}</p>
        </div>
      </div>
      <p className="mt-[1cqi] text-[1.2cqi] leading-snug">{caption}</p>
      {/* Spread edge to edge with even space between, like Facebook's bar */}
      <div className="mt-[1.1cqi] flex justify-between border-t border-line px-[0.4cqi] py-[0.9cqi] text-[0.9cqi] text-muted">
        {[
          { icon: <ThumbsUp />, label: "Like" },
          { icon: <MessageCircle />, label: "Comment" },
          { icon: <Share2 />, label: "Share" },
        ].map(({ icon, label }) => (
          <span
            key={label}
            className="flex items-center gap-[0.4cqi] whitespace-nowrap [&>svg]:h-[1.15cqi] [&>svg]:w-[1.15cqi] [&>svg]:shrink-0"
          >
            {icon}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
