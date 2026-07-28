"use client";

import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChatContext } from "@/context/ChatContext";
import {
  getVideoJob,
  VideoClientError,
} from "@/lib/video/client";
import type { PublicVideoJob } from "@/lib/video/types";
import VideoLessonPlayer from "@/components/video/VideoLessonPlayer";

const TERMINAL_STATUSES = new Set(["ready", "failed", "unsupported"]);
const POLL_INTERVAL_MS = 2_500;

function wait(milliseconds: number, signal: AbortSignal) {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, milliseconds);
    const onAbort = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export default function InlineVideoLesson({
  messageId,
  jobId,
  jobVersion,
}: {
  messageId: string;
  jobId: string;
  jobVersion: number;
}) {
  const {
    user,
    isAuthReady,
    isFirebaseEnabled,
    canSyncNotebook,
    getAuthToken,
  } = useAuth();
  const { saveVideoJobToMessage } = useChatContext();
  const [job, setJob] = useState<PublicVideoJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (
      !isAuthReady ||
      !user ||
      !canSyncNotebook ||
      !isFirebaseEnabled
    ) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setError(null);
      setJob(null);
      try {
        const token = await getAuthToken();
        if (!token) throw new Error("Sign in again to open this video.");

        let nextJob = await getVideoJob(jobId, token, controller.signal);
        if (!active) return;
        setJob(nextJob);

        while (!TERMINAL_STATUSES.has(nextJob.status)) {
          const shouldContinue = await wait(
            POLL_INTERVAL_MS,
            controller.signal,
          );
          if (!shouldContinue || !active) return;
          nextJob = await getVideoJob(
            jobId,
            token,
            controller.signal,
          );
          if (!active) return;
          setJob(nextJob);
        }
      } catch (caught) {
        if (
          caught instanceof DOMException &&
          caught.name === "AbortError"
        ) {
          return;
        }
        if (!active) return;
        if (
          caught instanceof VideoClientError &&
          caught.code === "job_not_found"
        ) {
          saveVideoJobToMessage(messageId, undefined);
          return;
        }
        setError(
          caught instanceof Error
            ? caught.message
            : "This video explanation could not be loaded.",
        );
      }
    };

    void load();
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
    jobVersion,
    messageId,
    saveVideoJobToMessage,
    user,
  ]);

  if (!isAuthReady) {
    return <InlineVideoStatus label="Opening your video explanation" />;
  }

  if (!user || !canSyncNotebook || !isFirebaseEnabled) {
    return (
      <InlineVideoNotice
        message="Sign in with your verified account to reopen this private video."
      />
    );
  }

  if (!job && !error) {
    return <InlineVideoStatus label="Opening your video explanation" />;
  }

  if (error) return <InlineVideoNotice message={error} />;
  if (!job) return null;

  if (job.status === "ready" && job.lesson) {
    return (
      <div className="mt-8 overflow-hidden rounded-3xl border border-black/10 bg-white py-5 shadow-sm dark:border-white/10 dark:bg-zinc-950">
        <VideoLessonPlayer lesson={job.lesson} />
      </div>
    );
  }

  if (job.status === "failed" || job.status === "unsupported") {
    return (
      <InlineVideoNotice
        message={
          job.error?.message ??
          "This video explanation could not be generated. Use the button above to try again."
        }
      />
    );
  }

  return (
    <InlineVideoStatus
      label={job.stageLabel}
      progress={job.progress}
    />
  );
}

function InlineVideoStatus({
  label,
  progress,
}: {
  label: string;
  progress?: number;
}) {
  return (
    <div
      className="mt-8 rounded-2xl border border-primary-200/70 bg-primary-50/70 p-4 dark:border-primary-900/60 dark:bg-primary-950/20"
      role="status"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-primary-600 shadow-sm dark:bg-zinc-900 dark:text-primary-300">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Your video will appear here when it is ready.
          </p>
        </div>
        {progress !== undefined && (
          <span className="text-xs font-bold text-primary-600 dark:text-primary-300">
            {Math.round(progress)}%
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary-100 dark:bg-primary-950">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-teal-400 transition-[width] duration-500"
            style={{
              width: `${Math.max(2, Math.min(100, progress))}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}

function InlineVideoNotice({ message }: { message: string }) {
  return (
    <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/80 text-amber-600 dark:bg-zinc-900 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Video explanation
        </p>
        <p className="mt-1 text-xs leading-relaxed opacity-80">{message}</p>
      </div>
    </div>
  );
}
