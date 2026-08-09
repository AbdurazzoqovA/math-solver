import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTACT_FIELD_LIMITS,
  formatTelegramContactMessage,
  parseContactSubmission,
} from "../src/lib/contact.ts";

test("contact submissions are normalized and accepted", () => {
  assert.deepEqual(
    parseContactSubmission({
      firstName: "  Ada   Lovelace ",
      email: " ADA@Example.com ",
      message: "  I found a problem with a calculus answer.  ",
    }),
    {
      ok: true,
      value: {
        firstName: "Ada Lovelace",
        email: "ADA@Example.com",
        message: "I found a problem with a calculus answer.",
      },
    },
  );
});

test("contact submissions reject missing and malformed fields", () => {
  const result = parseContactSubmission({
    firstName: "",
    email: "not-an-email",
    message: "",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.deepEqual(Object.keys(result.errors).sort(), [
      "email",
      "firstName",
      "message",
    ]);
  }
});

test("contact submissions enforce Telegram-safe field limits", () => {
  const result = parseContactSubmission({
    firstName: "A",
    email: "ada@example.com",
    message: "x".repeat(CONTACT_FIELD_LIMITS.message + 1),
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.message);
});

test("Telegram messages use plain text and stay within the platform limit", () => {
  const text = formatTelegramContactMessage({
    firstName: "Ada <b>Lovelace</b>",
    email: "ada@example.com",
    message: "<script>This remains plain text.</script>",
  });

  assert.match(text, /First name: Ada <b>Lovelace<\/b>/);
  assert.match(text, /<script>This remains plain text\.<\/script>/);

  const maximumText = formatTelegramContactMessage({
    firstName: "A".repeat(CONTACT_FIELD_LIMITS.firstName),
    email: `${"a".repeat(242)}@example.com`,
    message: "x".repeat(CONTACT_FIELD_LIMITS.message),
  });
  assert.ok(maximumText.length < 4_096);
});
