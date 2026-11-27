# Visibility Campaigns — project brief

Read this first. It records the business decisions in force. The business plan and product concept linked below go into more detail but are partly out of date: where they say "Hundredfold" or "Sayso", read **Visibility Campaigns**, and their 70/30 split and lottery are replaced by the model below.

- **Decision Log (Claude Doc, read on any device):** https://claude.ai/artifact/AjdFSygTzVCV1pGiMmXVC2 — current rules, dated decision history, open decisions, build status.
- Launch Toolkit (Claude Doc): https://claude.ai/artifact/14XDDf9UCbDhXBV8dztdnD
- Business plan (Claude Doc): https://claude.ai/artifact/6riL1wGsrZrpUB53T1YCKn
- Product concept (screens, working calculator): https://claude.ai/artifact/DtkK4YKFk3RG4HoZq5brsN

## Logging decisions (rule, decided 2026-11-23)

Every critical business, product, pricing or marketing decision is logged in the same session, in two places:

1. this file, in the section it belongs to, dated, with what it replaces;
2. the Decision Log doc: a dated row in Decision history, and Current rules updated.

Anything not yet decided goes under Open decisions in the doc, never into this file as a rule. If this file and the doc disagree, the newer dated entry wins; fix the other.

## Name (final, do not reopen)

- **Visibility Campaigns** is the product and brand, at visibilitycampaigns.com. It runs as a brand under a parent company whose name has not been chosen yet.
- "Market Rewards" is the name of the creator earnings programme.
- Earlier names (Hundredfold, Sayso, Kinsay, Pleyo) are all dropped.

## What the business is

- **Problem:** small businesses can't afford to be talked about by people their customers trust. Ads reach strangers and need dollar cards, and influencers cost too much. Meanwhile thousands of everyday creators have trusted audiences and no way to earn from them.
- **What we sell:** paid word of mouth that is measured. We guarantee the posts and measure views, clicks, WhatsApp chats and promo-code uses. We never promise leads or sales.
- **Solution:** a business sets a budget from ₦15,000. Verified local creators post about it in their own words. Creators are paid fairly for the real views they bring. The business gets a report of every post, view, click and WhatsApp chat.
- **Three sides of the marketplace:**
  - businesses pay
  - creators earn
  - Visibility Agents (a Moniepoint-style field network) bring businesses in and earn commission
- **Starting market:** Uyo and Ikot Ekpene, Akwa Ibom, Nigeria. Win one city at a time.

## The model (current)

- **Fees (decided 2026-11-22, fee level 2026-11-23; replaces the 70/30 split and the 5% founding pool):**
  - The platform fee is added **on top** of the brand's budget: a **10% launch fee until 31 January 2027, then 20%**. A ₦30,000 budget costs the brand ₦33,000 now (₦36,000 from February).
  - Creators pay no fee and keep 100% of what they earn.
- **Minimum budget (decided 2026-11-22):** Open ₦15,000, Verified ₦30,000. Review after the first 20 campaigns.
- **How the budget pays creators (decided 2026-11-22):**
  - **Verified:** 30% of the budget pays per post and 70% pays per performance (views). Spots = 30% of budget ÷ per-post rate.
  - **Open:** performance only, no per-post pay.
  - **Per-post rate (verified):** the brand sets it; floor ₦300, suggested default ₦500.
  - **Rate per 1,000 views (decided 2026-11-24, replaces one ₦700 floor for both):** the brand sets it. **Verified: floor ₦700. Open: ₦400** (floor and suggestion, set later on 2026-11-24 as the middle of ₦300–₦500), because open posts come from smaller, unverified creators.
  - **View floor and maximum view payout (decided 2026-11-24, D1):** open posts earn nothing under 1,000 views; verified posts are paid from the first view (D5). Every campaign has a **maximum view payout per post** in naira, set by the brand, defaulting to 5,000 views' worth (rate × 5). A post that goes past it still earns only the maximum: at ₦1,000 per 1,000 views and a ₦5,000 maximum, a 10,000-view post earns ₦5,000.
  - **If views would pay out more than the view share (D3):** everyone's view pay on that campaign is reduced by the same percentage, so the brand never pays more than its budget. Open campaigns stop taking new posts once expected earnings fill the share.
  - **When creators are paid (D4):** the post fee is earned at day 7; view pay becomes final when the campaign closes (end date or budget used). Everything earned by the last day of a month is paid on the 5th of the next month.
  - **Paystack's charge (D2):** we pay it from our fee; the brand pays budget + fee only. **The fee is shown as its own line (D6):** "Budget · Launch fee (10%) · You pay".
  - **Post fee unlocks** when the post is approved and still live 7 days later. No view floor (decided 2026-11-23). A post with almost no views is flagged for review.
  - Campaign posts stay live for 30 days.
