export const LEARNING_PROGRESS_SCHEMA_VERSION = 1 as const;
export const DEFAULT_DAILY_GOAL = 2;
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14] as const;

export type ReviewState = {
  dueAt: number;
  intervalDays: number;
  correctReviews: number;
  lapses: number;
  lastReviewedAt: number;
};

export type LearningActivity = "solve" | "practice" | "review";

export type DailyLearningRecord = Partial<Record<LearningActivity, true>>;

export type LearningProgress = {
  schemaVersion: typeof LEARNING_PROGRESS_SCHEMA_VERSION;
  dailyGoal: number;
  days: Record<string, DailyLearningRecord>;
  currentStreak: number;
  bestStreak: number;
  lastGoalDate: string | null;
};

export function createEmptyLearningProgress(): LearningProgress {
  return {
    schemaVersion: LEARNING_PROGRESS_SCHEMA_VERSION,
    dailyGoal: DEFAULT_DAILY_GOAL,
    days: {},
    currentStreak: 0,
    bestStreak: 0,
    lastGoalDate: null,
  };
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalDateKey(date = new Date()): string {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function shiftLocalDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day + days, 12);
  return getLocalDateKey(date);
}

export function getCalendarDayDifference(
  earlierDateKey: string,
  laterDateKey: string,
): number {
  const [earlierYear, earlierMonth, earlierDay] = earlierDateKey
    .split("-")
    .map(Number);
  const [laterYear, laterMonth, laterDay] = laterDateKey
    .split("-")
    .map(Number);
  const earlier = Date.UTC(earlierYear, earlierMonth - 1, earlierDay);
  const later = Date.UTC(laterYear, laterMonth - 1, laterDay);
  return Math.max(0, Math.round((later - earlier) / 86_400_000));
}

function startOfFutureLocalDay(now: number, days: number): number {
  const date = new Date(now);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
  ).getTime();
}

export function scheduleInitialMistake(now = Date.now()): ReviewState {
  return {
    dueAt: startOfFutureLocalDay(now, 1),
    intervalDays: 1,
    correctReviews: 0,
    lapses: 1,
    lastReviewedAt: now,
  };
}

export function scheduleReview(
  previous: ReviewState,
  correct: boolean,
  now = Date.now(),
): ReviewState {
  if (!correct) {
    return {
      dueAt: startOfFutureLocalDay(now, 1),
      intervalDays: 1,
      correctReviews: 0,
      lapses: previous.lapses + 1,
      lastReviewedAt: now,
    };
  }

  const nextInterval =
    REVIEW_INTERVAL_DAYS.find(
      (interval) => interval > previous.intervalDays,
    ) ?? REVIEW_INTERVAL_DAYS.at(-1)!;

  return {
    dueAt: startOfFutureLocalDay(now, nextInterval),
    intervalDays: nextInterval,
    correctReviews: previous.correctReviews + 1,
    lapses: previous.lapses,
    lastReviewedAt: now,
  };
}

export function countLearningActivities(
  record: DailyLearningRecord | undefined,
): number {
  if (!record) return 0;
  return (["solve", "practice", "review"] as const).filter(
    (activity) => record[activity],
  ).length;
}

function calculateCurrentStreak(
  days: Record<string, DailyLearningRecord>,
  dailyGoal: number,
  endDateKey: string,
): number {
  let streak = 0;
  let cursor = endDateKey;

  while (countLearningActivities(days[cursor]) >= dailyGoal) {
    streak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }

  return streak;
}

function trimDays(
  days: Record<string, DailyLearningRecord>,
  maximumDays = 90,
): Record<string, DailyLearningRecord> {
  return Object.fromEntries(
    Object.entries(days)
      .sort(([left], [right]) => right.localeCompare(left))
      .slice(0, maximumDays),
  );
}

export function recordLearningActivity(
  progress: LearningProgress,
  activity: LearningActivity,
  now = new Date(),
): LearningProgress {
  const dateKey = getLocalDateKey(now);
  if (progress.days[dateKey]?.[activity]) return progress;

  const days = trimDays({
    ...progress.days,
    [dateKey]: {
      ...progress.days[dateKey],
      [activity]: true,
    },
  });
  const metGoal = countLearningActivities(days[dateKey]) >= progress.dailyGoal;
  const currentStreak = metGoal
    ? calculateCurrentStreak(days, progress.dailyGoal, dateKey)
    : getVisibleCurrentStreak({ ...progress, days }, now);

  return {
    ...progress,
    days,
    currentStreak,
    bestStreak: Math.max(progress.bestStreak, currentStreak),
    lastGoalDate: metGoal ? dateKey : progress.lastGoalDate,
  };
}

export function getVisibleCurrentStreak(
  progress: LearningProgress,
  now = new Date(),
): number {
  if (!progress.lastGoalDate) return 0;

  const today = getLocalDateKey(now);
  const yesterday = shiftLocalDateKey(today, -1);
  if (
    progress.lastGoalDate !== today &&
    progress.lastGoalDate !== yesterday
  ) {
    return 0;
  }

  return progress.currentStreak;
}

export function mergeLearningProgress(
  ...progressItems: LearningProgress[]
): LearningProgress {
  if (progressItems.length === 0) return createEmptyLearningProgress();

  const dailyGoal = DEFAULT_DAILY_GOAL;
  const days: Record<string, DailyLearningRecord> = {};

  for (const progress of progressItems) {
    for (const [dateKey, record] of Object.entries(progress.days)) {
      days[dateKey] = {
        ...days[dateKey],
        ...record,
      };
    }
  }

  const trimmedDays = trimDays(days);
  const completedDates = Object.keys(trimmedDays)
    .filter(
      (dateKey) =>
        countLearningActivities(trimmedDays[dateKey]) >= dailyGoal,
    )
    .sort();
  const lastGoalDate = completedDates.at(-1) ?? null;
  const currentStreak = lastGoalDate
    ? calculateCurrentStreak(trimmedDays, dailyGoal, lastGoalDate)
    : 0;

  return {
    schemaVersion: LEARNING_PROGRESS_SCHEMA_VERSION,
    dailyGoal,
    days: trimmedDays,
    currentStreak,
    bestStreak: Math.max(
      currentStreak,
      ...progressItems.map((progress) => progress.bestStreak),
    ),
    lastGoalDate,
  };
}

export function isLearningProgress(value: unknown): value is LearningProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<LearningProgress>;
  return (
    progress.schemaVersion === LEARNING_PROGRESS_SCHEMA_VERSION &&
    typeof progress.dailyGoal === "number" &&
    progress.days !== null &&
    typeof progress.days === "object" &&
    typeof progress.currentStreak === "number" &&
    typeof progress.bestStreak === "number" &&
    (typeof progress.lastGoalDate === "string" ||
      progress.lastGoalDate === null)
  );
}
