# Campaign creation: UI and UX, A to Z

Started 24 November 2026. A screen-by-screen redesign of how a campaign is made, paid for and run, on the brand side and the admin side. The pricing rules underneath are done (see `pricing-and-pay.md`, Phase A); this plan changes how it looks and feels, not what it charges.

We go one screen at a time, in the order below. For each screen: I propose the changes, the founder adjusts them, I build, then we check desktop and phone screenshots before moving on.

## What "good" means here

The founder's brief: very simple, unique and sleek. No generic icons.

- **One question per screen.** Each step asks one thing and shows what it means straight away (Airbnb's host flow, Typeform).
- **Show the result, not the form.** Choices draw themselves: the budget becomes creators gathering, the dates become a run, the brief becomes the card creators will see.
- **The Gathering ring is the signature.** A campaign is drawn as the logo's ring: one dot per creator around the business, filling as they join and post (`DESIGN.md` → The business app). Spend boldness there; keep everything else quiet.
- **A price you can trust at a glance** (Stripe Checkout): the same three lines everywhere, Budget · Fee · You pay.
- **Real brand marks, never look-alikes.** Social platforms use their official logos.
- **Selected means filled.** Idle icons are outlines; chosen ones fill in. The change shows that a tap landed.
- **Quiet chrome.** No all-caps labels, no violet left from the prototype, no middle-dot strings, orange only on the one main action. Outfit for headings, Figtree for text, Plex Mono for money.
- **Built for cheap phones.** Thumb-reachable actions, no heavy images, works on slow data.

## Icon system

| Use | Choice | Why |
| --- | --- | --- |
| Social platforms (TikTok, Instagram, Facebook, YouTube, YouTube Shorts) | Official marks from [Simple Icons](https://simpleicons.org) (CC0), copied as five SVG paths into `src/components/icons/brands.tsx` | Exact logos, no new package to download. Shown in brand colour on choice chips, in ink elsewhere |
| Interface icons | [Phosphor](https://phosphoricons.com) (`@phosphor-icons/react`, MIT) | Soft, rounded strokes that sit well with Outfit. Six weights: regular when idle, fill when selected, duotone (with a signal-orange accent) for empty and success states |
| Where Lucide stays | Screens not yet redesigned | Swapped screen by screen as each is redesigned, so nothing breaks in between |

A single `Icon` wrapper keeps size, weight and colour consistent, and stops ad-hoc icon choices creeping back in.

## The journey, and what each screen needs

### Brand side

| # | Screen | Where today | What's wrong now | Direction |
| --- | --- | --- | --- | --- |
| 0 | Icon system | — | Lucide look-alike brand icons; TikTok is a music note, Shorts shares YouTube's icon | Brand marks + Phosphor, as above |
| 1 | Way in: Run campaigns | `/order` | A plain list; the empty state doesn't sell the first campaign | A "Start a campaign" moment with the ring; each campaign drawn as a small ring of its spots |
| 2 | Builder frame | `/order/new` (header, progress, bottom bar) | "Step 3 of 5 · Where & who" label, plain bars, a bottom bar that covers content | Named steps you can tap back to, a calm progress line, a bottom bar that never hides the last field, draft saved quietly |
| 3 | Type: open or verified | Step 1 | Now chosen in the "New campaign" picker (screen 1); the builder's own type step is left only so Back still works | Remove the builder's type step; show the chosen type in the builder header with a way to change it |
| 4 | The campaign: name, brief, banner, links | Step 2 | A bare text box for the brief; no help writing one | A brief that previews as the creator's card while you type, example briefs by business type, a simpler banner drop |
| 5 | Where and when | Step 3 | Look-alike platform icons; browser date pickers (US format on some phones); Country/Zone/State is national when we're in Uyo first | Platform choices with real logos; a custom date picker; location that starts from our cities |
| 6 | Budget and pay | Step 4 | A flat row of dots; three plain number fields | The budget drawn as the ring filling with creators; rates as simple steppers with the suggestion marked |
| 7 | Review and pay | Step 4 (Review) | A long stack of identical cards; edit links in orange underline. Now the only check before launch (no admin review, decided 24 Nov) | One summary sheet that reads like the campaign, the brand confirms it follows our rules, the price block pinned by the pay button |
| 8 | Payment and going live | Paystack popup, success screen | A generic green tick; says "in review" | A success moment with the ring and what happens next on a timeline (live on the start date, creators join, posts, results) |
| 9 | Managing a campaign | `/order/[id]` | Stat strip and lists in the prototype style | The ring as the campaign's live picture, spots filling as creators join and post |

### Admin side

Admin review before launch is gone (decided 24 Nov 2026, see below), so the old screens 10 to 12 (queue, review dialog, approve/reject/refund) become one.

| # | Screen | Where today | What's wrong now | Direction |
| --- | --- | --- | --- | --- |
| 10 | Live campaigns | `/admin/campaigns` | Prototype look, and built around approving campaigns that no longer need approval | Rebuilt like the Links pages: every campaign as one clean row, filters as segments, open one to see it as creators do. Pause or take down (if that's decided) with the unspent refund shown |

## Going live without admin review (decided 24 Nov 2026)

The founder: a campaign doesn't go to an admin for review; the campaign manager reviews it themselves. The builder's Review step is the check, so it has to be good (screen 7).

Build steps, done with screens 7, 8 and 10:

1. **Migration:** a paid campaign is saved as live (`active`), not `pending_review`. Existing `pending_review` rows move to `active`. The admin edit and review functions stay for now, unused, and are dropped when screen 10 lands.
2. **Server** (`src/app/api/campaigns/route.ts`): save as live; stop the "new campaign to review" admin notification; send the business a "your campaign is live" (or "starts on …") notification and email.
3. **Builder Review step:** a short rules check the brand ticks before Pay ("No betting, loan apps, investment schemes or party politics; the brief is a brief, not a script"), with the full rules a tap away.
4. **Success screen and campaign page:** "Live from 3 Dec", not "in review". Remove the In review and Not approved states from Campaigns (`/order`) and the campaign page.
5. **Creators:** the daily start job (`/api/cron/campaign-starts`) already tells verified creators when a campaign starts; check it picks up campaigns that were never reviewed.

Open: what happens when a live campaign breaks the rules. Recommended: admins can pause or take it down from screen 10, creators keep what they've earned, and the brand gets the unspent budget back. Logged in the Decision Log's Open decisions.

## Components: shadcn/ui (looked at 24 Nov 2026)

Today every control is our own: the modal is a native `<dialog>`, the dropdown is `SelectMenu`, dates use the browser's picker. Simple pieces (buttons, fields, chips, cards) are fine that way. The hard ones are not: our dropdown needed two fixes for scrolling and placement inside the modal, and screen 5 needs a date picker that the browser can't give us in a Nigerian date format.

**Recommendation:** use [shadcn/ui](https://ui.shadcn.com) for the controls that have tricky behaviour, built on Radix, inside the apps only.

- shadcn copies each component's source into our repo (`src/components/ui/`), so we restyle it to `DESIGN.md` rather than ship its default look. It supports Tailwind 4 and React 19.
- Take from it: **Select, Popover, Calendar (date picker), Dropdown menu, Tooltip, Dialog and Sheet**. Radix handles keyboard use, screen readers, focus, positioning near screen edges and layering dropdowns inside modals, which is where ours broke.
- Keep our own: buttons, inputs, chips, cards, the ring, `Segmented`. They're simple and they carry the look.
- Toasts already use `sonner`, the one shadcn uses.
- Marketing pages stay as they are: they have a 300KB first-view budget and don't need these controls.

**When:** at the start of screen 5 (it needs the date picker and dropdowns). `SelectMenu` and `Modal` are swapped for the shadcn versions across the app in the same step, so we don't run two systems.

## Screen 4: The campaign (built 25 Nov 2026, as proposed)

One question: what should creators know about your business? Name and brief come first; the banner and links sit below under "Optional: help creators get it right".

1. **Name.** One line, as now. The character count shows only near the 80 limit.
2. **Brief, with examples to start from.** Above the box, a row of chips by business type: Food and drinks, Beauty and salons, Fashion and tailoring, Phones and gadgets, Events and venues, Shops and supermarkets. A tap fills the box with a short example written as a brief, not a script, with gaps to fill in brackets: "Order any dish from our [menu name] at [address]…". The gaps are highlighted, and Continue points to any left unfilled. If the box already has text, the chip asks before replacing it. A three-line guide sits under the box: what to show, what to say, and what must be mentioned (address, price, how to order).
3. **How customers reach you (new).** One field: WhatsApp number (default), Instagram or TikTok page, website, or shop address. Creators put it in their posts, and later each creator gets a tracked link to it. That is how we count clicks and WhatsApp chats, which we promise in every report. This needs one new database column; tracked links per creator come later.
4. **Banner.** A 16:9 drop area: tap, drag a file in, or paste. It appears in the preview card straight away, and the phone shrinks it to about 1280×720 WebP (under 200KB) before upload, so creators on expensive data load it fast. Hint: "A clear photo of your product or shop works best. Avoid flyers full of text."
5. **Reference links.** Paste a link to a post you like and it becomes a chip with the platform's logo and the account name; up to 3. Label: "Posts you like (optional)".
6. **No AI writing help for now.** It adds cost, and its copy would need checking; the examples cover most of the need.

## Screen 5 proposal: Where and when

One question: where should the posts go, who are they for, and when do they run. Built on shadcn/ui (set up at the start of this screen, see Components above).

1. **Platforms as tiles.** Five tiles with the real logo in brand colour and what to post there: TikTok (short video), Instagram (Reel or post), Facebook (video or post), YouTube Shorts (under a minute), YouTube (long video). Tap to pick; a picked tile fills its outline and shows a tick. Two columns on phones, five across on desktop.
2. **Where your customers are, starting from our cities.** Chips: Uyo, Ikot Ekpene, Anywhere in Akwa Ibom, Anywhere in Nigeria, and Another city (a search box over Nigerian states and big cities). This replaces Country, Zone and State. Other countries leave the builder until we launch there. It needs one new column (`tasks.target_city`); state and zone fill themselves from the city (Uyo gives Akwa Ibom, South South).
3. **Languages that fit Akwa Ibom.** English (default), Nigerian Pidgin, Ibibio, Annang, Efik, then Igbo, Yoruba, Hausa. French goes. Label: "Languages creators can post in".
4. **Dates drawn as a run.**
   - Starts: chips for Today, Tomorrow, or Pick a date. Pick a date opens our own calendar (a popover on desktop, a bottom sheet on phones), with dates written the Nigerian way: "Wed 3 Dec".
   - Runs for: 1 week, 2 weeks (default), 3 weeks, 30 days, or Custom. Custom opens the calendar with only the allowed end dates (7 to 30 days) available.
   - Underneath, a timeline bar: the posting days in ink, the 14 days after the last day when views still count in a lighter shade, and labels for the start, last day and "Results final" date. The same sentence as now sits under it, for screen readers too.
5. **The swap.** `SelectMenu` and `Modal` are replaced across the app (builder, New campaign picker, admin Links) by the shadcn Select, Dialog and Sheet, restyled to `DESIGN.md`, and screens 1, 2 and the Links pages are checked again.

## Tracker

| # | Screen | Status |
| --- | --- | --- |
| 0 | Icon system | ☑ 24 Nov |
| 1 | Way in: Run campaigns | ☑ 24 Nov |
| 2 | Builder frame | ☑ 24 Nov |
| 3 | Type | ☑ 24 Nov (folded into the picker; the builder no longer has a type step) |
| 4 | The campaign | ☑ 25 Nov |
| 5 | Where and when | ☐ |
| 6 | Budget and pay | ☐ |
| 7 | Review and pay | ☐ |
| 8 | Payment and going live | ☐ |
| 9 | Managing a campaign | ☐ |
| 10 | Admin: live campaigns | ☐ |

## Questions to settle along the way

- **Location (screen 5):** start from our cities (Uyo, Ikot Ekpene, then the rest of Akwa Ibom), with "Anywhere in Nigeria" as an option, instead of Country → Zone → State?
- **Brief help (screen 4):** example briefs by business type (food, salon, fashion, gadgets, events) to start from, and optionally "Help me write it" with AI?

## Change log

| Date | # | Commit | What changed |
| --- | --- | --- | --- |
| 24 Nov 2026 | — | — | Plan written |
| 24 Nov 2026 | 0, 1 | `Screens 0, 1:` commit | **Icons:** official TikTok, Instagram, Facebook, YouTube and YouTube Shorts marks from Simple Icons in `src/components/icons/brands.tsx`, used everywhere through `platformIcon`; Phosphor added, sidebar and bell switched (outline idle, filled on the current page). **Campaigns page:** no stat cards; a compact bar (title + orange New campaign), type tabs (All / Open / Verified) and a status segment (All / Live / In review / Ended, Not approved only when there is one) with counts, search, and one row per campaign with its ring (spots filled, or budget used), status, type, rate, dates, progress and budget used; the ring-mark empty state, and an empty message per filter. **New campaign picker:** wide modal (bottom sheet on phones), two cards with their own colours (Open warm amber, Verified green), one line each, no prices, illustrations built from the creator-face sprite (a fan of posts with a crowd; the Gathering ring with verified ticks around the business), selected outline and tick in each card's colour; Continue opens the builder at "The campaign" with the type set. Shared pieces moved to `src/components/ui/AppParts.tsx`. Checked on desktop and phone with test campaigns, then deleted |
| 24 Nov 2026 | 1 | `New campaign picker: 3:4 cards` | Trial: the picker's cards are 3:4 portrait in a slimmer modal, art scaled up, no scrolling on desktop. Founder to confirm or revert |
| 24 Nov 2026 | 2, 3 | `Screen 2:` commit | **Focus mode:** `/order/new` hides the app sidebar; its own top bar has the logo (back to Campaigns), the campaign name, the type chip with Change (reopens the picker), "Draft saved", Preview (below desktop) and Save and exit. **Stepper:** four named steps (The campaign, Where and when, Budget and pay, Review); any step reached can be tapped; phones show the step name, "1 of 4" and a progress line. Steps slide in the direction you move; Enter moves on; Continue focuses the first field with a problem. **Live preview:** the Discover card creators will see, beside the form on desktop and in a sheet on phones. **Drafts:** kept in this browser (`src/lib/campaignDraft.ts`, localStorage), restored on return; Campaigns shows a "Continue your draft" notice with Discard. The builder waits for the saved draft before rendering, so it can't save an empty one over it. The old type step is gone (screen 3): the type comes from the picker |
| 24 Nov 2026 | 1 | `New campaign picker: cards fit the screen` | Cards sized from the screen height so the modal never scrolls on desktop; everything inside scales with the card. Spacing set in two places in `globals.css` (`--modal-pad` 2.5rem at the sides, `--cards-gap` 2rem between) |
| 24 Nov 2026 | 7, 8, 10–12 | — | No admin review before launch (founder, 24 Nov): the brand's own Review step is the check. Screens 10–12 merged into one "Live campaigns" screen; build steps listed above. shadcn/ui recommended for Select, Popover, Calendar, Dropdown, Tooltip, Dialog and Sheet from screen 5. Screen 4 proposal written |
| 25 Nov 2026 | 4 | `Screen 4:` commit | **Brief:** six example briefs by business type (`src/lib/briefExamples.ts`); a tap fills the box and selects the first [gap]; gaps listed under the box as chips that select themselves; Continue refuses a brief with gaps left; asks before replacing the brand's own words; a Show / Say / Mention guide. **How customers reach you (new, required):** WhatsApp (default), social page, website or shop address, cleaned to one stored form by `src/lib/campaignContact.ts` in the builder and the server; migration `20261125000000_campaign_contact.sql` (`tasks.contact_type`, `contact_value`); shown to creators on the campaign page. **Banner:** drop, paste or browse; shrunk in the browser to at most 1280px WebP, about 200KB (a 2.7MB photo became 158KB); Replace and Remove. **Posts you like:** pasted links become chips named by platform and account (`src/lib/referenceLinks.ts`), also on the creator's page. Name and brief counters only show near the limit. Tests: `pnpm test:campaign` (6) |