- **Campaign length (decided 2026-11-22):** the brand sets an end date, 7 to 30 days. Views count up to 14 days after each post. A campaign also ends when its budget runs out.
- **Unspent budget (decided 2026-11-22):** becomes campaign credit, or a refund on request.
- **Campaign builder (decided 2026-11-18, still current):** a brand creates an **Open** or **Verified** campaign in a stepped builder (`/order/new`): name (80 chars), brief (500 chars, a brief not a script), optional banner, optional reference links (up to 3), platforms, languages, audience, start date. Content type and content description are dropped; the brief carries the message.
  - **How customers reach you (decided 2026-11-25, required on new campaigns):** WhatsApp number (default), social page, website or shop address, stored cleaned in `tasks.contact_type` / `contact_value` (`src/lib/campaignContact.ts`). Creators put it in their posts; later each creator gets a tracked link to it, to count clicks and WhatsApp chats.
  - **Built 2026-11-24 (Phase A of `docs/plans/pricing-and-pay.md`):** the builder's "Budget and pay" step, end dates, the fee at checkout, the server check and save (pricing version 2, rules in `src/lib/pricing.ts`), and the new pay on admin, creator and business screens. **Not built yet:** earning in stages (day-7 post fee, day-14 views, closing share-out, credit) and monthly payouts without the withdrawal fee, which are Phases B and C of that plan. Version-2 posts can't be paid until Phase B. Build one step at a time and update the plan as each step lands.
- **Who gets a spot (decided 2026-11-23, replaces first come, first served from 2026-11-18):**
  - Creators **join** a campaign before posting. Open: anyone joins. Verified: only verified creators (an admin marks them in `/admin/creators` until per-platform verification is built).
  - Verified campaigns have a **24-hour join window**. If more join than there are spots, 80% of spots go by creator score and 20% by random draw among newer creators.
  - **How standby works is still open** (Decision Log → Open decisions). Until it's decided, the built standby list stays: when someone leaves or is removed, the next creator moves up and is notified.
  - The app is still first come, first served until the window is built.
  - When a verified campaign starts, every verified creator is notified in the app and by email (daily job `/api/cron/campaign-starts`).
- **Campaign review (decided 2026-11-24 by the founder, replaces admin review from 2026-11-19):** there is no admin review before a campaign goes live. The brand reviews their own campaign in the builder's Review step, confirms it follows our rules, and pays; the campaign is then live, shown to creators from its start date (verified creators are still told when it starts). **Not built yet:** the app still starts paid campaigns as In review for an admin (`pending_review`, `/admin/campaigns`). How we deal with a live campaign that breaks the rules is open (Decision Log → Open decisions; recommended: admins can pause or take it down, with a refund of what's unspent).
- **Verification:** done separately for each platform.
  - At least 1,000 followers and 5,000 views in the last 30 days on that platform.
  - The account is at least 3 months old, with 8 or more posts in 30 days.
  - The creator completes a qualifying practice campaign.
  - ID and bank account name must match.
  - Founding cohort threshold: 500 followers and 2,500 views.
- **Payouts:**
  - Monthly, on the 5th. The minimum payout is **₦1,000 until 31 January 2027** (decided 2026-11-23), then ₦5,000. Smaller balances roll over.
  - Businesses pay upfront, and the creator money is held in a separate account.
  - **Not yet built to these rules:** the app still lets creators withdraw any time from ₦500 and takes a 10% withdrawal fee (`src/lib/withdrawals.ts`, `request_withdrawal`). That fee breaks "creators keep 100%" and must go.
