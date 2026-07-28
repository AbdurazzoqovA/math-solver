import assert from "node:assert/strict";
import test from "node:test";
import { getProblemForAssistantMessage } from "../src/lib/video/problem-context.ts";

test("finds the nearest user problem for a solved assistant message", () => {
  const messages = [
    { id: "u1", role: "user", content: "Solve x + 3 = 8" },
    { id: "a1", role: "assistant", content: "**Step 1:** subtract 3" },
    { id: "u2", role: "user", content: "Why subtract three?" },
    { id: "a2", role: "assistant", content: "Because it is the inverse." },
  ];

  assert.equal(
    getProblemForAssistantMessage(messages, "a2"),
    "Why subtract three?",
  );
});

test("uses OCR text instead of the generic image placeholder", () => {
  const messages = [
    {
      id: "u1",
      role: "user",
      content: "Solve the above math problem.",
      images: [{ ocrText: "2x + y = 11\nx - y = 1" }],
    },
    { id: "a1", role: "assistant", content: "A solution" },
  ];

  assert.equal(
    getProblemForAssistantMessage(messages, "a1"),
    "2x + y = 11\nx - y = 1",
  );
});

test("returns null when the assistant has no preceding user message", () => {
  assert.equal(
    getProblemForAssistantMessage(
      [{ id: "a1", role: "assistant", content: "A solution" }],
      "a1",
    ),
    null,
  );
});
