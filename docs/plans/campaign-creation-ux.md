# Campaign creation: UI and UX, A to Z

Started 24 November 2026. A screen-by-screen redesign of how a campaign is made, paid for, reviewed and run, on the brand side and the admin side. The pricing rules underneath are done (see `pricing-and-pay.md`, Phase A); this plan changes how it looks and feels, not what it charges.

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
| 7 | Check and pay | Step 5 | A long stack of identical cards; edit links in orange underline | One summary sheet that reads like the campaign, the price block pinned by the pay button |
| 8 | Payment and success | Paystack popup, success screen | A generic green tick | A success moment with the ring and what happens next on a timeline (review, live, posts, results) |
| 9 | Managing a campaign | `/order/[id]` | Stat strip and lists in the prototype style | The ring as the campaign's live picture, spots filling as creators join and post |

### Admin side

| # | Screen | Where today | What's wrong now | Direction |
| --- | --- | --- | --- | --- |
| 10 | Campaign queue | `/admin/campaigns` | Prototype look: violet "ADMINISTRATION" label, Inter, stat cards, uppercase meta labels | Rebuilt like the Links pages: a review queue first, filters as segments, each campaign one clean row |
| 11 | Review a campaign | Review dialog | One long scrolling form; pay terms and edits mixed | Side by side: what creators will see on the left, corrections on the right; Approve and Reject always in reach |
| 12 | Approve, reject, refund | Same dialog | Reject sends a note but the refund is a toast to remember | A clear reject flow with the refund amount, reference and a Paystack link, and the business notified |

## Tracker

| # | Screen | Status |
| --- | --- | --- |
| 0 | Icon system | ☑ 24 Nov |
| 1 | Way in: Run campaigns | ☑ 24 Nov |
| 2 | Builder frame | ☑ 24 Nov |
| 3 | Type | ☑ 24 Nov (folded into the picker; the builder no longer has a type step) |
| 4 | The campaign | ☐ |
| 5 | Where and when | ☐ |
| 6 | Budget and pay | ☐ |
| 7 | Check and pay | ☐ |
| 8 | Payment and success | ☐ |
| 9 | Managing a campaign | ☐ |
| 10 | Admin queue | ☐ |
| 11 | Admin review | ☐ |
| 12 | Approve, reject, refund | ☐ |

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
