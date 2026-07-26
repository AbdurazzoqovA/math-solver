"use client";

import { ArrowRight, Check, Flame, Target } from "lucide-react";
import { useLearningProgress } from "@/context/LearningProgressContext";
import { trackEvent } from "@/lib/analytics";
import { getLocalDateKey } from "@/lib/learning-progress";

export default function DailyGoal({
  isExpanded,
  dueReviewCount,
  onStartSolve,
  onOpenPractice,
  onOpenReview,
}: {
  isExpanded: boolean;
  dueReviewCount: number;
  onStartSolve: () => void;
  onOpenPractice: () => void;
  onOpenReview: () => void;
}) {
  const {
    progress,
    isProgressReady,
    todayActivityCount,
    dailyGoal,
    currentStreak,
    hasMetTodayGoal,
  } = useLearningProgress();
  const completed = Math.min(todayActivityCount, dailyGoal);
  const label = isProgressReady
    ? `${completed} of ${dailyGoal} learning activities today. ${currentStreak} day streak.`
    : "Loading daily learning goal.";
  const todayRecord = progress.days[getLocalDateKey()] ?? {};
  const nextAction = hasMetTodayGoal
    ? null
    : !todayRecord.solve
      ? {
          id: "solve",
          label: "Start a solve",
          onClick: onStartSolve,
        }
      : dueReviewCount > 0 && !todayRecord.review
        ? {
            id: "review",
            label: `Review ${Math.min(dueReviewCount, 5)} due`,
            onClick: onOpenReview,
          }
        : {
            id: "practice",
            label: "Open practice",
            onClick: onOpenPractice,
          };

  const runNextAction = () => {
    if (!nextAction) return;
    trackEvent("daily_goal_action_clicked", {
      action: nextAction.id,
    });
    nextAction.onClick();
  };

  const compactContents = (
    <>
      {hasMetTodayGoal ? (
        <Check className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Target className="h-5 w-5" aria-hidden="true" />
      )}
      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-800 px-1 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
        {completed}
      </span>
    </>
  );

  if (!isExpanded) {
    const compactClassName = `relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl border transition-colors ${
      hasMetTodayGoal
        ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-400"
        : "border-black/5 bg-white text-primary-600 hover:border-primary-200 hover:bg-primary-50 dark:border-white/5 dark:bg-zinc-900 dark:text-primary-400 dark:hover:border-primary-800"
    }`;

    if (nextAction) {
      return (
        <button
          type="button"
          aria-label={`${label} ${nextAction.label}.`}
          title={nextAction.label}
          onClick={runNextAction}
          className={compactClassName}
        >
          {compactContents}
        </button>
      );
    }

    return (
      <div
        aria-label={label}
        title={label}
        className={compactClassName}
      >
        {compactContents}
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      className="rounded-2xl border border-black/5 bg-white/80 px-4 py-3 dark:border-white/5 dark:bg-zinc-900/70"
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            hasMetTodayGoal
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/35 dark:text-emerald-400"
              : "bg-primary-50 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400"
          }`}
        >
          {hasMetTodayGoal ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Target className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground">
            <span>Daily goal</span>
            <span>
              {completed}/{dailyGoal}
            </span>
          </span>
          <span className="mt-2 flex gap-1.5" aria-hidden="true">
            {Array.from({ length: dailyGoal }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${
                  index < completed
                    ? hasMetTodayGoal
                      ? "bg-emerald-500"
                      : "bg-primary-500"
                    : "bg-black/8 dark:bg-white/10"
                }`}
              />
            ))}
          </span>
        </span>
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 pl-0.5 text-[11px] text-muted-foreground">
        <Flame
          className={`h-3.5 w-3.5 ${
            currentStreak > 0 ? "text-orange-500" : ""
          }`}
          aria-hidden="true"
        />
        {currentStreak > 0
          ? `${currentStreak} day streak`
          : "Solve and practice to start a streak"}
      </p>
      {nextAction && (
        <button
          type="button"
          onClick={runNextAction}
          className="mt-2.5 flex min-h-9 w-full items-center justify-between rounded-xl bg-primary-50 px-3 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-primary-950/45 dark:text-primary-300 dark:hover:bg-primary-900/50"
        >
          {nextAction.label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
