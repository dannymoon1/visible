// Tests for the screen 4 rules: contacts, reference link names, brief gaps.
// Run: pnpm test:campaign

import { test } from "node:test";
import assert from "node:assert/strict";
import { contactDisplay, contactHref, normalizeContact } from "./campaignContact.ts";
import { describeLink } from "./referenceLinks.ts";
import { BRIEF_EXAMPLES, briefGaps } from "./briefExamples.ts";

test("WhatsApp numbers in any common form become +234", () => {
  for (const raw of ["0801 234 5678", "08012345678", "+234 801 234 5678", "2348012345678", "801-234-5678", "0703 111 2222", "0915 000 1111"]) {
    const r = normalizeContact("whatsapp", raw);
    assert.ok(r.value?.startsWith("+234"), raw);
    assert.equal(r.value?.length, 14, raw);
  }
  assert.equal(normalizeContact("whatsapp", "0801 234 5678").value, "+2348012345678");
  assert.equal(contactDisplay("whatsapp", "+2348012345678"), "+234 801 234 5678");
  assert.equal(contactHref("whatsapp", "+2348012345678"), "https://wa.me/2348012345678");
});

test("bad WhatsApp numbers are refused", () => {
  for (const raw of ["", "12345", "0601 234 5678", "0801 234 567", "0801 234 56789"]) {
    assert.ok(normalizeContact("whatsapp", raw).error, raw);
  }
});

test("social pages must be on a social platform; websites get https", () => {
  assert.equal(normalizeContact("social", "instagram.com/mamaekaette").value, "https://instagram.com/mamaekaette");
  assert.equal(normalizeContact("social", "https://www.tiktok.com/@mama").value, "https://www.tiktok.com/@mama");
  assert.ok(normalizeContact("social", "mamaekaette.com").error);
  assert.equal(normalizeContact("website", "mamaekaette.com").value, "https://mamaekaette.com");
  assert.ok(normalizeContact("website", "not a site").error);
  assert.equal(contactDisplay("website", "https://www.mamaekaette.com"), "mamaekaette.com");
});

test("addresses need a street and area", () => {
  assert.ok(normalizeContact("address", "Uyo").error);
  assert.equal(normalizeContact("address", "  12 Aka   Road, Uyo ").value, "12 Aka Road, Uyo");
  assert.equal(contactHref("address", "12 Aka Road, Uyo"), null);
});

test("reference links are named by platform and account", () => {
  assert.deepEqual(describeLink("https://www.tiktok.com/@nkem.styles/video/123"), { platform: "TikTok", label: "@nkem.styles" });
  assert.deepEqual(describeLink("https://vm.tiktok.com/ZMabc/"), { platform: "TikTok", label: "TikTok video" });
  assert.deepEqual(describeLink("https://www.instagram.com/reel/Cxyz/"), { platform: "Instagram", label: "Instagram reel" });
  assert.deepEqual(describeLink("https://instagram.com/mamaekaette"), { platform: "Instagram", label: "@mamaekaette" });
  assert.deepEqual(describeLink("https://youtube.com/shorts/abc"), { platform: "YouTube Shorts", label: "YouTube Short" });
  assert.deepEqual(describeLink("https://youtu.be/abc"), { platform: "YouTube", label: "YouTube video" });
  assert.deepEqual(describeLink("https://www.facebook.com/share/v/abc"), { platform: "Facebook", label: "Facebook post" });
  assert.deepEqual(describeLink("https://mamaekaette.com/menu"), { platform: null, label: "mamaekaette.com" });
});

test("every example brief fits, and has gaps to fill", () => {
  for (const e of BRIEF_EXAMPLES) {
    assert.ok(e.brief.length <= 500, e.key);
    assert.ok(briefGaps(e.brief).length >= 2, e.key);
  }
  assert.deepEqual(
    briefGaps("Visit [address] for ₦[price]").map((g) => g.text),
    ["[address]", "[price]"]
  );
  assert.equal(briefGaps("No gaps here").length, 0);
});
