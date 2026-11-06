# Visibility Campaigns — project brief

Read this first. It records the business decisions made on 2026-10-30, before any build work. The business plan and product concept linked below go into more detail. Where they still say "Hundredfold" or "Sayso", treat that as **Visibility Campaigns**. The model in the plan (70/30 split, lottery, monthly payouts) is current.

- Business plan (Claude Doc): https://claude.ai/artifact/6riL1wGsrZrpUB53T1YCKn
- Product concept (screens, working calculator): https://claude.ai/artifact/DtkK4YKFk3RG4HoZq5brsN

## Name (final, do not reopen)

- **Visibility Campaigns** is the product and brand, at visibilitycampaigns.com. It runs as a brand under a parent company whose name has not been chosen yet.
- "Market Rewards" is the name of the creator earnings programme.
- Earlier names (Hundredfold, Sayso, Kinsay, Pleyo) are all dropped.

## What the business is

- **Problem:** small businesses can't afford to be talked about by people their customers trust. Ads reach strangers and need dollar cards, and influencers cost too much. Meanwhile thousands of everyday creators have trusted audiences and no way to earn from them.
- **Solution:** a business sets a budget from ₦5,000. Verified local creators post about it in their own words. Creators are paid fairly for the real views they bring. The business gets a report of every post, view, click and WhatsApp chat.
- **Three sides of the marketplace:**
  - businesses pay
  - creators earn
  - Visibility Agents (a Moniepoint-style field network) bring businesses in and earn commission
- **Starting market:** Uyo and Ikot Ekpene, Akwa Ibom, Nigeria. Win one city at a time.

## The model (current)

- **Split:** 70% of every budget goes to creators and 30% to us. In year one, a founding-creator pool of 5% of the budget is paid out of our 30%.
- **Verified campaigns:** only verified creators can join, and the number of spots is fixed.
  - Spots ≈ budget × 70% ÷ ₦1,750.
  - 30% of the creator money is shared equally among verified posts, and 70% is shared by verified views.
- **Open campaigns:** anyone can join, verified or not.
  - The business pays ₦1,000 per 1,000 verified views, and the creator gets ₦700 of that.
  - A post earns nothing under 1,000 views and nothing past 5,000 views.
  - The campaign closes when the budget is used up.
- **Who gets a spot:**
  - Every eligible creator is invited on WhatsApp and has a 24-hour join window. It is not first-come.
  - If more creators join than there are spots, a weighted lottery decides. Everyone gets 1 ticket, plus 1 for strong views per post and plus 1 if they haven't had a paid campaign in 30 days.
  - 3 standbys are drawn, and one replaces any creator who doesn't post.
  - A business may re-invite its own top performers for up to 20% of the spots.
- **Verification:** done separately for each platform.
  - At least 1,000 followers and 5,000 views in the last 30 days on that platform.
  - The account is at least 3 months old, with 8 or more posts in 30 days.
  - The creator completes a qualifying practice campaign.
  - ID and bank account name must match.
  - Founding cohort threshold: 500 followers and 2,500 views.
- **Payouts:**
  - Monthly, on the 5th. The minimum payout is ₦5,000, and smaller balances roll over.
  - Businesses pay upfront, and the creator money is held in a separate account.
- **Agents:** earn 20% of our fee (6% of the budget) for 6 months on each business they bring in, plus ₦1,000 on that business's first campaign.
- **Group Spotlight:** 5 shops pay ₦5,000 each, and 10 creators each post one roundup featuring all five.
- **Rules:**
  - Each creator gets a brief, never a script, and posts carry the paid-partnership label.
  - No Ponzi schemes, unlicensed loan apps, betting or partisan politics.
- **Guarantee (decided 2026-11-03):** businesses only pay for verified views. A creator caught faking views is removed and not paid, and a standby takes the spot. If no standby can post, that money becomes credit for the business's next campaign, or a refund on request. Creator payout dates are shown in the creator dashboard, not on marketing pages.
- **Leaderboards:** one per campaign (views per post) and a monthly overall board.
- **Core channels (decided 2026-11-03):** TikTok, Instagram and Facebook, the platforms where we can verify views. YouTube Shorts may follow. WhatsApp Status is dropped for now because its views can't be tracked.
- **Our own media pages** are a training lab, not the moat.

## Brand and voice

- **Voice:** plain Nigerian English, with Pidgin where it fits. No hype, and no claims without numbers behind them.
- **Language (decided 2026-11-03):** our own headlines, body copy and buttons are clear English. Pidgin appears only when real people speak: quotes from business owners and creators, and creators' post captions.
- **Positioning (decided 2026-11-04):** we add to ads, we don't replace them. "Ads get you seen. Recommendations get you chosen." Never call ads broken or useless.
- **Imagery rule (decided 2026-11-04):** 3D renders for metaphors (objects, the hero globe, the app mockups); real footage for proof (what a creator post looks like). Stock footage never shows a person endorsing a named brand, and carries no invented comments.
- **Section links (decided 2026-11-04):** links to a section on the same page glide there and the heading rises in on arrival (`SectionLinks.tsx`).
- **Homepage story (decided 2026-11-03):** promise → problem → solution → proof → guarantee, modelled on contentrewards.com. Hit the real pain of businesses and creators, with sourced numbers and, later, real interview quotes. Never invent quotes or results.
### Logo (final, 2026-10-31)

