import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyLearningProgress,
  getCalendarDayDifference,
  getLocalDateKey,
  getVisibleCurrentStreak,
  mergeLearningProgress,
  recordLearningActivity,
  scheduleInitialMistake,
  scheduleReview,
} from "../src/lib/learning-progress.ts";

test("a mistake is due at the start of the next local day", () => {
  const now = new Date(2026, 6, 26, 16, 30).getTime();
  const state = scheduleInitialMistake(now);

  assert.equal(state.intervalDays, 1);
  assert.equal(state.lapses, 1);
  assert.equal(
    state.dueAt,
    new Date(2026, 6, 27, 0, 0).getTime(),
  );
});

test("correct reviews advance through 1, 3, 7, and 14 days", () => {
  const now = new Date(2026, 6, 26, 10).getTime();
  let state = scheduleInitialMistake(now);

  state = scheduleReview(state, true, now);
  assert.equal(state.intervalDays, 3);
  state = scheduleReview(state, true, now);
  assert.equal(state.intervalDays, 7);
  state = scheduleReview(state, true, now);
  assert.equal(state.intervalDays, 14);
  state = scheduleReview(state, true, now);
  assert.equal(state.intervalDays, 14);
});

test("a wrong review resets the interval and increments lapses", () => {
  const previous = {
    ...scheduleInitialMistake(),
    intervalDays: 7,
    correctReviews: 2,
    lapses: 1,
  };
  const next = scheduleReview(previous, false);

  assert.equal(next.intervalDays, 1);
  assert.equal(next.correctReviews, 0);
  assert.equal(next.lapses, 2);
});

test("two distinct activities complete a daily goal and start a streak", () => {
  const now = new Date(2026, 6, 26, 15);
  let progress = createEmptyLearningProgress();
  progress = recordLearningActivity(progress, "solve", now);
  progress = recordLearningActivity(progress, "solve", now);
  assert.equal(progress.currentStreak, 0);

  progress = recordLearningActivity(progress, "practice", now);
  assert.equal(progress.currentStreak, 1);
  assert.equal(progress.bestStreak, 1);
});

test("progress merges guest and account activity without double counting", () => {
  const day = new Date(2026, 6, 26, 12);
  const guest = recordLearningActivity(
    createEmptyLearningProgress(),
    "solve",
    day,
  );
  const account = recordLearningActivity(
    createEmptyLearningProgress(),
    "review",
    day,
  );
  const merged = mergeLearningProgress(account, guest);

  assert.equal(merged.days[getLocalDateKey(day)].solve, true);
  assert.equal(merged.days[getLocalDateKey(day)].review, true);
  assert.equal(merged.currentStreak, 1);
});

test("a streak stays visible through the following day, then expires", () => {
  const goalDay = new Date(2026, 6, 24, 12);
  let progress = createEmptyLearningProgress();
  progress = recordLearningActivity(progress, "solve", goalDay);
  progress = recordLearningActivity(progress, "practice", goalDay);

  assert.equal(
    getVisibleCurrentStreak(progress, new Date(2026, 6, 25, 12)),
    1,
  );
  assert.equal(
    getVisibleCurrentStreak(progress, new Date(2026, 6, 26, 12)),
    0,
  );
});

test("calendar-day differences are stable across month and year boundaries", () => {
  assert.equal(getCalendarDayDifference("2026-07-31", "2026-08-01"), 1);
  assert.equal(getCalendarDayDifference("2025-12-31", "2026-01-02"), 2);
});
