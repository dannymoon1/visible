import { test } from "node:test";
import assert from "node:assert/strict";
import { amountToPay, bankSheet, buildRun, earnedByFor, toCsv, type RunCreator, type RunPost } from "./payoutRun.ts";

const THROUGH = "2026-11-30";
const PAYDAY = "2026-12-05";

const verified = (over: Partial<RunPost>): RunPost => ({
  id: "p1", userId: "ada", taskId: "t1", taskTitle: "Verified test", campaignType: "verified",
  postRate: 500, viewRate: 700, viewFloor: 0, maxViewPayout: 3500, viewPool: 21000,
  endDate: "2026-11-14", postedOn: "2026-11-10", views: 2000, postUrl: "https://tiktok.com/@ada/video/1", platform: "TikTok",
  ...over,
});
const open = (over: Partial<RunPost>): RunPost => ({
  id: "p2", userId: "ada", taskId: "t2", taskTitle: "Launch campaign", campaignType: "open",
  postRate: 0, viewRate: 400, viewFloor: 1000, maxViewPayout: 2000, viewPool: 15000,
  endDate: "2026-12-11", postedOn: "2026-11-28", views: 3000, postUrl: null, platform: "Instagram",
  ...over,
});
const creator = (id: string, over: Partial<RunCreator> = {}): RunCreator => ({
  id, handle: id, name: id, email: `${id}@example.com`, verified: false, balance: 0,
  bank: { bankName: "Opay", accountNumber: id === "ada" ? "0123456789" : "9876543210", accountName: id },
  ...over,
});

test("the payout day pays what was earned by the end of the month before", () => {
  assert.equal(earnedByFor("2026-12-05"), "2026-11-30");
  assert.equal(earnedByFor("2027-01-05"), "2026-12-31");
});

test("a finished verified post is due: post fee plus its view pay", () => {
  const run = buildRun([verified({})], [creator("ada")], THROUGH, PAYDAY);
  const ada = run.creators[0]!;
  // 2,000 views × ₦700 per 1,000 = ₦1,400; post fee ₦500 earned on 17 Nov
  assert.equal(ada.posts[0]!.postFeeDueOn, "2026-11-17");
  assert.equal(ada.posts[0]!.viewPay, 1400);
  assert.equal(ada.dueNow, 1900);
  assert.equal(ada.notDueYet, 0);
});

test("a post on a campaign still running is earned but not due", () => {
  const run = buildRun([open({})], [creator("ada")], THROUGH, PAYDAY);
  const ada = run.creators[0]!;
  // 3,000 views × ₦400 = ₦1,200, final 25 Dec (end 11 Dec + 14 days)
  assert.equal(ada.posts[0]!.viewsFinalOn, "2026-12-25");
  assert.equal(ada.dueNow, 0);
  assert.equal(ada.notDueYet, 1200);
  assert.equal(amountToPay(ada, run.minimum, false), 0);
  assert.equal(amountToPay(ada, run.minimum, true), 1200);
});

test("open posts under 1,000 views earn nothing; the maximum caps the rest", () => {
  const run = buildRun(
    [open({ id: "a", views: 900 }), open({ id: "b", views: 9000 })],
    [creator("ada")],
    "2026-12-31",
    "2027-01-05"
  );
  assert.deepEqual(run.creators[0]!.posts.map((p) => p.viewPay), [0, 2000]);
});

test("views past the view share are cut by the same percentage for everyone", () => {
  const run = buildRun(
    [verified({ id: "a", viewPool: 1000 }), verified({ id: "b", userId: "ben", viewPool: 1000 })],
    [creator("ada"), creator("ben")],
    THROUGH,
    PAYDAY
  );
  // Two ₦1,400 estimates against a ₦1,000 share: each gets ₦500
  for (const c of run.creators) {
    assert.equal(c.posts[0]!.viewPay, 500);
    assert.equal(Math.round(c.posts[0]!.viewScale * 100), 36);
  }
});

test("older campaigns' balance is owed; flags stop a transfer", () => {
  const run = buildRun(
    [verified({ id: "a", userId: "ada", views: null }), verified({ id: "b", userId: "ben" })],
    [
      creator("ada", { balance: 300 }),
      creator("ben", { bank: { bankName: "GTBank", accountNumber: "0123456789", accountName: "Ben" } }),
      creator("cy", { bank: null, balance: 2500 }),
    ],
    THROUGH,
    PAYDAY
  );
  const by = Object.fromEntries(run.creators.map((c) => [c.id, c]));
  // Ada: ₦300 balance + ₦500 post fee = ₦800, under the ₦1,000 minimum; views missing; shares Ben's account
  assert.equal(by.ada!.dueNow, 800);
  assert.deepEqual(by.ada!.flags.sort(), ["below_minimum", "missing_views", "shared_account"]);
  assert.deepEqual(by.ben!.flags, ["shared_account"]);
  assert.equal(amountToPay(by.ben!, run.minimum, false), 0);
  assert.deepEqual(by.cy!.flags, ["no_bank"]);
  assert.equal(amountToPay(by.cy!, run.minimum, false), 0);
});

test("the bank sheet lists only creators this run pays", () => {
  const run = buildRun([verified({})], [creator("ada")], THROUGH, PAYDAY);
  const lines = bankSheet(run, false).trim().split("\r\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[1], "ada,0123456789,Opay,1900,Visibility payout Dec 2026,ada,ada@example.com");
});

test("CSV cells are quoted and can't become formulas", () => {
  assert.equal(toCsv([["Okon, Ada", 'Say "hi"', "=SUM(A1)"]]), '"Okon, Ada","Say ""hi""",\'=SUM(A1)\r\n');
});
