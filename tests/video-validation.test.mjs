import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeLessonObjectKey,
  isStoredVideoLessonManifest,
  parseCreateVideoJobInput,
} from "../src/lib/video/validation.ts";

const interaction = {
  id: "check-one",
  afterClip: "idea-one",
  eyebrow: "Check the idea",
  prompt: "What stays equal?",
  options: [
    { id: "both-sides", label: "Both sides" },
    { id: "left-only", label: "Only the left side" },
  ],
  correctOptionId: "both-sides",
  correctFeedback: "Correct.",
  incorrectFeedback: "Look at both sides.",
};

function validManifest() {
  return {
    schemaVersion: 1,
    lessonId: "job-1",
    title: "Keep an equation balanced",
    problem: "x + 3 = 8",
    learningGoal: "Understand equality.",
    disclosure: "AI-generated voice",
    clips: [
      {
        id: "idea-one",
        step: 1,
        title: "Equality",
        durationSeconds: 8.2,
        videoObjectKey: "video-lessons/u/job/clips/01.mp4",
        captionsObjectKey: "video-lessons/u/job/captions/01.vtt",
        posterObjectKey: "video-lessons/u/job/posters/01.jpg",
      },
    ],
    interactions: [interaction],
    transferCheck: { ...interaction, id: "transfer" },
    completion: {
      title: "You transferred the idea.",
      body: "The strategy works on a similar equation.",
    },
  };
}

test("accepts a bounded video job input and trims whitespace", () => {
  assert.deepEqual(
    parseCreateVideoJobInput({
      requestKey: " chat:answer ",
      problem: " x + 3 = 8 ",
      solution: " **Step 1:** subtract three ",
    }),
    {
      requestKey: "chat:answer",
      problem: "x + 3 = 8",
      solution: "**Step 1:** subtract three",
    },
  );
});

test("rejects empty or oversized video job fields", () => {
  assert.equal(
    parseCreateVideoJobInput({
      requestKey: "job",
      problem: "",
      solution: "answer",
    }),
    null,
  );
  assert.equal(
    parseCreateVideoJobInput({
      requestKey: "job",
      problem: "x",
      solution: "a".repeat(40_001),
    }),
    null,
  );
});

test("validates the stored lesson contract and interaction references", () => {
  assert.equal(isStoredVideoLessonManifest(validManifest()), true);
  const invalid = validManifest();
  invalid.interactions[0].afterClip = "missing";
  assert.equal(isStoredVideoLessonManifest(invalid), false);
});

test("object keys cannot escape their user and job prefix", () => {
  const prefix = "video-lessons/u/job/";
  assert.equal(
    isSafeLessonObjectKey(
      "video-lessons/u/job/clips/01.mp4",
      prefix,
    ),
    true,
  );
  assert.equal(
    isSafeLessonObjectKey(
      "video-lessons/u/job/../other/secret.mp4",
      prefix,
    ),
    false,
  );
  assert.equal(
    isSafeLessonObjectKey(
      "video-lessons/another/job/clips/01.mp4",
      prefix,
    ),
    false,
  );
});
