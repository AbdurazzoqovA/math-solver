import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeDailyVideoQuota,
  videoQuotaPeriod,
} from "../src/lib/video/quota.ts";

const JULY_29_NOON_UTC = Date.UTC(2026, 6, 29, 12);

test("new video quotas allow ten generations per UTC day", () => {
  assert.deepEqual(
    normalizeDailyVideoQuota(undefined, 10, JULY_29_NOON_UTC),
    {
      used: 0,
      limit: 10,
      periodKey: "2026-07-29",
      resetsAt: Date.UTC(2026, 6, 30),
    },
  );
});

test("usage is retained only inside the current UTC day", () => {
  const current = normalizeDailyVideoQuota(
    { used: 7, limit: 10, periodKey: "2026-07-29" },
    10,
    JULY_29_NOON_UTC,
  );
  const reset = normalizeDailyVideoQuota(
    { used: 7, limit: 10, periodKey: "2026-07-28" },
    10,
    JULY_29_NOON_UTC,
  );

  assert.equal(current.used, 7);
  assert.equal(reset.used, 0);
  assert.equal(reset.periodKey, "2026-07-29");
});

test("the configured daily limit upgrades old five-video records", () => {
  const quota = normalizeDailyVideoQuota(
    { used: 4, limit: 5, periodKey: "2026-07-29" },
    10,
    JULY_29_NOON_UTC,
  );

  assert.equal(quota.used, 4);
  assert.equal(quota.limit, 10);
});

test("quota periods roll over exactly at UTC midnight", () => {
  assert.deepEqual(videoQuotaPeriod(Date.UTC(2026, 11, 31, 23, 59, 59)), {
    key: "2026-12-31",
    resetsAt: Date.UTC(2027, 0, 1),
  });
  assert.deepEqual(videoQuotaPeriod(Date.UTC(2027, 0, 1)), {
    key: "2027-01-01",
    resetsAt: Date.UTC(2027, 0, 2),
  });
});
