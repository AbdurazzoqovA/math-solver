"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import {
  countLearningActivities,
  createEmptyLearningProgress,
  getCalendarDayDifference,
  getLocalDateKey,
  getVisibleCurrentStreak,
  isLearningProgress,
  mergeLearningProgress,
  recordLearningActivity as addLearningActivity,
  type LearningActivity,
  type LearningProgress,
} from "@/lib/learning-progress";
import { getDaysAwayBucket, trackEvent } from "@/lib/analytics";

const GUEST_PROGRESS_KEY = "mathsolver_learning_progress_v1";
const ACCOUNT_PROGRESS_PREFIX = "mathsolver_learning_progress_user_";

type LearningProgressContextValue = {
  progress: LearningProgress;
  isProgressReady: boolean;
  todayActivityCount: number;
  dailyGoal: number;
  currentStreak: number;
  bestStreak: number;
  hasMetTodayGoal: boolean;
  recordLearningActivity: (activity: LearningActivity) => void;
};

const LearningProgressContext =
  createContext<LearningProgressContextValue | undefined>(undefined);

function accountProgressKey(userId: string) {
  return `${ACCOUNT_PROGRESS_PREFIX}${userId}`;
}

function loadProgress(storageKey: string): LearningProgress {
  if (typeof window === "undefined") return createEmptyLearningProgress();

  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return isLearningProgress(stored)
      ? stored
      : createEmptyLearningProgress();
  } catch {
    return createEmptyLearningProgress();
  }
}

function saveProgress(storageKey: string, progress: LearningProgress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch (error) {
    console.warn("Failed to persist learning progress:", error);
  }
}

export function LearningProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthReady, isFirebaseEnabled } = useAuth();
  const [progress, setProgress] = useState(createEmptyLearningProgress);
  const progressRef = useRef(progress);
  const [hydratedStorageKey, setHydratedStorageKey] =
    useState<string | null>(null);
  const storageKey =
    user && isFirebaseEnabled
      ? accountProgressKey(user.uid)
      : GUEST_PROGRESS_KEY;
  const isProgressReady = hydratedStorageKey === storageKey;

  useEffect(() => {
    if (!isAuthReady) return;

    let cancelled = false;
    const hydrateProgress = async () => {
      await Promise.resolve();
      if (cancelled) return;

      const guestProgress = loadProgress(GUEST_PROGRESS_KEY);
      let hydratedProgress = guestProgress;
      if (user && isFirebaseEnabled) {
        const userKey = accountProgressKey(user.uid);
        const accountProgress = loadProgress(userKey);
        const mergedProgress = mergeLearningProgress(
          accountProgress,
          guestProgress,
        );
        hydratedProgress = mergedProgress;
        saveProgress(userKey, mergedProgress);
        if (localStorage.getItem(GUEST_PROGRESS_KEY)) {
          localStorage.removeItem(GUEST_PROGRESS_KEY);
        }
        progressRef.current = mergedProgress;
        setProgress(mergedProgress);
      } else {
        progressRef.current = guestProgress;
        setProgress(guestProgress);
      }
      setHydratedStorageKey(storageKey);

      const today = getLocalDateKey();
      const previousActivityDate = Object.keys(
        hydratedProgress.days,
      )
        .filter((dateKey) => dateKey < today)
        .sort()
        .at(-1);
      const returnEventKey = `mathsolver_return_tracked_${today}`;
      if (
        previousActivityDate &&
        !sessionStorage.getItem(returnEventKey)
      ) {
        const daysAway = getCalendarDayDifference(
          previousActivityDate,
          today,
        );
        trackEvent("learning_return", {
          days_away: getDaysAwayBucket(daysAway),
        });
        sessionStorage.setItem(returnEventKey, "1");
      }
    };

    void hydrateProgress();
    return () => {
      cancelled = true;
    };
  }, [isAuthReady, isFirebaseEnabled, storageKey, user]);

  useEffect(() => {
    if (!isProgressReady) return;
    saveProgress(storageKey, progress);
  }, [isProgressReady, progress, storageKey]);

  const recordLearningActivity = useCallback(
    (activity: LearningActivity) => {
      if (!isProgressReady) return;
      const current = progressRef.current;
      const next = addLearningActivity(current, activity);
      if (next === current) return;

      const today = getLocalDateKey();
      const hadMetGoal =
        countLearningActivities(current.days[today]) >= current.dailyGoal;
      const hasMetGoal =
        countLearningActivities(next.days[today]) >= next.dailyGoal;

      progressRef.current = next;
      setProgress(next);
      trackEvent("learning_activity", { activity });
      if (!hadMetGoal && hasMetGoal) {
        trackEvent("daily_goal_completed", {
          completing_activity: activity,
          streak_days: next.currentStreak,
        });
      }
    },
    [isProgressReady],
  );

  const todayActivityCount = countLearningActivities(
    progress.days[getLocalDateKey()],
  );
  const currentStreak = getVisibleCurrentStreak(progress);

  const value = useMemo(
    () => ({
      progress,
      isProgressReady,
      todayActivityCount,
      dailyGoal: progress.dailyGoal,
      currentStreak,
      bestStreak: progress.bestStreak,
      hasMetTodayGoal: todayActivityCount >= progress.dailyGoal,
      recordLearningActivity,
    }),
    [
      currentStreak,
      isProgressReady,
      progress,
      recordLearningActivity,
      todayActivityCount,
    ],
  );

  return (
    <LearningProgressContext.Provider value={value}>
      {children}
    </LearningProgressContext.Provider>
  );
}

export function useLearningProgress() {
  const context = useContext(LearningProgressContext);
  if (!context) {
    throw new Error(
      "useLearningProgress must be used within a LearningProgressProvider",
    );
  }
  return context;
}
