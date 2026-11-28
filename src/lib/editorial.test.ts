import assert from "node:assert/strict";
import { test } from "node:test";
import { isHttpUrl, parseUtcInput, publishBlockers, slugify, SLUG_PATTERN, toUtcInput } from "./editorial";

test("a story with approved English, sources and no flags can be published", () => {
  assert.deepEqual(publishBlockers({ englishApproved: true, flaggedClaims: 0, sourceCount: 2 }), []);
});

test("every missing step is listed", () => {
  const out = publishBlockers({ englishApproved: false, flaggedClaims: 2, sourceCount: 0 });
  assert.equal(out.length, 3);
  assert.match(out[1], /2 flagged claims/);
});

test("one flagged claim blocks publishing", () => {
  assert.deepEqual(publishBlockers({ englishApproved: true, flaggedClaims: 1, sourceCount: 1 }), [
    "Resolve 1 flagged claim.",
  ]);
});

test("slugs are plain lowercase words joined by hyphens", () => {
  assert.equal(slugify("Aid convoys reach El-Fasher, UN says"), "aid-convoys-reach-el-fasher-un-says");
  assert.equal(slugify("Côte d’Ivoire: talks resume"), "cote-divoire-talks-resume");
  assert.equal(slugify("گلوبل"), "");
  assert.ok(SLUG_PATTERN.test(slugify("  Russia–Ukraine  ")));
  assert.ok(!SLUG_PATTERN.test("Bad Slug"));
});

test("only web links count as sources", () => {
  assert.ok(isHttpUrl("https://example.org/a"));
  assert.ok(!isHttpUrl("javascript:alert(1)"));
  assert.ok(!isHttpUrl("not a url"));
});

test("form times are read and written as UTC", () => {
  const d = parseUtcInput("2026-11-28T09:30");
  assert.equal(d?.toISOString(), "2026-11-28T09:30:00.000Z");
  assert.equal(toUtcInput(d), "2026-11-28T09:30");
  assert.equal(parseUtcInput("28/11/2026"), null);
});
