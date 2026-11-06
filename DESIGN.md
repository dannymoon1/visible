# Visibility Campaigns — design system

The look of every page and app. Read it with `CLAUDE.md` (brand, colours, voice) before designing or building a screen. Decided with the founder on 2026-11-02 from the Pinterest references in `design-sources/ìnspo/` (filenames below are shortened to their first four characters).

The founder later renamed the key references by purpose: `hero circle pictures.mp4` (Indigo rosette), `have this kind of motion for the hero section.mp4` (AnimateIT), `hero.mp4` (Brandlyft strip), `creative slider.mp4` (Calendly carousel), `your report section.mp4` (Brand Appart stacked cards), `who's it for.mp4` (adicolor), `how it works or who is it for.mp4` (furniture slider), `keep for another page.mp4` (uiuxzaid loader), `entire landing page.mp4` (Pallet Ross). Some earlier references were removed from the folder.

## 1. The idea: The Gathering

The logo is a ring of 8 dots around an orange centre: a crowd gathered around a business. That ring is the one motif the whole product is built from. When a screen needs a visual, reach for the ring before anything else.

| Where | How the ring appears |
| --- | --- |
| Homepage hero | The shop owner at the centre, creator posts in an arc around her |
| Loader | The 8 dots fill clockwise as the page loads |
| Campaign progress | One dot per creator spot; a dot turns green when that creator has posted |
| Join window (creator app) | The 24-hour countdown drawn as a ring |
| Dashboard overview | A slowly turning cylinder of report cards (desktop only) |
| Empty and success states | The ring, empty or full |

## 2. Colour

Base tokens are in `CLAUDE.md` and `src/app/globals.css`. On top of them, the **creative gradients**, all from the warm family:

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| Ember | `linear-gradient(135deg, #FF8A3D, #FF6A1A 55%, #F2541E)` | `linear-gradient(135deg, #FF9A52, #FF7A33)` | Primary buttons. Text stays dark ink `#14161A` |
| Glow | Soft radial blend of `#FF6A1A`, amber `#FFB547` and coral `#FF8F7A` over the page colour, with fine grain | The same blend at lower strength over `#0F1114`, so it reads as embers | Hero and closing backgrounds, the hero's centre disc |
| Dusk | `linear-gradient(160deg, #14161A, #2A1A12)` | `linear-gradient(160deg, #181B20, #2A1A12)` | Dark feature panels, case-study cards |
| Category tints | Coral (salons), amber (food), plum (fashion), teal (gadgets) | Same hues, darker | Only inside the "Who it's for" slider panels |

Rules:

- Marketing pages may use Ember and Glow freely, past the usual 10% orange. Inside the apps, orange stays around 10%.
- Category tints decorate pictures. They never carry meaning in the UI.
- Green is still only verified, paid and posted.
- In dark mode, shadows become soft orange glows.

## 3. Type

- **Outfit** for headings: big, tight tracking (about -0.03em), sentence case.
- **Figtree** for body text.
- **IBM Plex Mono** for money, view counts and figures only.
- Hand-drawn notes and arrows (as in Brandlyft `007f`) are SVG drawings, not another font.
- Avoid: a coloured accent word inside a headline, all-caps labels above every heading, serif headlines.

## 4. Shape and surfaces

- Large soft corner radii: 24–32px on cards and panels, pills for buttons and chips.
- Floating chips carry small facts: `@handle`, `+2,140 views`, `Posted ✓`.
- Vary the surfaces: chips, phone frames, report cards, cut-out figures. Don't chop pages into rows of identical cards.

## 5. Motion

- One load moment per page.
- Scroll-driven reveals for storytelling sections.
- Endless loops only for marquees, the report cylinder and the hero ripples, and they pause off-screen.
- Animate `transform` and `opacity` only.
- Respect `prefers-reduced-motion`: show the final state, stop loops.

## 6. Imagery: 3D cinematic Nigerians

People are 3D animated-film characters, never photos, and never presented as real customers or testimonials. Render them as cut-outs (transparent PNG) so one file works in light and dark mode. A figure may break out of its frame (VYBE `dc81`), usually out of the orange centre disc.

**Style lock** — start every image prompt with this so the set matches:

