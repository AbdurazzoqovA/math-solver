import assert from "node:assert/strict";
import test from "node:test";
import {
  getSafeAuthContinueUrl,
  isFirebaseAuthActionMode,
} from "../src/lib/firebase-auth-actions.ts";

test("recognizes only supported Firebase email action modes", () => {
  assert.equal(isFirebaseAuthActionMode("verifyEmail"), true);
  assert.equal(isFirebaseAuthActionMode("resetPassword"), true);
  assert.equal(isFirebaseAuthActionMode("recoverEmail"), true);
  assert.equal(isFirebaseAuthActionMode("signIn"), false);
  assert.equal(isFirebaseAuthActionMode(null), false);
});

test("allows same-origin continue URLs and preserves state", () => {
  assert.equal(
    getSafeAuthContinueUrl(
      "https://math-solver.io/?auth=verified#notebook",
      "https://math-solver.io",
    ),
    "https://math-solver.io/?auth=verified#notebook",
  );
});

test("blocks external, malformed, and handler-loop continue URLs", () => {
  const fallback = "https://math-solver.io/";
  assert.equal(
    getSafeAuthContinueUrl(
      "https://attacker.example/steal",
      "https://math-solver.io",
    ),
    fallback,
  );
  assert.equal(
    getSafeAuthContinueUrl("not a url", "https://math-solver.io"),
    fallback,
  );
  assert.equal(
    getSafeAuthContinueUrl(
      "https://math-solver.io/auth/action?mode=verifyEmail",
      "https://math-solver.io",
    ),
    fallback,
  );
});