- **Agents:** the old pay (20% of our fee for 6 months) no longer works with a 10% fee. New agent pay is an open decision (recommended: a flat ₦1,000 per business whose first campaign is paid, plus ₦2,000 at 5 businesses).
- **Group Spotlight:** 5 shops share one campaign. Open decision whether to pause it during launch (recommended: pause until 10 single campaigns have run).
- **Rules:**
  - Each creator gets a brief, never a script, and posts carry the paid-partnership label.
  - No Ponzi schemes, unlicensed loan apps, betting or partisan politics.
- **Guarantee (decided 2026-11-03):** businesses only pay for verified views. A creator caught faking views is removed and not paid, and a standby takes the spot. If no standby can post, that money becomes credit for the business's next campaign, or a refund on request. Creator payout dates are shown in the creator dashboard, not on marketing pages.
- **Leaderboards:** one per campaign (views per post) and a monthly overall board.
- **Tracking links (decided 2026-11-23):** one link per place we post, made in `/admin/links`: `visibilitycampaigns.com/r/<slug>`.
  - The slug is a 5-character short code by default (no 0/o, 1/l/i), or a custom word of up to 20 characters for print. It never changes once made; the name, channel and message can. Links are archived, never deleted, and archived links keep working.
  - Creator links open sign-up; business links open the homepage. Each link carries a message sent with every share: the phone's share menu, buttons for each platform, and copy for Instagram and TikTok.
  - We count people, not taps, and filter out link-preview bots. Steps: opened, stayed (15 seconds, scrolled halfway or used a form), tapped sign up or start, signed up, then real records (joined a campaign, posted, approved; paid for a campaign). The most recent link within 30 days gets the sign-up.
  - No IP addresses or personal details before sign-up. Code: `src/lib/trackingLinks.ts`, `src/app/r/[slug]/route.ts`, `src/components/LinkTracker.tsx`, migration `20261123000000_tracking_links.sql`.
- **Core channels (decided 2026-11-03, extended 2026-11-18):** Facebook, Instagram, TikTok, YouTube Shorts and YouTube (long videos). WhatsApp Status is dropped for now because its views can't be tracked.
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
- Creative gradients (decided 2026-11-02): marketing pages may use the warm gradient tokens in `DESIGN.md` (Glow on hero and closing backgrounds; buttons are flat solid colours with no shadow, decided 2026-11-13), which can take orange past 10% of the screen. Inside the apps, keep orange to about 10%.

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
  - Become an agent (off the website for now, decided 2026-11-13; agents stay in the business model and return as a page if needed)
  - Calculator
  - Reports / case studies
  - Leaderboard
- **Apps:**
  - business app (campaign builder, live tracker, reports, billing)
  - creator app (per-platform verification, campaigns, join window and tickets, proof upload, wallet, Academy)
  - agent app
  - ops console (live campaign oversight, lottery audit, proof review, verification queue, monthly payout run needing two approvers)

## Creator launch build, tier 1 (started 2026-11-27)

