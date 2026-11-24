// Tests for the pricing rules (docs/plans/pricing-and-pay.md → Worked examples).
// Run: pnpm test:pricing

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  feeRateOn,
  minimumPayoutOn,
  payoutDateFor,
  planCampaign,
  settleViews,
  viewPayFor,
  addDays,
  daysBetween,
} from "./pricing.ts";

const launch = new Date("2026-12-01T10:00:00Z");

test("fee: 10% until 31 January 2027 (Lagos time), 20% from 1 February", () => {
  assert.equal(feeRateOn(new Date("2027-01-31T22:59:00Z")), 0.1); // 23:59 in Lagos
  assert.equal(feeRateOn(new Date("2027-01-31T23:00:00Z")), 0.2); // midnight in Lagos
  assert.equal(feeRateOn(new Date("2027-03-01T00:00:00Z")), 0.2);
});

test("worked example: open, ₦15,000 at ₦400 per 1,000 views", () => {
  const p = planCampaign({ type: "open", budget: 15000, viewRate: 400, paidAt: launch });
  assert.deepEqual(p.errors, []);
  assert.equal(p.fee, 1500);
  assert.equal(p.total, 16500);
  assert.equal(p.spots, null);
  assert.equal(p.postPool, 0);
  assert.equal(p.viewPool, 15000);
  assert.equal(p.maxViewPayout, 2000);
  assert.equal(p.viewCap, 5000);
  assert.equal(p.paidViews, 37500);
  assert.equal(p.creatorsMin, 8);
  assert.equal(p.creatorsMax, 37);
  assert.equal(p.maxPerCreator, 2000);
});

test("worked example: verified, ₦30,000 at ₦500 per post and ₦700 per 1,000 views", () => {
  const p = planCampaign({ type: "verified", budget: 30000, postRate: 500, viewRate: 700, paidAt: launch });
  assert.deepEqual(p.errors, []);
  assert.equal(p.fee, 3000);
  assert.equal(p.total, 33000);
  assert.equal(p.spots, 18);
  assert.equal(p.postPool, 9000);
  assert.equal(p.viewPool, 21000);
  assert.equal(p.maxViewPayout, 3500);
  assert.equal(p.paidViews, 30000);
  assert.equal(p.maxPerCreator, 4000);
  assert.equal(p.creatorsMin, 18);
});

test("rounding: leftover from the post share joins the view share", () => {
  const p = planCampaign({ type: "verified", budget: 30000, postRate: 700, viewRate: 700, paidAt: launch });
  assert.equal(p.spots, 12);
  assert.equal(p.postPool, 8400);
  assert.equal(p.viewPool, 21600);
});

test("the fee after the launch period is 20%", () => {
  const p = planCampaign({ type: "verified", budget: 30000, postRate: 500, viewRate: 700, paidAt: new Date("2027-02-10T12:00:00Z") });
  assert.equal(p.fee, 6000);
  assert.equal(p.total, 36000);
});

test("errors: minimum budget, rate floors and the maximum view payout", () => {
  const low = planCampaign({ type: "verified", budget: 26000, postRate: 500, viewRate: 700, paidAt: launch });
  assert.equal(low.errors[0]?.field, "budget");
  assert.match(low.errors[0]?.message ?? "", /Add ₦4,000 to reach the ₦30,000 minimum/);

  const openRate = planCampaign({ type: "open", budget: 15000, viewRate: 350, paidAt: launch });
  assert.ok(openRate.errors.some((e) => e.field === "viewRate"));
  const openOk = planCampaign({ type: "open", budget: 15000, viewRate: 400, paidAt: launch });
  assert.deepEqual(openOk.errors, []);

  const verifiedRate = planCampaign({ type: "verified", budget: 30000, postRate: 500, viewRate: 500, paidAt: launch });
  assert.ok(verifiedRate.errors.some((e) => e.field === "viewRate"));

  const postRate = planCampaign({ type: "verified", budget: 30000, postRate: 200, viewRate: 700, paidAt: launch });
  assert.ok(postRate.errors.some((e) => e.field === "postRate"));

  const capLow = planCampaign({ type: "open", budget: 15000, viewRate: 500, maxViewPayout: 400, paidAt: launch });
  assert.ok(capLow.errors.some((e) => e.field === "maxViewPayout"));
  const capHigh = planCampaign({ type: "open", budget: 15000, viewRate: 500, maxViewPayout: 16000, paidAt: launch });
  assert.ok(capHigh.errors.some((e) => e.field === "maxViewPayout"));
});

test("a raised maximum view payout lets one post earn more, and the founder's example holds", () => {
  // ₦1,000 per 1,000 views with a ₦5,000 maximum: 10,000 views still earn ₦5,000
  const p = planCampaign({ type: "verified", budget: 50000, postRate: 500, viewRate: 1000, maxViewPayout: 5000, paidAt: launch });
  assert.deepEqual(p.errors, []);
  assert.equal(p.viewCap, 5000);
  assert.equal(viewPayFor(10000, p), 5000);
  assert.equal(viewPayFor(5000, p), 5000);
  assert.equal(viewPayFor(2500, p), 2500);
});

test("view pay: open has a 1,000-view floor, verified pays from the first view", () => {
  const open = planCampaign({ type: "open", budget: 15000, viewRate: 400, paidAt: launch });
  assert.equal(viewPayFor(999, open), 0);
  assert.equal(viewPayFor(1000, open), 400);
  assert.equal(viewPayFor(3400, open), 1360);
  assert.equal(viewPayFor(12000, open), 2000);

  const verified = planCampaign({ type: "verified", budget: 30000, postRate: 500, viewRate: 700, paidAt: launch });
  assert.equal(viewPayFor(400, verified), 280);
  assert.equal(viewPayFor(0, verified), 0);
});

test("settling: paid in full when views stay inside the share; leftover becomes credit", () => {
  const s = settleViews([3500, 2000, 1500], 21000);
  assert.equal(s.scale, 1);
  assert.deepEqual(s.amounts, [3500, 2000, 1500]);
  assert.equal(s.paid, 7000);
  assert.equal(s.leftover, 14000);
});

test("settling: everyone gets the same percentage when views go past the share (D3)", () => {
  // 18 creators each earn the ₦3,500 maximum: ₦63,000 against a ₦21,000 share
  const s = settleViews(Array(18).fill(3500), 21000);
  assert.ok(Math.abs(s.scale - 1 / 3) < 1e-9);
  assert.ok(s.amounts.every((a) => a === 1166));
  assert.ok(s.paid <= 21000);
  assert.equal(s.leftover, 21000 - 1166 * 18);
});

test("payouts: earned by month-end, paid on the 5th of the next month; minimum by date", () => {
  assert.equal(payoutDateFor(new Date("2026-11-24T12:00:00Z")), "2026-12-05");
  assert.equal(payoutDateFor(new Date("2026-12-31T22:00:00Z")), "2027-01-05"); // 23:00 in Lagos
  assert.equal(payoutDateFor(new Date("2026-12-31T23:30:00Z")), "2027-02-05"); // already 1 Jan in Lagos
  assert.equal(minimumPayoutOn(new Date("2027-01-15T12:00:00Z")), 1000);
  assert.equal(minimumPayoutOn(new Date("2027-02-05T12:00:00Z")), 5000);
});

test("dates: adding days and counting them", () => {
  assert.equal(addDays("2026-12-03", 14), "2026-12-17");
  assert.equal(daysBetween("2026-12-03", "2027-01-02"), 30);
});
