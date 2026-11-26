# Pricing and pay: change plan

Started 24 November 2026. This file tracks one piece of work: making the app charge brands and pay creators by the rules decided on 22–23 November (see `CLAUDE.md` → The model, and the [Decision Log](https://claude.ai/artifact/AjdFSygTzVCV1pGiMmXVC2)).

Nothing here is built yet. We build it one step at a time, in the order below, and nothing moves on until the step before it is checked.

## How to use this file

- Every change has an ID (A1, A2, B1…). Commits name the ID they deliver, for example `A2: Budget and pay step`.
- When a step is done, tick it in the tracker, add the commit to the change log at the bottom, and note anything that turned out differently.
- **UI** marks a change people will see. Every UI change follows `DESIGN.md`, reuses `Modal` and `SelectMenu` (`src/components/ui/`), and gets a desktop and phone screenshot check before it's ticked.
- Decisions are listed under "Decisions". New questions that come up while building are added there before the step that needs them.

## Tracker

| ID | Change | Phase | UI | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| D1–D7 | Decisions | — | — | — | ☑ Answered 24 Nov |
| A1 | One set of pricing rules in code | A | | D1–D7 | ☑ 24 Nov |
| A2 | Database: new campaign pay fields | A | | A1 | ☑ 24 Nov |
| A3 | Builder: end date in the "Where and when" step | A | UI | A1 | ☑ 24 Nov |
| A4 | Builder: new "Budget and pay" step | A | UI | A1 | ☑ 24 Nov |
| A5 | Builder: review, price breakdown and checkout | A | UI | A4 | ☑ 24 Nov |
| A6 | Server: check the payment and save the campaign | A | | A2, A5 | ☑ 24 Nov |
| A7 | Admin review shows the new pay | A | UI | A6 | ☑ 24 Nov |
| A8 | Creators see the new pay (Discover, campaign page, My campaigns) | A | UI | A6 | ☑ 24 Nov |
| A9 | Businesses see the new pay (Run campaigns, campaign page) | A | UI | A6 | ☑ 24 Nov |
| A10 | Remove the old 70/30 maths | A | | A8, A9 | ☑ 24 Nov |
| B1 | Database: earning stages for each post | B | | A2 | ☐ |
| B2 | Admin: approve a post without paying it yet | B | UI | B1 | ☐ |
| B3 | Admin: day-7 "still live" check unlocks the post fee | B | UI | B1 | ☐ |
| B4 | Admin: day-14 view count | B | UI | B1 | ☐ |
| B5 | Closing a campaign: share out view pay, leftover becomes credit | B | UI | B4 | ☐ |
| B6 | Creators see each post's earning stage | B | UI | B1 | ☐ |
| B7 | Businesses see credit and what was spent | B | UI | B5 | ☐ |
| C1 | Database: monthly payouts, no withdrawal fee | C | | B1 | ☐ |
| C2 | Creator wallet: pending, available, next payout | C | UI | C1 | ☐ |
| C3 | Creator bank details in settings | C | UI | C1 | ☐ |
| C4 | Admin: monthly payout run on the 5th | C | UI | C1 | ☐ |
| C5 | Retire any-time withdrawals and the withdrawal agent | C | | C2, C4 | ☐ |

Deadlines that set the order:

- **Thursday 3 December:** the first paid brand campaign. Phase A must be live by Tuesday 1 December.
- **Saturday 5 December:** the first payout day. Our own campaign is settled by hand, so it doesn't need Phase B or C. Brand campaigns do: B and C should be live before the first brand campaign's posts reach day 7 (around 10 December).
- Later and not in this plan: the 24-hour join window and creator-score selection, platform APIs, the registration and onboarding rebuild, agent pay. See "Out of scope".

## Why: the rules against the app today

| Rule (decided) | What the app does today | Fixed in |
| --- | --- | --- |
| Fee on top: 10% until 31 Jan 2027, then 20% | No fee. The brand pays only the budget | A1, A5, A6 |
| Minimum budget: open ₦15,000, verified ₦30,000 | ₦5,000 for both | A1, A4, A6 |
| Verified: 30% of budget pays per post, 70% pays for views | The brand picks one: per post or per 1,000 views | A1, A4 |
| Open: pays for views only | The brand can choose per post | A1, A4 |
| Per post from ₦300 (₦500 suggested); per 1,000 views from ₦700 | Per post from ₦300; per 1,000 views from ₦675 | A1 |
| Views paid between a floor and a cap, stored on each campaign | 1,000 and 5,000 hard-coded for everyone | A1, A2 |
| Brand sets an end date, 7–30 days | Start date only | A3 |
| Post fee earned when the post is approved and still live 7 days later | Paid the moment an admin approves | B1–B3 |
| Views counted up to 14 days after each post | The admin types views at approval | B4 |
| Unspent budget becomes credit, or a refund on request | Nothing happens to it | B5, B7 |
| Creators keep 100%; payouts monthly on the 5th; ₦1,000 minimum until 31 Jan | Withdraw any time from ₦500, with a 10% fee | C1–C5 |

## Decisions (answered 24 November 2026)

| ID | Question | Answer |
| --- | --- | --- |
| D1 | Can brands change the view floor and cap? | The floor stays at 1,000 views (open). The cap is a **maximum view payout per post** in naira, set by the brand, defaulting to 5,000 views' worth (rate × 5). At ₦1,000 per 1,000 views and a ₦5,000 maximum, a 10,000-view post still earns ₦5,000 |
| D2 | Who pays Paystack's charge? | We do, from our fee. The brand pays budget + fee only |
| D3 | If views would pay out more than the view share? | Everyone's view pay on the campaign is reduced by the same percentage. The maximum view payout (D1) limits each post; the budget limits the total. Open campaigns stop taking new posts once expected earnings fill the share |
| D4 | When is view pay worked out? | The post fee is earned at day 7. View pay is final when the campaign closes. Payouts stay monthly: everything earned by the last day of a month is paid on the 5th of the next month |
| D5 | Do verified campaigns have a view floor? | No: paid from the first view, up to the maximum. Open keeps the 1,000 floor |
| D6 | Show the fee as its own line? | Yes: "Budget · Launch fee (10%) · You pay" |
| D7 | Should open campaigns pay the same per-view rate as verified? | No. **Open: ₦400 per 1,000 views** (floor and suggestion; first set at ₦300–₦500, then settled on ₦400 the same day). Verified: floor ₦700 |

## Worked examples (used for testing)

| | Open, ₦15,000 | Verified, ₦30,000 |
| --- | --- | --- |
| Rates | ₦400 per 1,000 views | ₦500 per post, ₦700 per 1,000 views |
| Maximum view payout per post | ₦2,000 (5,000 views, the default) | ₦3,500 (5,000 views, the default) |
| Fee (10%) | ₦1,500 | ₦3,000 |
| Brand pays | ₦16,500 | ₦33,000 |
| Post share | — | 30% = ₦9,000 → **18 spots** (₦9,000 ÷ ₦500) |
| View share | ₦15,000 | 70% = ₦21,000 |
| Paid views | 37,500 | 30,000 |
| Creators it can pay | 8 to 37 (each between 1,000 and 5,000 views) | 18 |
| Most one creator can earn | ₦2,000 | ₦4,000 (₦500 + ₦3,500) |

Rounding: amounts are whole naira. Spots = whole number of (30% of budget ÷ per-post rate); anything left over joins the view share. At ₦30,000 and ₦700 per post: ₦9,000 ÷ ₦700 = 12 spots (₦8,400), and the other ₦600 joins the view share (₦21,600).

---

## Phase A: builder and checkout

### A1. One set of pricing rules in code

- **Where:** a new file, `src/lib/pricing.ts`, with tests in `src/lib/pricing.test.ts`. It's kept separate from `campaignOptions.ts` so today's builder keeps working on the old rules until A4–A6 switch it over; A10 removes the old pay constants.
- **What:**
  - `feeRateOn(date)`: 10% before 1 February 2027 (Lagos time), 20% from then. Fixed at payment time on the server.
  - Minimum budgets, rate floors and suggestions per campaign type (D7), view floor (D5), default maximum view payout (D1), campaign length, view window, post-fee unlock, payout day and minimum payout by date (D4).
  - `planCampaign(input)`: everything a screen needs (fee, total, spots, the two shares, paid views, maximum per post, creators it can pay) plus plain-English errors. One function, so the builder, server and admin can't disagree.
  - `viewPayFor(views, plan)`: what one post's views earn (floor, rate, maximum).
  - `settleViews(estimates, viewPool)`: the D3 share-out at closing, in whole naira, with what's left over.
  - `payoutDateFor(date)` and `minimumPayoutOn(date)`: the D4 monthly cycle.
- **Done when:** the worked examples and the D3 share-out come out exactly in `pricing.test.ts` (run with `node --test`).

### A2. Database: new campaign pay fields

- **Where:** `supabase/migrations/20261124000000_campaign_pricing.sql`; `src/lib/database.types.ts`.
- **What:** new columns on `tasks`:

  | Column | Meaning |
  | --- | --- |
  | `pricing_version` | `2` for campaigns made under these rules. Older campaigns stay `1` and keep paying the old way |
  | `budget` | What creators can earn in total (excludes the fee) |
  | `fee_rate`, `fee_amount` | The fee charged at payment |
  | `post_rate` | Per-post pay (verified only) |
  | `view_rate` | Pay per 1,000 views |
  | `view_floor`, `view_cap` | Views below the floor earn nothing; views past the cap aren't paid |
  | `post_pool`, `view_pool` | The two shares of the budget (open: all of it is `view_pool`) |
  | `end_date` | Set by the brand |

  `amount_paid` stays as what Paystack received (budget + fee). `reward` stays for older campaigns only.

  - **`pay_model`:** version-2 verified campaigns use a new value, `post_and_views`; version-2 open campaigns use the existing `per_1k_views`.
  - **`reward` is left empty on version-2 campaigns** on purpose. The old approval function refuses a campaign without a reward, so no version-2 post can be paid the old way before B1 replaces it.
  - **`max_participants` holds the spots** for verified campaigns, so joining and standby keep working unchanged.
  - **A database check keeps version-2 terms whole:** the shares add up to the budget, spots × post rate equals the post share, the maximum view payout is at least one rate, and there's an end date on or after the start date.
- **Done when:** the migration runs on development with `supabase db push`, and older campaigns still load.

### A3. UI: Builder, end date in "Where and when"

- **Where:** `src/app/(app)/order/new/page.tsx`, step 3 ("Where should creators post?").
- **Before:** start date only.
- **After:** "Starts" and "Ends" side by side. Ends defaults to 14 days after the start, and can be 7 to 30 days after it. Under the dates: "Creators can post until 15 Dec. Views are counted for 14 days after each post." The language and region dropdowns move to `SelectMenu`.
- **Done when:** an end date outside 7–30 days can't be chosen, on desktop and phone.

### A4. UI: Builder, new "Budget and pay" step

- **Where:** `order/new/page.tsx`, step 4 (replaces "How do you want to pay creators?"), with the shared `planCampaign` from A1.
- **Before:** choose "Per post" or "Per 1K views", one rate, and a count or a budget.
- **After:** no choice of model; the campaign type decides it.

  ```
  How much do you want to spend?
  [ ₦30,000 ]  [₦30k] [₦50k] [₦100k]        Minimum ₦30,000 for verified

  Pay per post          [ ₦500 ]            From ₦300        (verified only)
  Pay per 1,000 views   [ ₦700 ]            From ₦700 (open: ₦400)
  Most a post earns from views [ ₦3,500 ]   5,000 views at your rate

  ┌ What this buys ───────────────────────────────────┐
  │ ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●   18 spots      │  ← Gathering dots, one per spot (verified)
  │ ₦9,000 pays for posts, ₦21,000 pays for views       │
  │ About 30,000 paid views                             │
  │ One creator can earn up to ₦4,000                   │
  ├─────────────────────────────────────────────────────┤
  │ Budget ₦30,000 · Launch fee (10%) ₦3,000            │
  │ You pay ₦33,000                                     │
  └─────────────────────────────────────────────────────┘
  ```

  - **Open:** the budget and the rate per 1,000 views only. The summary shows paid views, "pays 8 to 37 creators", and the most one post can earn. The brand can raise the maximum view payout per post (D1).
  - **Verified:** budget, per-post rate, view rate and maximum view payout per post. Spots are worked out, not typed. The dots add or remove as the budget or rate changes, as `DESIGN.md` describes for the builder.
  - Errors say what to change: "Add ₦4,000 to reach the ₦30,000 minimum for verified campaigns."
  - **Rule kept from 18 Nov:** the rate is what the creator earns.
- **Done when:** the worked examples show exactly in the summary, and every error is reachable from the keyboard.

### A5. UI: Builder, review and checkout

- **Where:** `order/new/page.tsx`, step 5 ("Check and pay"); the Paystack call in the same file.
- **Before:** "Pay & budget" shows the budget only. Paystack charges the budget.
- **After:**
  - The review card shows the plan from A4 and the dates.
  - A price block: budget, launch fee (with "10% until 31 January"), and **You pay**.
  - Paystack charges the total.
  - The pay button says the amount: "Pay ₦33,000".
  - The success screen repeats what was paid.
- **Done when:** the Paystack test charge equals budget + fee.

### A6. Server: check the payment and save the campaign

- **Where:** `src/app/api/campaigns/route.ts`.
- **What:**
  - It recalculates the plan with A1 from the brand's inputs.
  - It checks that Paystack received at least budget + fee, and checks the minimums, floors and dates.
  - It saves the A2 fields with `pricing_version = 2`.
  - One payment still funds exactly one campaign.
  - The error messages name the amounts.
- **Done when:** a tampered amount, a rate below the floor, or an end date out of range is refused.

### A7. UI: Admin review shows the new pay

- **Where:** `src/components/admin/CampaignReviewDialog.tsx`, `src/app/(app)/admin/campaigns/page.tsx`.
- **After:**
  - A "Pay" panel: rates, spots, the two shares, floor and cap, dates, budget, fee and total paid.
  - Pay stays read-only in review (the 19 Nov rule): after D1 the brand sets the maximum view payout and pays for it, so an admin doesn't change it. If pay is wrong, the campaign is rejected and refunded.
  - Moving the start date moves the end date by the same number of days, in the edit and on approval, so the length the brand chose stays.
  - The reject text gives the full amount to refund.
- **Done when:** a version-2 campaign shows every field, and a version-1 campaign still shows its old pay.

### A8. UI: Creators see the new pay

- **Where:** `src/components/campaigns/CampaignCard.tsx`, `campaign-utils.ts` (`rateLabel`), `src/app/(app)/discover/[id]/page.tsx`, `src/app/(app)/tasks/page.tsx`.
- **Before:** "₦500/post" or "₦700/1K views".
- **After:**
  - Cards say "₦500 per post + ₦700 per 1K views" (verified) or "₦700 per 1K views" (open), with "Up to ₦4,000".
  - The campaign page explains in one line: "You earn ₦500 when your post has been live for 7 days, plus ₦700 for every 1,000 views in its first 14 days, up to ₦4,000."
  - The posting box gives the end date.
- **Done when:** both campaign types read correctly on a phone.

### A9. UI: Businesses see the new pay

- **Where:** `src/app/(app)/order/page.tsx` (Run campaigns), `src/app/(app)/order/[id]/page.tsx` (one campaign), `src/components/CampaignProgress.tsx`.
- **After:**
  - "Budget used" counts against the budget, not against budget + fee.
  - The campaign page shows the end date, spots filled, and a receipt line (budget, fee, paid).
- **Done when:** spent, budget and fee add up for the worked examples.

### A10. Remove the old 70/30 maths

- **Where:** `src/lib/campaignMath.ts` and `src/components/site/BudgetCalculator.tsx`. Both use the dropped 70/30 model, and nothing imports the calculator.
- **What:** delete both. The public calculator page, when it's built, uses `planCampaign` from A1.
- **Done when:** nothing imports them and the build passes.

---

## Phase B: earning and settling

### How a post earns (the new stages)

```
Submitted ──► Approved ──► day 7: still live? ──yes──► Post fee earned (verified)
   │             │                    └─no──► Post fee lost, spot freed
   │             │
   │             └──► day 14: views counted ──► campaign closes ──► view pay shared out
   └─► Rejected                                                    (D3, D4) ──► Available in wallet
```

### B1. Database: earning stages for each post

- **Where:** new migration; `approve_submission` replaced for version-2 campaigns.
- **What:** new columns on `submissions`:
  - `post_fee`, `post_fee_status` (pending, earned or lost) and `live_checked_at`
  - `views_due_at` (posted + 14 days), `verified_views` (already there) and `view_pay_estimate`
  - `view_pay` and `settled_at`

  New columns on `tasks`: `closed_at`, `view_scale` (the D3 percentage) and `credit_issued`. A new `campaign_credits` table records each credit for a business.
- **Done when:** approving a version-2 post adds nothing to the creator's balance, and version-1 posts work as before.

### B2. UI: Admin, approve without paying

- **Where:** `src/app/(app)/admin/page.tsx` (Review submissions).
- **Before:** "Approve" pays at once; views campaigns ask for views.
- **After:** "Approve" checks the post against the brief only. The row then shows "Live check due 2 Dec" and "Views due 9 Dec".
- **Done when:** approving shows the two due dates and moves no money.

### B3. UI: Admin, day-7 live check

- **Where:** a new "Due today" queue at the top of `admin/page.tsx`.
- **After:**
  - Each due post has "Open post", **Still live**, and **Taken down**.
  - Still live: the post fee becomes earned and the creator is notified.
  - Taken down: the fee is lost, the creator is told why, and on a verified campaign the spot passes to standby.
  - The platform APIs can do this automatically later.
- **Done when:** a post can't be marked before its day 7.

### B4. UI: Admin, day-14 view count

- **Where:** the same "Due today" queue.
- **After:**
  - The admin types the verified views from the post's insights screenshot.
  - The app shows the estimate: "2,140 views → ₦1,498, final when the campaign closes".
  - It's saved as `view_pay_estimate`.
- **Done when:** views can't be entered before day 14, and estimates respect the floor and cap.

### B5. UI: Closing a campaign

- **Where:** `src/app/(app)/admin/campaigns/page.tsx`, a "Close and settle" action, and a new database function.
- **When:** the end date has passed and every post has its views. Or the budget is used up.
- **What:**
  - Add up the view-pay estimates.
  - If they're more than the view share, scale everyone down equally (D3).
  - Move the view pay to creators' available balances.
  - Turn what's left (unused spots, views under the share) into credit for the business.
  - Notify creators and the business.
- **The screen** shows the sums before confirming: "Views earned ₦23,800 against a ₦21,000 share, so everyone gets 88%. Credit to business: ₦0."
- **Done when:** the worked examples settle to the naira, and no campaign can be settled twice.

### B6. UI: Creators see each post's stage

- **Where:** `src/app/(app)/submissions/page.tsx`, `src/app/(app)/tasks/page.tsx`, `src/app/(app)/dashboard/page.tsx`.
- **Before:** "Earned" adds up the rate of every approved post.
- **After:**
  - Each post shows its stage as a small timeline: In review → Live check on 2 Dec → Views counted on 9 Dec → Paid.
  - Amounts are marked *estimated* or *earned*.
  - Totals split into earned and pending.
- **Done when:** a post's stage matches the database at each step.

### B7. UI: Businesses see credit

- **Where:** `order/[id]/page.tsx`, `order/page.tsx`, and the builder's checkout (A5).
- **After:**
  - A closed campaign shows a short settlement: paid out to creators, credit left.
  - Available credit shows on Run campaigns.
  - At checkout, credit comes off the price, and the fee is worked out on the money paid.
  - The refund text says: "Want it back instead? Ask us and we'll refund it."
- **Done when:** credit can be used once, and only by the business it belongs to.

---

## Phase C: wallet and monthly payouts

### C1. Database: monthly payouts, no withdrawal fee

- **Where:** new migration.
- **What:**
  - A `payouts` record per creator per month (amount, status, paid_at, reference).
  - A function that lists everyone with at least the minimum available on the 5th: ₦1,000 until 31 January 2027, then ₦5,000.
  - `request_withdrawal` and the 10% fee are retired.
  - Earlier withdrawals stay in their table for history.
- **Done when:** no code path takes a fee from creators.

### C2. UI: Creator wallet

- **Where:** `src/app/(app)/withdraw/page.tsx` (renamed in the menu from "Earnings" to "Wallet"), `src/components/RealtimeBalance.tsx`.
- **Before:** a balance and a withdraw form with a fee.
- **After:**
  - **Available** (paid on the 5th) and **Pending** (posts still in their 7 or 14 days).
  - "Next payout: 5 January", with the minimum.
  - Past payouts.
  - No request button: payouts happen automatically.
- **Done when:** the numbers match the B stages, and a creator below the minimum sees "rolls over to next month".

### C3. UI: Bank details in settings

- **Where:** wallet page, in a modal.
- **After:**
  - Bank (a `SelectMenu` of Nigerian banks), account number and account name.
  - The name must match the creator's ID name later (verification rule).
  - Saved once, used for every payout.
  - Paystack can confirm the account name.
- **Done when:** a payout can't be listed for a creator without bank details, and they're reminded before the 5th.

### C4. UI: Admin monthly payout run

- **Where:** `src/app/(app)/admin/payouts/page.tsx`.
- **Before:** approve or reject single withdrawal requests.
- **After:**
  - On or after the 5th, a list of creators due, with total, count and a bank-details check.
  - Each row: **Mark paid** (with transfer reference) or **Hold** (with reason).
  - An export for bulk bank transfer.
  - Two approvers, from the ops-console plan, comes later.
- **Done when:** a month's run can't pay anyone twice.

### C5. Retire any-time withdrawals

- **Where:** `src/app/api/withdrawals/trigger/route.ts`, `src/lib/agents/withdrawal/graph.ts`, `src/lib/withdrawals.ts`.
- **What:** turn off the withdrawal agent webhook and remove the fee constants. The withdraw page becomes the wallet (C2).
- **Done when:** nothing calls `request_withdrawal`.

---

## The flows, end to end

### Brand creates a campaign (after Phase A)

1. **Run campaigns → Start a campaign.**
2. **Type:** Open or Verified.
3. **The campaign:** name, brief, banner and reference links.
4. **Where and when:** platforms, languages, area, starts and ends (A3).
5. **Budget and pay:** budget, rates and the live summary with the price (A4).
6. **Check and pay:** review, "Pay ₦33,000", then Paystack (A5).
7. **Success:** "Paid. Your campaign is in review." An admin reviews it (A7) and it goes live.
8. **During the campaign:** posts come in. The campaign page shows spots, spend and the end date (A9).
9. **After it closes:** settlement and any credit (B5, B7).

### Creator earns (after Phases B and C)

1. They see the campaign on Discover with its pay line (A8), and join.
2. They post and submit the link.
3. An admin approves it against the brief (B2). The creator sees "Live check on 2 Dec".
4. **Day 7:** still live, so the ₦500 post fee is earned (B3).
5. **Day 14:** views are counted, with an estimate shown (B4).
6. **The campaign closes:** view pay is final and moves to Available (B5).
7. **On the 5th:** paid to their bank if they have at least ₦1,000 available (C2, C4).

### Admin's week (after Phases B and C)

1. **Review campaigns** (A7).
2. **Daily:** approve new posts (B2), then clear "Due today": live checks (B3) and view counts (B4).
3. **When campaigns end:** close and settle (B5).
4. **On the 5th:** the payout run (C4).

## Edge cases to handle

- The fee rate changes on 1 February. It's fixed at payment time, so a campaign paid on 31 January keeps 10% forever.
- A brand pays but the browser closes before the campaign is saved. The existing "one payment, one campaign" check, plus the Paystack reference, lets an admin recover it.
- A verified campaign gets fewer joiners than spots. The unused post share becomes credit at closing (B5), following the open decision "unfilled spots → credit".
- A creator deletes the post between day 7 and day 30. The post fee is kept, but a note goes on their record; repeat cases count against creator score later.
- Views are entered wrongly. They can be corrected until the campaign is settled, and the change is logged with who made it.
- A campaign is suspended or removed mid-way. Settle what was earned, and credit the rest.
- Older campaigns (version 1) keep paying the old way until they end.

## Test checklist

- **Phase A:**
  - Both worked examples through the builder: the summary and the Paystack amount.
  - Tampered amounts refused by the server.
  - Phone and desktop screenshots of steps 3 to 5.
  - The admin review shows the pay.
  - Creator cards read right.
- **Phase B:**
  - One verified and one open campaign on development, with test creators taken through every stage, including a post taken down at day 7 and a campaign whose views go over the share.
  - The settlement adds up to the naira.
- **Phase C:**
  - Balances above and below the minimum on the 5th.
  - No bank details.
  - Mark paid, and try to pay again.

## Out of scope for this plan

- **The 24-hour join window and creator-score selection.** These are their own plan; standby handling is still an open decision.
- **Platform APIs** for automatic live checks and view counts. B3 and B4 are built so the APIs can replace the admin later.
- **The registration and onboarding rebuild.** See `CLAUDE.md` → Future updates.
- **The public calculator page, agent pay, and two-approver payouts.**

## Change log

| Date | ID | Commit | What changed |
| --- | --- | --- | --- |
| 24 Nov 2026 | — | — | Plan written |
| 24 Nov 2026 | D1–D7 | — | Decisions answered; open campaigns get a lower view-rate floor (₦300, suggested ₦500) |
| 24 Nov 2026 | D7 | `A2:` commit | Open view rate settled at ₦400 per 1,000 views (floor and suggestion); worked example and tests updated |
| 24 Nov 2026 | A2 | `A2:` commit | Migration applied to development. Seven checks passed in a rolled-back transaction (two valid campaigns accepted, four broken ones refused, an old-style one still accepted). Types match the live database. Nothing on screen changes yet |
| 24 Nov 2026 | A1 | `A1:` commit | `src/lib/pricing.ts` and 12 passing tests (`pnpm test:pricing`). Lives in its own file instead of `campaignOptions.ts`, so today's builder keeps working until A4–A6. Nothing on screen changes yet |
| 24 Nov 2026 | A3 | `A3:` commit | Starts and Ends side by side, quick picks (1 week, 2 weeks, 3 weeks, 30 days), and a line saying when creators can post and when results are final. Country, zone and state use the new menu. **Pulled forward from A6:** the server checks the end date (7 to 30 days after the start) and saves it, so no campaign paid before A6 loses its end date. Also fixed: menus closed on the slightest scroll and opened out of place on animated pages (they now follow their button and render outside the page section); two old `Date.now()` lint errors in the builder |
| 24 Nov 2026 | A4 | d936c11 | "Budget and pay" replaces the per-post/per-view choice: budget with quick picks, pay per post (verified), pay per 1,000 views (₦400 open, ₦700 verified, filled in by type) and the most a post can earn from views (follows 5,000 views until changed). The summary shows spots as dots, the shares, paid views, the most one creator can earn, any problem at the top, and Budget · Launch fee · You pay. Naira fields show commas. The type cards say how creators are paid and the minimum. Both worked examples checked on screen. Checkout was switched off until A6 |
| 24 Nov 2026 | A5 | d17c458 | Review: the type card says who can join (spots for verified) instead of "first come, first served"; a "Your payment" panel shows Budget · Launch fee · You pay, how to pay through Paystack, and that unearned money becomes credit or a refund. Success screen: a receipt (budget, fee, paid as the server reports it, payment reference) |
| 24 Nov 2026 | A6 | 868183b | The server works out the plan from the brand's inputs with `pricing.ts`, fixes the fee by Paystack's `paid_at`, requires budget + fee, and saves version-2 terms (reward left empty). Checkout back on. Tested with real Paystack test charges: tampered rate refused; ₦33,000 verified saved (18 spots, ₦9,000 / ₦21,000); same payment twice gives one campaign; ₦30,000 underpayment refused; ₦16,500 open saved. The founder paid a ₦50,000 verified campaign through the builder and it saved correctly (30 spots, ₦15,000 / ₦35,000, ₦5,000 fee). All three campaigns deleted afterwards, at the founder's request |
| 24 Nov 2026 | A7 | `A7:` commit | Review dialog: version-2 campaigns show Runs (dates and length), Paid, and a read-only Pay terms panel (spots × post rate, view rate and share with paid views, most a post earns from views, most one creator earns, budget + fee = paid). Admin list: Budget, Paid, Rate and Ends. The shared pay label now reads "₦500/post + ₦700/1K views" or "₦400/1K views" everywhere it's used (a head start on A8). The progress bar counts the budget without the fee. **Database:** migration `20261124010000_admin_edit_keeps_length` makes admin edits and late approvals move the end date with the start (tested: a moved start keeps 14 days; a late approval keeps the length). **Plan change:** pay stays read-only in review instead of the admin editing the floor and cap. Two test campaigns created with Paystack test charges, checked, then deleted |
| 24 Nov 2026 | A8, A9 | `A8, A9:` commit | One commit, because both share new helpers in `campaign-utils.ts` (`maxEarnFor`, `earnLine`, `postEarnings`, `submittedMessage`, `campaignBudget`, `runsLabel`). **Creators:** the campaign page shows "You can earn up to ₦4,000", a one-line explanation ("You earn ₦500 when your post has been live 7 days, plus ₦700 for every 1,000 views in its first 14 days, up to ₦4,000. Post by 13 Dec."), and "Post by" for open campaigns; the after-posting message explains the stages; cards and sorting use the budget without the fee and the most a creator can earn; Earned totals (My campaigns, Submissions, Home) count only money actually paid, so version-2 posts show ₦0 until Phase B pays them. **Businesses:** Run campaigns and the campaign page count budget used against the budget, show "Runs 3 Dec to 17 Dec", and the campaign page shows Budget + fee = paid with the payment reference. Checked with two test campaigns (Paystack test charges, approved), then deleted |
| 24 Nov 2026 | A10 | `A10:` commit | Deleted `src/lib/campaignMath.ts` and `src/components/site/BudgetCalculator.tsx` (the dropped 70/30 model; nothing imported them). Removed the old pay constants from `campaignOptions.ts` (one-rate pay models, ₦300/₦675 floors, ₦5,000 minimum, `expectedBudget`, `rateLabel`); kept `MIN_PAID_VIEWS`, `MAX_PAID_VIEWS` and `viewsPayout` for approving version-1 posts. Pricing tests (12/12) and a production build pass. **Phase A is complete** |
