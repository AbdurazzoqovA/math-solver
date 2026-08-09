import assert from "node:assert/strict";
import test from "node:test";
import { buildMobileVersionPolicy } from "../src/lib/mobile-version-policy.ts";

test("current mobile versions are not prompted", () => {
  const policy = buildMobileVersionPolicy("1.0.0", {
    latestVersion: "1.0.0",
    minimumSupportedVersion: "1.0.0",
    storeUrl: "https://apps.apple.com/app/id123",
  });
  assert.equal(policy.action, "none");
});

test("ordinary releases encourage an optional update", () => {
  const policy = buildMobileVersionPolicy("1.0.0", {
    latestVersion: "1.1.0",
    minimumSupportedVersion: "1.0.0",
    storeUrl: "https://apps.apple.com/app/id123",
  });
  assert.equal(policy.action, "encourage");
});

test("compatibility and security releases may require an update", () => {
  for (const requiredReason of ["compatibility", "security"]) {
    const policy = buildMobileVersionPolicy("1.0.0", {
      latestVersion: "2.0.0",
      minimumSupportedVersion: "2.0.0",
      requiredReason,
      storeUrl: "https://apps.apple.com/app/id123",
    });
    assert.equal(policy.action, "required");
    assert.equal(policy.reason, requiredReason);
  }
});

test("marketing and ad changes cannot activate the hard gate", () => {
  const policy = buildMobileVersionPolicy("1.0.0", {
    latestVersion: "2.0.0",
    minimumSupportedVersion: "2.0.0",
    requiredReason: "ads",
    storeUrl: "https://apps.apple.com/app/id123",
  });
  assert.equal(policy.action, "encourage");
});

test("a missing store destination never strands users", () => {
  const policy = buildMobileVersionPolicy("1.0.0", {
    latestVersion: "2.0.0",
    minimumSupportedVersion: "2.0.0",
    requiredReason: "security",
  });
  assert.equal(policy.action, "none");
});
