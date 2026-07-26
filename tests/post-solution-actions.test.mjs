import assert from "node:assert/strict";
import test from "node:test";
import {
  buildStepExplanationPrompt,
  getSolutionStepNumbers,
  SIMILAR_PROBLEM_PROMPT,
} from "../src/lib/post-solution-actions.ts";

test("extracts a short solution into one ordered step list", () => {
  const solution = [
    "**Step 1: Start**",
    "Work.",
    "**Step 2:** Continue",
    "Work.",
    "### Step 3. Finish",
  ].join("\n");

  assert.deepEqual(getSolutionStepNumbers(solution), [1, 2, 3]);
});

test("scales to a twenty-step solution without dropping choices", () => {
  const solution = Array.from(
    { length: 20 },
    (_, index) => `**Step ${index + 1}: Detail**\nWork.`,
  ).join("\n\n");

  assert.deepEqual(
    getSolutionStepNumbers(solution),
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
});

test("follow-up prompts preserve the selected step and no-answer behavior", () => {
  assert.match(buildStepExplanationPrompt(17), /Step 17/);
  assert.match(SIMILAR_PROBLEM_PROMPT, /Do not reveal the solution yet/i);
  assert.match(SIMILAR_PROBLEM_PROMPT, /let me try it first/i);
});
