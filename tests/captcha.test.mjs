import assert from "node:assert/strict";
import test from "node:test";

import { validateRequest } from "../src/lib/captcha.ts";

const originalSecret = process.env.TURNSTILE_SECRET_KEY;
const originalFetch = globalThis.fetch;

function request(body) {
  return new Request("https://math-solver.io/api/video/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.10",
    },
    body: JSON.stringify(body),
  });
}

function strictOptions() {
  return {
    requireCaptcha: true,
    failClosed: true,
    expectedAction: "mathsolver_request",
    allowedHostnames: ["math-solver.io", "www.math-solver.io"],
  };
}

test.afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
  } else {
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
  }
  globalThis.fetch = originalFetch;
});

test("required verification rejects a missing production secret", async () => {
  delete process.env.TURNSTILE_SECRET_KEY;

  const result = await validateRequest(
    request({ captchaToken: "token", problem: "x + 1 = 2" }),
    strictOptions(),
  );

  assert.equal(result.allowed, false);
  assert.equal(result.status, 503);
});

test("required verification rejects a missing client token", async () => {
  process.env.TURNSTILE_SECRET_KEY = "server-secret";

  const result = await validateRequest(
    request({ problem: "x + 1 = 2" }),
    strictOptions(),
  );

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
});

test("required verification rejects an oversized client token", async () => {
  process.env.TURNSTILE_SECRET_KEY = "server-secret";
  let requested = false;
  globalThis.fetch = async () => {
    requested = true;
    return Response.json({ success: true });
  };

  const result = await validateRequest(
    request({ captchaToken: "x".repeat(2_049), problem: "x + 1 = 2" }),
    strictOptions(),
  );

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
  assert.equal(requested, false);
});

test("required verification accepts the expected action and hostname", async () => {
  process.env.TURNSTILE_SECRET_KEY = "server-secret";
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      hostname: "math-solver.io",
      action: "mathsolver_request",
    });

  const result = await validateRequest(
    request({ captchaToken: "token", problem: "x + 1 = 2" }),
    strictOptions(),
  );

  assert.equal(result.allowed, true);
  assert.deepEqual(result.body, { problem: "x + 1 = 2" });
});

test("required verification rejects tokens from another hostname", async () => {
  process.env.TURNSTILE_SECRET_KEY = "server-secret";
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      hostname: "attacker.example",
      action: "mathsolver_request",
    });

  const result = await validateRequest(
    request({ captchaToken: "token", problem: "x + 1 = 2" }),
    strictOptions(),
  );

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
});

test("required verification rejects tokens for another action", async () => {
  process.env.TURNSTILE_SECRET_KEY = "server-secret";
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      hostname: "math-solver.io",
      action: "different_action",
    });

  const result = await validateRequest(
    request({ captchaToken: "token", problem: "x + 1 = 2" }),
    strictOptions(),
  );

  assert.equal(result.allowed, false);
  assert.equal(result.status, 403);
});

test("required verification fails closed when Siteverify is unavailable", async () => {
  process.env.TURNSTILE_SECRET_KEY = "server-secret";
  globalThis.fetch = async () => {
    throw new TypeError("network unavailable");
  };

  const result = await validateRequest(
    request({ captchaToken: "token", problem: "x + 1 = 2" }),
    strictOptions(),
  );

  assert.equal(result.allowed, false);
  assert.equal(result.status, 503);
});

test("a separately attested client only parses and strips captcha data", async () => {
  delete process.env.TURNSTILE_SECRET_KEY;

  const result = await validateRequest(
    request({ captchaToken: null, problem: "x + 1 = 2" }),
    { captchaAlreadyVerified: true },
  );

  assert.equal(result.allowed, true);
  assert.deepEqual(result.body, { problem: "x + 1 = 2" });
});
