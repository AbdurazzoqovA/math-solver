import assert from "node:assert/strict";
import test from "node:test";
import { getDaysAwayBucket } from "../src/lib/analytics.ts";

test("return intervals use stable low-cardinality buckets", () => {
  assert.equal(getDaysAwayBucket(1), "1");
  assert.equal(getDaysAwayBucket(2), "2_7");
  assert.equal(getDaysAwayBucket(7), "2_7");
  assert.equal(getDaysAwayBucket(8), "8_30");
  assert.equal(getDaysAwayBucket(30), "8_30");
  assert.equal(getDaysAwayBucket(31), "31_plus");
});
