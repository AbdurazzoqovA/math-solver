"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Loader2,
  LockKeyhole,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listVideoJobs } from "@/lib/video/client";
import type {
  PublicVideoJobSummary,
  PublicVideoQuota,
  VideoJobStatus,
} from "@/lib/video/types";
import VideoLessonDialog from "@/components/video/VideoLessonDialog";

const ACTIVE_STATUSES = new Set<VideoJobStatus>([
  "queued",
  "planning",
  "voicing",
  "rendering",
  "verifying",
  "uploading",
]);

function formatDuration(seconds?: number): string | null {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, "0")}` : `${remainder}s`;
}

function statusLabel(status: VideoJobStatus): string {
  if (status === "ready") return "Ready to watch";
  if (status === "unsupported") return "Not supported";
  if (status === "failed") return "Generation failed";
  return "Generating";
}

function statusClasses(status: VideoJobStatus): string {
  if (status === "ready") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (status === "failed" || status === "unsupported") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  }
  return "bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300";
}

export default function VideoLibraryPage() {
  const {
    user,
    isAuthReady,
    isFirebaseEnabled,
    canSyncNotebook,
    getAuthToken,
  } = useAuth();
  const [jobs, setJobs] = useState<PublicVideoJobSummary[]>([]);
  const [quota, setQuota] = useState<PublicVideoQuota | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    if (
      !isAuthReady ||
      !isFirebaseEnabled ||
      !user ||
      !canSyncNotebook
    ) {
      setJobs([]);
      setQuota(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    let active = true;
    let timer: number | undefined;
    const load = async () => {
      setError(null);
      try {
        const token = await getAuthToken();
        if (!token) throw new Error("Your session could not be verified.");
        const response = await listVideoJobs(token);
        if (!active) return;
        setJobs(response.jobs);
        setQuota(response.quota);
        setIsLoading(false);
        if (response.jobs.some((job) => ACTIVE_STATUSES.has(job.status))) {
          timer = window.setTimeout(load, 5_000);
        }
      } catch (caught) {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Your video library could not be loaded.",
        );
        setIsLoading(false);
      }
    };

    setIsLoading(true);
    void load();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [
    canSyncNotebook,
    getAuthToken,
    isAuthReady,
    isFirebaseEnabled,
    refreshNonce,
    user,
  ]);

  const openAuth = () => {
    window.dispatchEvent(new Event("mathsolver:open-auth"));
  };

  const content = !isFirebaseEnabled ? (
    <LibraryNotice
      icon={<AlertTriangle className="h-8 w-8" />}
      title="Video Library is not configured"
      body="The private video service still needs to be connected."
    />
  ) : !isAuthReady ? (
    <LibraryLoading />
  ) : !user ? (
    <LibraryNotice
      icon={<LockKeyhole className="h-8 w-8" />}
      title="Sign in to view your videos"
      body="Your generated video explanations are private and linked to your verified account."
      actionLabel="Sign in or create an account"
      onAction={openAuth}
    />
  ) : !canSyncNotebook ? (
    <LibraryNotice
      icon={<LockKeyhole className="h-8 w-8" />}
      title="Verify your email first"
      body="Verify your account to generate and revisit private video explanations."
      actionLabel="Open account verification"
      onAction={openAuth}
    />
  ) : isLoading ? (
    <LibraryLoading />
  ) : error ? (
    <LibraryNotice
      icon={<AlertTriangle className="h-8 w-8" />}
      title="Video Library could not load"
      body={error}
      actionLabel="Try again"
      onAction={() => setRefreshNonce((value) => value + 1)}
    />
  ) : jobs.length === 0 ? (
    <LibraryNotice
      icon={<Clapperboard className="h-8 w-8" />}
      title="No video explanations yet"
      body="Solve a problem, then choose “Generate video explanation.” Your completed lessons will appear here."
      actionLabel="Solve a problem"
      onAction={() => {
        window.location.href = "/";
      }}
    />
  ) : (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => {
        const isReady = job.status === "ready";
        const duration = formatDuration(job.durationSeconds);
        const card = (
          <>
            <div
              className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-950 via-[#10283e] to-primary-950 bg-cover bg-center"
              style={
                job.posterUrl
                  ? { backgroundImage: `url(${job.posterUrl})` }
                  : undefined
              }
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
              {!job.posterUrl && (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur">
                    {ACTIVE_STATUSES.has(job.status) ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Clapperboard className="h-6 w-6" />
                    )}
                  </span>
                </div>
              )}
              <span
                className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses(job.status)}`}
              >
                {statusLabel(job.status)}
              </span>
              {duration && (
                <span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-2 py-1 text-[11px] font-semibold text-white">
                  {duration}
                </span>
              )}
              {isReady && (
                <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="grid h-14 w-14 place-items-center rounded-full bg-white text-primary-700 shadow-xl">
                    <Play className="ml-0.5 h-6 w-6 fill-current" />
                  </span>
                </span>
              )}
            </div>
            <div className="p-4">
              <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
                {job.title}
              </h2>
              {job.title !== job.problem && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {job.problem}
                </p>
              )}
              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  {isReady ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5 text-primary-500" />
                  )}
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                  }).format(job.updatedAt)}
                </span>
                {job.clipCount && (
                  <span>
                    {job.clipCount === 1
                      ? "Full video"
                      : `${job.clipCount} chapters`}
                  </span>
                )}
              </div>
              {!isReady && (
                <p className="mt-3 text-xs font-medium text-muted-foreground">
                  {job.error?.message ?? `${job.stageLabel} · ${Math.round(job.progress)}%`}
                </p>
              )}
            </div>
          </>
        );

        return isReady ? (
          <button
            key={job.id}
            type="button"
            onClick={() => setSelectedJobId(job.id)}
            className="group overflow-hidden rounded-2xl border border-black/8 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg dark:border-white/8 dark:bg-zinc-900 dark:hover:border-primary-700"
          >
            {card}
          </button>
        ) : (
          <article
            key={job.id}
            className="group overflow-hidden rounded-2xl border border-black/8 bg-white text-left shadow-sm dark:border-white/8 dark:bg-zinc-900"
          >
            {card}
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full w-full flex-col">
      <header className="shrink-0 px-6 pb-6 pt-10 md:px-10 md:pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                  <Clapperboard className="h-5 w-5" />
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                  Video Library
                </h1>
              </div>
              <p className="ml-[52px] mt-2 max-w-2xl text-[15px] text-muted-foreground md:text-base">
                Rewatch your private video explanations. Each one plays
                continuously, with optional Practice pauses. You can create up
                to 10 free videos each day, and lessons remain available for 14
                days.
              </p>
            </div>
            {user && canSyncNotebook && (
              <div className="flex items-center gap-2">
                {quota && (
                  <span className="rounded-full border border-black/8 bg-white px-3 py-2 text-xs font-semibold text-muted-foreground dark:border-white/8 dark:bg-zinc-900">
                    {quota.remaining} of {quota.limit} free videos left today
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setRefreshNonce((value) => value + 1)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-black/8 bg-white text-muted-foreground transition-colors hover:text-foreground dark:border-white/8 dark:bg-zinc-900"
                  aria-label="Refresh Video Library"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-12 md:px-10">
        <div className="mx-auto max-w-6xl">{content}</div>
      </main>

      <VideoLessonDialog
        request={null}
        jobId={selectedJobId}
        onClose={() => {
          setSelectedJobId(null);
          setRefreshNonce((value) => value + 1);
        }}
        onRequestAuth={() => {
          setSelectedJobId(null);
          openAuth();
        }}
      />
    </div>
  );
}

function LibraryLoading() {
  return (
    <div className="grid min-h-[360px] place-content-center justify-items-center text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-300">
        <Loader2 className="h-7 w-7 animate-spin" />
      </span>
      <p className="mt-4 text-sm font-medium text-muted-foreground">
        Loading your private videos…
      </p>
    </div>
  );
}

function LibraryNotice({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="grid min-h-[420px] place-content-center justify-items-center px-4 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary-100 to-teal-100 text-primary-600 shadow-sm dark:from-primary-950/60 dark:to-teal-950/40 dark:text-primary-300">
        {icon}
      </span>
      <h2 className="mt-6 text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
        >
          <Sparkles className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
