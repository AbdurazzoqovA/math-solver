"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Flame,
  Target,
} from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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
    setIsOpen(false);
    trackEvent("daily_goal_action_clicked", {
      action: nextAction.id,
    });
    nextAction.onClick();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="daily-goal-details"
        aria-label={`Daily goal. ${label}`}
        onClick={() => setIsOpen((open) => !open)}
        className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
          isOpen
            ? "bg-primary-50 dark:bg-primary-950/40"
            : "hover:bg-black/5 dark:hover:bg-white/5"
        }`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
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
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          Daily goal
        </span>
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {completed}/{dailyGoal}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id="daily-goal-details"
          role="region"
          aria-label="Daily goal details"
          className="absolute bottom-[calc(100%+0.5rem)] left-0 right-0 z-50 origin-bottom rounded-2xl border border-black/8 bg-white p-4 shadow-xl shadow-black/10 animate-in fade-in zoom-in-95 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/35"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                Today&apos;s goal
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Complete two learning activities
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums text-foreground">
              {completed}/{dailyGoal}
            </span>
          </div>

          <div className="mt-3 flex gap-1.5" aria-hidden="true">
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
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame
              className={`h-4 w-4 ${
                currentStreak > 0 ? "text-orange-500" : ""
              }`}
              aria-hidden="true"
            />
            {currentStreak > 0
              ? `${currentStreak} day streak`
              : "Solve and practice to start a streak"}
          </p>

          {nextAction ? (
            <button
              type="button"
              onClick={runNextAction}
              className="mt-3 flex min-h-10 w-full items-center justify-between rounded-xl bg-primary-50 px-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:bg-primary-950/45 dark:text-primary-300 dark:hover:bg-primary-900/50"
            >
              {nextAction.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300">
              Goal complete for today
            </p>
          )}
        </div>
      )}
    </div>
  );
}
