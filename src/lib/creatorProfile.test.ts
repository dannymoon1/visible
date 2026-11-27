import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanHandle, handleError, profileLink, usernameFromLink } from "./creatorProfile.ts";

test("handles are cleaned and checked", () => {
  assert.equal(cleanHandle("  @Ada.Cooks "), "ada.cooks");
  assert.equal(handleError("ada.cooks"), null);
  assert.equal(handleError("ab"), "Use at least 3 characters");
  assert.match(handleError("ada cooks") ?? "", /only letters/);
  assert.match(handleError("a".repeat(31)) ?? "", /30/);
});

test("a username becomes the profile address", () => {
  assert.deepEqual(profileLink("TikTok", "@ada.cooks"), { url: "https://www.tiktok.com/@ada.cooks", error: null });
  assert.equal(profileLink("Instagram", "ada_cooks").url, "https://www.instagram.com/ada_cooks");
  assert.equal(profileLink("YouTube", "AdaCooks").url, "https://www.youtube.com/@AdaCooks");
  assert.equal(profileLink("Facebook", "ada.okon").url, "https://www.facebook.com/ada.okon");
});

test("pasted links are tidied", () => {
  assert.equal(
    profileLink("Instagram", "https://www.instagram.com/ada_cooks/?igsh=abc123").url,
    "https://www.instagram.com/ada_cooks"
  );
  assert.equal(profileLink("TikTok", "tiktok.com/@ada").url, "https://tiktok.com/@ada");
  assert.equal(profileLink("TikTok", "https://vm.tiktok.com/ZMabc/").url, "https://vm.tiktok.com/ZMabc");
  assert.equal(
    profileLink("Facebook", "https://m.facebook.com/profile.php?id=1000123&mibextid=x").url,
    "https://m.facebook.com/profile.php?id=1000123&mibextid=x"
  );
  assert.equal(profileLink("YouTube", "http://youtube.com/@ada").url, "https://youtube.com/@ada");
});

test("wrong or empty links are refused", () => {
  assert.equal(profileLink("TikTok", "https://www.instagram.com/ada").error, "This isn't a link to TikTok");
  assert.match(profileLink("Instagram", "https://instagram.com/").error ?? "", /own Instagram profile/);
  assert.match(profileLink("TikTok", "").error ?? "", /Add your TikTok/);
  assert.match(profileLink("TikTok", "my name").error ?? "", /Paste your TikTok/);
});

test("usernames come back out of saved links", () => {
  assert.equal(usernameFromLink("https://www.tiktok.com/@ada"), "ada");
  assert.equal(usernameFromLink("https://www.instagram.com/ada_cooks"), "ada_cooks");
  assert.equal(usernameFromLink("https://m.facebook.com/profile.php?id=1000123"), "1000123");
});