> 3D animated feature-film still, stylised but grounded proportions, soft subsurface skin, warm cinematic studio light with a safety-orange (#FF6A1A) rim light, clean seamless off-white background, high-detail fabric, natural joyful expressions, contemporary Nigerian people from Akwa Ibom, no text, no logos

Cast:

1. **Hero: the food-shop owner.** Nigerian woman in her 40s who owns a small food spot in Uyo, colourful ankara apron over a white blouse, simple head tie, standing behind a wooden counter with a steaming pot, arms folded, proud warm smile at camera, waist-up, centred, room above her head, 4:5.
2. **Creators** (one image each, same character reference): a 23-year-old man filming himself on a phone on a mini tripod, bucket hat; a young woman with braids recording in front of a salon; a student holding a phone up, laughing, recording a review.
3. **Agent:** friendly Nigerian field agent in a safety-orange hi-vis vest with a small dot-ring patch, holding a tablet, mid-stride.
4. **Slider categories:** stylist braiding a client's hair; steaming bowl of afang soup on a wooden counter; boutique dress on a mannequin; phone repair technician at a small stall.

Generate with Midjourney v7, Flux or Ideogram using a character reference for consistent faces. Export transparent PNGs at 2048px; the site uses compressed AVIF.

### Hero video

The hero shop owner, animated subtly inside the orange centre disc. Details are in section 10.

## 7. Loader

From uiuxzaid `2a5f`:

1. A skeleton of the page appears at once, in the exact layout of what is coming.
2. Over it, the logo's 8 dots fill clockwise with a mono percentage.
3. At 100% the dots fly outward into the hero arc.

Rules: first visit in a session only, tied to real loading (never a fake delay). In the apps, use skeleton screens only.

## 8. Homepage

**Audience:** business owners. Creators are easy to recruit, so every section works toward one action: start a campaign.

**Rules:**

- Show value, not price. No budgets or naira amounts anywhere on the homepage. Prices live on the calculator and in the campaign builder.
- No WhatsApp-invite or join-window mechanics; those are creator details.
- Example numbers (views, chats) are allowed only when labelled as an example.
- No creator top bar on the homepage. Creators reach their page from the nav and section 7.

| # | Section | References | What it is |
| --- | --- | --- | --- |
| 0 | Loader | `2a5f` | See section 7 |
| 1 | Hero (built 2026-11-03) | Content Rewards globe, Indigo rosette (`hero circle pictures.mp4`), AnimateIT motion (`have this kind of motion for the hero section.mp4`), Hypesonic (`keep this for hero.jpg`) | "Be the business everyone's talking about." and **Start a campaign** (logo mark in a dark circle). Below: **The Gathering Globe** (`GatheringGlobe.tsx`). The shop owner's full 10s clip loops in the orange disc at the sphere's middle depth (desktop; still image on phones). Around her, 18 unique creator posts styled after the platforms we track (TikTok, Instagram Reels and text posts, Facebook feed and video posts), each carrying that platform's own "Paid partnership" label naming the business; they pass in front of and behind her as the globe turns. A faint dotted world map (Natural Earth land, `src/lib/landDots.ts`) and graticule sit on the sphere, Africa facing the viewer at rest. No loop: posts burst out on first paint (CSS), one small turn, then rest with her face clear (rest angle searched offline). Leans toward the mouse, drags and swipes with momentum (sideways swipe on phones), turns slightly on scroll. Isolated stacking context so it always sits under the navbar. No 3D library; the frame loop sleeps when nothing moves. To add creators: one image pair in `public/hero/cards/` plus one line in `POSTS` |
| 2 | The problem (rebuilt 2026-11-04) | `how it works or who is it for.mp4` (one card, changing states) | `Problem.tsx`. Inside a **sand** panel (`.bg-sand`: the founder's `#261D18` at 3%, a faint warm lift in dark mode), "You're great at your business. Getting seen is a second full-time job." One white card moves through four states about the owner's reality, not about ads failing: **No time** (plum, phone with a ghost; a day's checklist ending "Post on TikTok, Instagram and Facebook: Not today"), **Know-how** (coral, megaphone; targeting, algorithms, video: "To learn"), **Rising costs** (amber, shrinking naira note; ₦463 → ₦1,333 to the dollar, 2.9×), **Guesswork** (teal, map pin; flyers, radio, boosted post: "Can't tell"). Each state: a tinted blob with a big white title and the founder's 3D object breaking out of it (`public/hero/problem/`, keyed with soft shadows and translucency kept; tall objects run smaller so they never reach the title), and on the right a lead line and three rows. Sources sit behind an ⓘ (`SourceNote.tsx`). Titles slide sideways, objects fly in and out with blur, two small spheres drift. Plays once through on screen (5s per state, the tab's progress line is the timer), rests on the last; hover pauses, tabs and the arrow take over. Swipe on phones; no autoplay with reduced motion. These pains are the founder's working hypotheses until interviews with business owners confirm or change them |
| 2b | The turn (rebuilt 2026-11-04) | Content Rewards "The best by design" bento | `TheTurn.tsx`. "Ads get you seen. Recommendations get you chosen." We sit beside ads, never against them. Four sand tiles: **One is an ad, one is someone they follow** (a designed "Sponsored" product ad beside real footage of a person talking to camera: the licensed `talk` sample clip, labelled "Sample footage", with no brand, handle or invented comments because stock licences forbid implied endorsement; plays on desktop in view, tap on phones; founding creators' real posts replace it), **Who people trust** (83% vs 48% bars), **Their trust is real, their pay isn't** (TikTok reach, Creator Rewards not open in Nigeria), **We connect the two** (the logo's ring of creators assembling; link to How it works). Sources behind ⓘ. Each tile animates once in view |
| 3 | How it works: the solution (rebuilt 2026-11-04) | Lagunitas `6fc0`, 3D ball `b53c`, Brand Appart `3135` | `HowItWorks.tsx`. "You tell us about your business. Creators do the talking." Four steps (Brief, Gather, Post, Report) shown on the **real business app**: a film recorded frame by frame from `/demo/film` (`public/hero/film/app.{mp4,webm}`, about 1.1MB, 19s). Desktop: a 3D hand holds the phone while the steps scroll; reaching a step plays that step's part of the film and holds on its last frame (parts in `FILM_STEPS`, in step with `SCENES` in the film page); the film is fetched once the page settles, desktop only, never on Data Saver; giant step word behind; orange dot on a rail. Phones and fallbacks: one still per step from the film. To change the film: edit `/demo/film`, re-record (scratchpad `film.mjs`), re-encode, re-cut the stills |
| 4 | Real posts (rebuilt 2026-11-03) | Brandlyft (`hero.mp4`), corridor (`real posts II.mp4`) considered and declined: angled walls hide the faces this section exists to show | "Real creators. Real posts." centred, medium weight. 12 real 9:16 videos (`public/hero/clips/`, 4–6s, 360x640, about 60–280KB each) with no fake platform chrome. The section holds while page scrolling moves the strip through every video once (no loop, no edge gaps), with a thin progress bar. Desktop: centre flat, sides recede slightly, the strip leans toward the mouse, the videos nearest the centre play. Phones: stills with a play button, tap to play (no autoplay on phones or Data Saver). Reduced motion or no script: a plain swipeable strip. Data: `src/lib/realPosts.ts`. Today: licensed Pexels/Mixkit sample clips, labelled "Sample footage", with no creator names or businesses (their licences forbid implied endorsement). Founding creators' videos, with written permission, replace them one by one and add `creator` (handle, platform, avatar) and `business` |
| 5 | The guarantee (built 2026-11-03) | Content Rewards verification layer | `Guarantee.tsx`. "Real views from real people. Or you don't pay for them." Opens with the influencer pain (one story, no report, no proof; over half of Instagram influencers used fake engagement, HypeAuditor 2021, behind ⓘ). Warm panel (cream to orange), four stages: Creator checked → Post matched → Views checked → Verified report. Four promises below: you only pay for verified views · cheaters lose the spot and the money · unfilled spots come back as credit (refund on request) · you see every post. Every check named is a promise ops must keep from day one. Creator payout dates are not shown on marketing pages; they live in the creator dashboard |
| 6 | Who it's for (built 2026-11-03) | adicolor `048d`, headphones `8621`, puffer `c27e` | `WhoItsFor.tsx`. "Built for businesses people talk about." Six expanding panels in category tints (food, beauty, fashion, gadgets, health, fitness; images in `public/hero/who/`), each with what a campaign does for that kind of business (no figures). Phones: swipe row. Below: pay in naira · start small · count walk-ins · help setting up. Replaces the separate "Your report" section, whose job moved into How it works and the guarantee |
| — | Results (held back) | Calendly `20e1` | Returns only with real results: Experiment #1 (one real shop, a funded campaign, filmed) and founding-cohort numbers. Never faked for a demo |
| 7 | Creators and agents (built 2026-11-03) | Pallet Ross `a1ea`, Patta `eef9` | Dark creators card with founding creators' faces scattered around "Your audience trusts you. Get paid for it."; agents card beside it. Links to /creators and /agents |
| 8 | FAQ and closing (built 2026-11-03) | — | Six questions business owners ask; closing Ember panel "Get your brand talked about this week." with a dark **Start a campaign** button |

## 9. Other pages

| Page | Built from |
| --- | --- |
| For creators | Patta curved strip `eef9`, relab creator chips `3f91`, monthly top creators as polaroids on a string (Astro `ee49`), Market Rewards explainer |
| Become an agent | 3D agent in a hi-vis vest breaking out of the disc, commission calculator |
| Calculator | Background warms as the budget grows (puffer `c27e`); the ring fills dot by dot. Prices belong here |
| Leaderboard | Polaroids on a string, podium cards |
| Case studies | Calendly carousel `20e1`, Indigo-style burst of posts `bca7` titled "Every view counted" |
| Business app | Report cylinder on the overview (desktop), ring progress for spots, skeletons; otherwise calm and data-first |
| Creator app | Join-window ring, draw tickets as a stacked-card pile `3135`, wallet in mono |
| Agent app | Plain, big tap targets, built for outdoors |
| Ops console | Dense and plain; no effects |

## 10. Performance budget

- The first view of any page stays under 300KB, including one hero image of about 80KB (AVIF, with a WebP fallback).
- Everything below the first view loads as the visitor scrolls.
- **Hero video:** desktop only, and never when Data Saver is on or `navigator.connection.saveData` is true. Phones and slow connections get the still poster.
  - 5–6 seconds, seamless loop, muted, `playsinline`, no audio track.
  - Square 1080×1080 master, delivered at 720×720 as AV1/WebM with an H.264 MP4 fallback, about 1MB or less.
  - Starts after the page has loaded (on idle), pauses off-screen, shows the poster frame under `prefers-reduced-motion`.
  - It plays inside the circular orange disc, so its background must be the flat orange-to-amber gradient: then it fits light and dark mode alike.
  - Creator cards, chips and all text stay as HTML on top of the video, never baked into it.

## 9. The business app (built 2026-11-04)

Demo with made-up data at `/demo/business` (`src/app/(business)/demo/business`, data in `src/lib/demo/adiaha.ts`); the real app reuses these screens behind login. Layout after contentrewards.com's dashboard; everything else is ours.

- **Signature: the Gathering ring.** A campaign is drawn as the logo's ring, one dot per creator spot around the business, filling open → joined → posted (amber) → verified (green tick). Big with faces on Home and Creators (`GatheringRing`); bare, eight dots, in lists (`MiniRing`); in the builder, the budget becomes dots as you drag. Spend boldness there; keep everything else quiet.
- **Navigation.** Phones: slim top bar (business switcher, updates) and a floating dark dock at the thumb, TikTok/Instagram style: Home · Campaigns · **＋ Start a campaign** (raised, orange) · Results · Me. Desktop: left sidebar with the switcher, the same four places, the one orange action, and the wallet.
- **Plain words, one question per screen.** Home "How am I doing?", Posts "Who posted?", Creators "Who joined?", Report "Who came?". No CPM, no submissions. Owners never approve or block posts; they can flag one ("Something wrong with this post?"). Our ops team does the checking.
- **Look.** Light by default (page `#F7F7F5`, white sheets, hairline rings), dark mode through the tokens. Grouped lists instead of grids of identical stat cards; radii by hierarchy (sheets 28px, lists 20px, chips round). Orange only on the main action; green only for verified/paid; amber for checking; red for removed. Numbers in Plex Mono.
- **Motion.** Press feedback on everything (scale 0.97, 160ms); the live dot breathes; builder steps settle in; nothing else moves on its own.
- **Screens built:** Home, Campaigns, Campaign › Posts / Creators / Report, New campaign (Your business, Budget, Where, Pay), Results (with the counter-code tool for walk-ins), Me (wallet, credit, receipts, settings).

