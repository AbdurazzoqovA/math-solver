"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import { useTurnstile } from "@/components/providers/TurnstileProvider";
import {
  createVideoJob,
  deleteVideoJob,
  getVideoJob,
  VideoClientError,
} from "@/lib/video/client";
import type { PublicVideoJob } from "@/lib/video/types";
import { trackEvent } from "@/lib/analytics";
import VideoLessonPlayer from "@/components/video/VideoLessonPlayer";

export type VideoLessonRequest = {
  requestKey: string;
  problem: string;
  solution: string;
};

type VideoLessonDialogProps = {
  request: VideoLessonRequest | null;
  jobId?: string | null;
  onClose: () => void;
  onRequestAuth: () => void;
  onJobAttached?: (job: PublicVideoJob) => void;
  onDeleted?: (jobId: string) => void;
};

const TERMINAL_STATUSES = new Set(["ready", "failed", "unsupported"]);
const POLL_INTERVAL_MS = 2_500;
const VERIFICATION_WAIT_MS = 20_000;
// A lesson that fails for a passing reason is retried once before the learner
// is asked to do anything.
const MAX_AUTOMATIC_RETRIES = 1;
const VERIFICATION_ERROR_CODE = "request_validation_failed";

function delay(milliseconds: number, signal: AbortSignal) {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    const onAbort = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, milliseconds);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export default function VideoLessonDialog({
  request,
  jobId = null,
  onClose,
  onRequestAuth,
  onJobAttached,
  onDeleted,
}: VideoLessonDialogProps) {
  const {
    user,
    isAuthReady,
    isFirebaseEnabled,
    canSyncNotebook,
    getAuthToken,
  } = useAuth();
  const { tier: planTier } = useBilling();
  const { waitForToken } = useTurnstile();
  const [job, setJob] = useState<PublicVideoJob | null>(null);
  const [preparingLabel, setPreparingLabel] = useState<string | null>(null);
  const [error, setError] = useState<{
    message: string;
    code: string;
  } | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const trackedReadyJob = useRef<string | null>(null);

  useEffect(() => {
    if (!request && !jobId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [jobId, onClose, request]);

  useEffect(() => {
    if (
      (!request && !jobId) ||
      !isAuthReady ||
      !user ||
      !canSyncNotebook ||
      !isFirebaseEnabled
    ) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const readSession = async () => {
      const token = await getAuthToken();
      if (!token) {
        throw new VideoClientError(
          "Your session could not be verified. Sign in again.",
          "invalid_session",
          401,
        );
      }
      return token;
    };

    const startLesson = async () => {
      // Verification tokens are single-use. One spent by the solve request,
      // or still loading on a slow network, must not fail the lesson.
      for (let attempt = 0; ; attempt += 1) {
        const token = await readSession();
        const captchaToken = await waitForToken(VERIFICATION_WAIT_MS);
        try {
          return await createVideoJob(
            request!,
            token,
            captchaToken,
            controller.signal,
          );
        } catch (caught) {
          if (
            attempt === 0 &&
            caught instanceof VideoClientError &&
            caught.code === VERIFICATION_ERROR_CODE &&
            caught.status !== 429
          ) {
            continue;
          }
          throw caught;
        }
      }
    };

    const run = async () => {
      setError(null);
      setJob(null);
      setPreparingLabel(null);
      try {
        let nextJob: PublicVideoJob;
        if (jobId) {
          nextJob = await getVideoJob(jobId, await readSession());
        } else {
          trackEvent("video_lesson_requested");
          setPreparingLabel("Opening the video studio");
          nextJob = await startLesson();
        }
        if (!active) return;
        setJob(nextJob);
        onJobAttached?.(nextJob);

        for (let automaticRetries = 0; ; ) {
          while (!TERMINAL_STATUSES.has(nextJob.status)) {
            const shouldContinue = await delay(
              POLL_INTERVAL_MS,
              controller.signal,
            );
            if (!shouldContinue || !active) return;
            nextJob = await getVideoJob(nextJob.id, await readSession());
            if (!active) return;
            setJob(nextJob);
          }

          if (
            jobId ||
            nextJob.status !== "failed" ||
            !nextJob.error?.retryable ||
            automaticRetries >= MAX_AUTOMATIC_RETRIES
          ) {
            break;
          }
          automaticRetries += 1;
          setJob(null);
          setPreparingLabel("Taking another pass at your lesson");
          nextJob = await startLesson();
          if (!active) return;
          setJob(nextJob);
          onJobAttached?.(nextJob);
        }

        if (
          nextJob.status === "ready" &&
          trackedReadyJob.current !== nextJob.id
        ) {
          trackedReadyJob.current = nextJob.id;
          trackEvent("video_lesson_ready");
        }
      } catch (caught) {
        if (
          caught instanceof DOMException &&
          caught.name === "AbortError"
        ) {
          return;
        }
        if (!active) return;
        setError({
          message:
            caught instanceof Error
              ? caught.message
              : "The video explanation could not be generated.",
          code:
            caught instanceof VideoClientError
              ? caught.code
              : "video_request_failed",
        });
      }
    };

    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    canSyncNotebook,
    getAuthToken,
    isAuthReady,
    isFirebaseEnabled,
    jobId,
    onJobAttached,
    request,
    retryNonce,
    user,
    waitForToken,
  ]);

  if ((!request && !jobId) || typeof document === "undefined") return null;

  const deleteLesson = async () => {
    if (!job) return;
    const token = await getAuthToken();
    if (!token) return;
    setIsDeleting(true);
    setError(null);
    try {
      await deleteVideoJob(job.id, token);
      onDeleted?.(job.id);
      onClose();
    } catch (caught) {
      setError({
        message:
          caught instanceof Error
            ? caught.message
            : "The lesson could not be deleted.",
        code: "delete_failed",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const body = !isFirebaseEnabled ? (
    <FeatureUnavailable
      title="Video explanations are not configured"
      body="The website administrator still needs to connect the private video service."
    />
  ) : !isAuthReady ? (
    <LoadingState label="Checking your account" progress={4} />
  ) : !user ? (
    <AuthRequired
      title="Sign in for your private video explanation"
      body="Video lessons use a daily allowance, so an account is required. Solving math remains free without an account."
      actionLabel="Sign in or create an account"
      onAction={onRequestAuth}
    />
  ) : !canSyncNotebook ? (
    <AuthRequired
      title="Verify your email first"
      body="Open your verification email, then return here. Your daily allowance is not used until generation starts."
      actionLabel="Open account verification"
      onAction={onRequestAuth}
    />
  ) : error ? (
    <ErrorState
      title={errorTitle(error.code)}
      message={error.message}
      retryable={
        Boolean(request) &&
        error.code !== "free_video_limit_reached" &&
        error.code !== "lesson_not_supported"
      }
      onRetry={() => setRetryNonce((value) => value + 1)}
      action={
        error.code === "free_video_limit_reached" && planTier !== "unlimited"
          ? { href: "/pricing", label: "See plans for more lessons" }
          : undefined
      }
    />
  ) : job?.status === "ready" && job.lesson ? (
    <VideoLessonPlayer lesson={job.lesson} />
  ) : job?.status === "failed" || job?.status === "unsupported" ? (
    <ErrorState
      title={errorTitle(job.error?.code)}
      message={
        job.error?.message ??
        "We could not finish this video. Your free lesson was not used. Please try again."
      }
      retryable={Boolean(request) && (job.error?.retryable ?? false)}
      onRetry={() => setRetryNonce((value) => value + 1)}
    />
  ) : (
    <LoadingState
      label={job?.stageLabel ?? preparingLabel ?? "Opening the video studio"}
      progress={job?.progress ?? 2}
      remaining={job?.quota.remaining}
    />
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Video explanation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/65 backdrop-blur-md"
        aria-label="Close video explanation"
        onClick={onClose}
      />
      <div className="relative flex max-h-[96dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950 sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-black/8 px-4 py-3 dark:border-white/10 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-teal-400 text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">
                Video explanation
              </p>
              {job && (
                <p className="text-[11px] text-muted-foreground">
                  {job.quota.remaining} of {job.quota.limit} lessons left today
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {job?.status === "ready" && (
              <button
                type="button"
                onClick={() => void deleteLesson()}
                disabled={isDeleting}
                className="rounded-full p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                aria-label="Delete video explanation"
                title="Delete lesson"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5"
              aria-label="Close"
              autoFocus
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex min-h-[420px] flex-1 flex-col overflow-y-auto">
          {body}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LoadingState({
  label,
  progress,
  remaining,
}: {
  label: string;
  progress: number;
  remaining?: number;
}) {
  return (
    <div className="grid flex-1 place-content-center justify-items-center px-6 py-16 text-center">
      <span className="relative grid h-20 w-20 place-items-center rounded-3xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
        <Sparkles className="h-8 w-8" />
        <Loader2 className="absolute h-20 w-20 animate-spin p-1 text-primary-300/70 dark:text-primary-700/70" />
      </span>
      <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {label}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        We plan the explanation, check the math, record each phrase, and draw
        the animation. You can close this window and return to the same answer.
      </p>
      <div className="mt-6 h-2 w-full max-w-sm overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-teal-400 transition-[width] duration-500"
          style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {Math.round(progress)}%{remaining === undefined ? "" : ` · ${remaining} lessons left today`}
      </p>
    </div>
  );
}

function AuthRequired({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="grid flex-1 place-content-center justify-items-center px-6 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
        <LockKeyhole className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="mt-6 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function FeatureUnavailable({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="grid flex-1 place-content-center justify-items-center px-6 py-16 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-500" />
      <h2 className="mt-4 text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function ErrorState({
  title,
  message,
  retryable,
  onRetry,
  action,
}: {
  title: string;
  message: string;
  retryable: boolean;
  onRetry: () => void;
  action?: { href: string; label: string };
}) {
  return (
    <div className="grid flex-1 place-content-center justify-items-center px-6 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <h2 className="mt-5 text-xl font-bold text-foreground">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {message}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Sparkles className="h-4 w-4" />
          {action.label}
        </Link>
      )}
      {retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}

function errorTitle(code?: string) {
  if (code === "lesson_not_supported") {
    return "This problem needs a closer look first";
  }
  if (code === VERIFICATION_ERROR_CODE) {
    return "One quick check is still needed";
  }
  if (code === "free_video_limit_reached") {
    return "You have used today's video lessons";
  }
  return "Your video needs one more try";
}
