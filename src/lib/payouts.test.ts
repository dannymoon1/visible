import { test } from "node:test";
import assert from "node:assert/strict";
import { accountNumberError, cleanAccountNumber, minimumPayout, nextPayoutDate } from "./payouts.ts";

const iso = (d: Date) => d.toISOString().slice(0, 10);

test("the next payout is the 5th", () => {
  assert.equal(iso(nextPayoutDate(new Date("2026-11-27T10:00:00Z"))), "2026-12-05");
  assert.equal(iso(nextPayoutDate(new Date("2026-12-03T10:00:00Z"))), "2026-12-05");
  assert.equal(iso(nextPayoutDate(new Date("2026-12-05T10:00:00Z"))), "2026-12-05");
  assert.equal(iso(nextPayoutDate(new Date("2026-12-06T10:00:00Z"))), "2027-01-05");
  // 23:30 UTC on 5 Dec is already 6 Dec in Lagos
  assert.equal(iso(nextPayoutDate(new Date("2026-12-05T23:30:00Z"))), "2027-01-05");
});

test("the minimum is ₦1,000 until 31 January 2027, then ₦5,000", () => {
  assert.equal(minimumPayout(nextPayoutDate(new Date("2026-11-27T10:00:00Z"))), 1000);
  assert.equal(minimumPayout(nextPayoutDate(new Date("2027-01-10T10:00:00Z"))), 5000); // paid 5 Feb
  assert.equal(minimumPayout(nextPayoutDate(new Date("2026-12-20T10:00:00Z"))), 1000); // paid 5 Jan
});

test("account numbers have 10 digits", () => {
  assert.equal(cleanAccountNumber("012 345-6789"), "0123456789");
  assert.equal(accountNumberError("0123456789"), null);
  assert.ok(accountNumberError("12345"));
});