The tier-1 rows of "Code to build before the creator launch" in the Launch & Adoption Plan (https://claude.ai/artifact/Mt8btCtYWDf3Zaoh7bfRJn), built one at a time on branch `launch/tier-1`.

1. **Auth emails through Resend, from visibilitycampaigns.online.** Code done: the sign-up email (`supabase/templates/confirm-signup.html`) carries an 8-digit code and a button to `/auth/confirm` (`src/app/auth/confirm/route.ts`), which signs the person in and opens `/welcome`. **The founder still has to** verify the domain in Resend and switch Supabase Auth to Resend's SMTP: steps in `docs/setup/auth-email.md`. Until then Supabase's test mailer sends only a few emails an hour.
2. **Signed in straight after sign-up.** Sign-up is one screen in two steps (`/register`): name, email and password, then "Check your inbox" with the emailed code, a resend button (60 s wait) and "Change it". The right code confirms the email, signs the person in and opens `/welcome`, so nobody signs in twice. The step survives a reload (`src/lib/pendingSignup.ts`), and signing in with an unconfirmed email sends a new code and reopens it. The username moved out of sign-up into onboarding. `signup_ref` and `signup_visitor` still go in the sign-up metadata (tested: the profile gets its `signup_link_id`). Supabase sends **8-digit** codes on this project; `CODE_LENGTH` must match the dashboard setting.
3. **Creator onboarding** (`/welcome`, full-screen): handle, city (Akwa Ibom towns first, or any town and state), and the platforms they post on (TikTok, Instagram, Facebook, YouTube) with a profile link or username each. Saved by `save_creator_onboarding()` (migration `20261127000000_creator_onboarding.sql`): the handle is `profiles.username`, now unique whatever the capitals; `profiles.city`, `state` and `onboarded_at`; one `creator_platforms` row per platform, where per-platform verification will attach later. Rules in `src/lib/creatorProfile.ts` (tests: `pnpm test:creator`). Admins see the city and a link to each profile in `/admin/creators`. Sign-in sends creators who haven't finished it back to `/welcome`; "Start a campaign instead" marks the account as a business (`account_type` in metadata) and opens the builder. The handle map in the account metadata (`social_accounts`) is still written for the screens that read it.
4. **Captcha: Cloudflare Turnstile through Supabase Auth.** `src/components/auth/Turnstile.tsx` (`useCaptcha` + `<Captcha />`) sits on sign-up, sign-in and "Send a new code", because Supabase checks all three once captcha is on. It is invisible unless Cloudflare wants a tap, and takes a fresh token after every attempt. Off until `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set. **The founder still has to** make the widget and switch it on, in the order in `docs/setup/captcha.md` (site key live first, then Supabase), or nobody can sign in. Signing in unconfirmed now reopens the code step with "Send a new code" ready instead of sending one itself.

## Future updates (logged, not yet scheduled)

### Registration and onboarding, for businesses and creators (logged 2026-11-24 at the founder's request)

The founder said they are not happy with the current sign-up and sign-in experience, specifically:

1. **They don't like the left panel of the auth page** (the dark side panel with the headline and bullet points on `/login` and `/register`, `AuthLayout` in `src/components/auth/AuthParts.tsx`).
2. **There are no social logins.** People can only sign up with email and password.
3. **New accounts aren't verified.** There is no proper email-verification step in the flow.
4. **After registering, the user is sent back to the login page** and has to sign in again, instead of going straight into the app.

What the rebuild needs to cover:

- **Two journeys from the first screen:** "I'm a business" and "I'm a creator", each with its own short onboarding after the account is made.
  - Business: business name, category, city, WhatsApp number, then straight to the campaign builder.
  - Creator: handle, city, the platforms they post on (linking each one, ready for per-platform verification), then Discover.
- **Social sign-in:** Google first (Supabase Auth supports it); consider Apple and Facebook later.
- **Email verification done properly:** a clear "check your inbox" step with resend, sent through our own email (Resend as custom SMTP, not Supabase's rate-limited default mailer).
- **No second sign-in:** after sign-up, the user is signed in and lands in onboarding.
- **A new auth page design** without the current left panel, built to `DESIGN.md`.
- Keep the tracking-link credit (`signup_ref` and `signup_visitor` in the sign-up metadata) working in every new path, including Google sign-in.

## Stack

The existing code is Next.js 16, React 19, Tailwind 4, Supabase, Paystack and Resend. It came from the earlier "Visible" prototype. Reuse the stack, but rebuild the screens to this brief, not to the old screens.

### Database (decided 2026-11-23)

- **Supabase CLI migrations, not Prisma.** The browser queries Supabase directly and row-level security (RLS) decides what each person sees; Prisma would bypass RLS and can't model our functions, triggers and policies. Every table has RLS on.
- **Every schema change is a file in `supabase/migrations/`** named `YYYYMMDDHHMMSS_name.sql`, applied with `pnpm supabase db push --db-url "<session pooler connection string>"`. Never edit a database by hand in the dashboard. `20261025000000_baseline.sql` recreates the original tables, so a new project is built from the folder alone.
- **Two projects:** development (`rlxvzrxfxtltuoowijra`, Ireland, created 2026-11-23, holds a test admin `admin@visibilitycampaigns.com`) and production (to be created before real users, from the same migrations). The old project `glfbqdxbxwwejlcmcmyq` is gone.
- **Env names:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (server only), `DATABASE_URL`. This network has no IPv6, so connect through the Session pooler (`aws-1-eu-west-1.pooler.supabase.com:5432`, user `postgres.<ref>`), with special characters in the password URL-encoded.
- **Types:** regenerate `src/lib/database.types.ts` with `pnpm supabase gen types typescript --db-url "<connection string>" --schema public` after a migration.