The logo is called "The Gathering". It is a ring of 8 dots around a solid orange centre dot, like a crowd gathered around a business. The wordmark sits to the right, stacked in two lines: "Visibility" above "Campaigns".

The official files are the v2 set, rebuilt on 2026-10-31 from one geometric master. The dots sit on a true circle and the wordmark is Outfit Bold, converted to outlines. Everything is in `public/logo/v2/`:

| File | Use |
| --- | --- |
| `visibility-campaigns-logo-light.svg` | **Main logo for light backgrounds** (ink dots and text, orange centre) |
| `visibility-campaigns-logo-dark.svg` | **Main logo for dark backgrounds** (white dots and text, orange centre) |
| `visibility-campaigns-icon-light.svg` / `-icon-dark.svg` | Icon only, transparent background (navbar on small screens, favicons) |
| `visibility-campaigns-app-icon-light.svg` / `-app-icon-dark.svg` (+ `.png`, 1024px) | Rounded-square app tile (PWA icon, social avatars) |
| `visibility-campaigns-logo-black.svg` / `-logo-white.svg` | Single-colour versions (print, partner placements) |

- Swap the light and dark logos by theme.
- The older files directly in `public/logo/` are the original traced versions. Keep them only as backup and don't use them in the UI.
- Never stretch, recolour or add effects to the logo.
- The build script that generates the set lives outside the repo. To change the geometry, ask Claude to rebuild it, rather than hand-editing the paths.

### Colours (final, light and dark mode)

The primary colour is safety orange, the colour designed to be seen.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| signal (primary) | `#FF6A1A` | `#FF7A33` | Main buttons, logo, key highlights. Keep it to about 10% of any screen |
| ink (text) | `#14161A` | `#F2F3F5` | Headings, body text |
| muted | `#5E6470` | `#9AA1AD` | Labels, captions |
| background | `#F7F7F5` | `#0F1114` | Page |
| surface | `#FFFFFF` | `#181B20` | Cards, panels, forms |
| line | `#E3E4E8` | `#2A2E35` | Borders, dividers |
| verified (success) | `#0E8A6A` | `#2BC59A` | Verified badges, paid, posted |
| warning | `#B7791F` | `#F0B43C` | Pending, deadlines |
| error | `#C53030` | `#F07167` | Failed, rejected, fraud flags |

Colour rules:

- Orange buttons take dark ink text (`#14161A`), not white, because white on orange is hard to read.
- Orange is only for actions and attention.
- Green always means verified or paid, and nothing else.
- Support light and dark mode through CSS tokens.
- Creative gradients (decided 2026-11-02): marketing pages may use the warm gradient tokens in `DESIGN.md` (Ember on buttons, Glow on hero and closing backgrounds), which can take orange past 10% of the screen. Inside the apps, keep orange to about 10%.

### Design system and imagery (decided 2026-11-02)

`DESIGN.md` is the source of truth for the look of every page and app: the ring motif, gradients, motion, the loader, the landing page sections and the image prompts. Read it before designing or building any screen.

- People in imagery are 3D cinematic characters, not photos, and are never presented as real customers.
- The homepage is for businesses and shows value, not prices. Don't show budgets or naira amounts on it. Prices live on the calculator and in the campaign builder.

### Asset folders (decided 2026-11-04)

- `public/` holds only what the site serves: `public/hero/` (web-ready images and video), `public/logo/`, `public/demo/`.
- Originals live in `design-sources/` (not deployed, not in git, back it up to a drive): `landing/` (the founder's 3D renders, `pexels/` stock originals), `ìnspo/` (Pinterest references).
- Every web asset is cut and encoded from an original; never serve originals. Record each stock asset's source link (see `src/lib/realPosts.ts` and `public/hero/SOURCES.md` when it exists).

### Type

The logo wordmark is set in **Outfit Bold**. For the UI, use Outfit for headings so the site matches the logo. Pick a readable companion for body text, for example Figtree or Inter at body sizes. Use a monospace face, such as IBM Plex Mono, for numbers and money.
- **Build for cheap Android phones on expensive data:** the first view of any page stays under 300KB (one hero image of about 80KB allowed), everything below it loads as the visitor scrolls, video plays only on desktop and never on Data Saver, mobile web app (not a native app), WhatsApp as the notification layer.

## Pages needed

- **Public site:**
  - Home (for businesses)
  - For creators (waitlist and cohorts)
  - Become an agent
  - Calculator
  - Reports / case studies
  - Leaderboard
- **Apps:**
  - business app (campaign builder, live tracker, reports, billing)
  - creator app (per-platform verification, campaigns, join window and tickets, proof upload, wallet, Academy)
  - agent app
  - ops console (brief checks, lottery audit, proof review, verification queue, monthly payout run needing two approvers)

## Stack

The existing code is Next.js 16, React 19, Tailwind 4, Supabase, Paystack and Resend. It came from the earlier "Visible" prototype. Reuse the stack, but rebuild the screens to this brief, not to the old screens.
