"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Brain,
  Captions,
  CaptionsOff,
  Check,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import type {
  PlaybackVideoLessonManifest,
  VideoLessonInteraction,
} from "@/lib/video/types";
import { trackEvent } from "@/lib/analytics";

type VideoLessonPlayerProps = {
  lesson: PlaybackVideoLessonManifest;
};

export default function VideoLessonPlayer({
  lesson,
}: VideoLessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerShellRef = useRef<HTMLDivElement>(null);
  const shouldAutoPlayNextRef = useRef(false);
  const [clipIndex, setClipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [practicePauses, setPracticePauses] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [activeCaption, setActiveCaption] = useState("");
  const [interaction, setInteraction] =
    useState<VideoLessonInteraction | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    null,
  );
  const [answerAccepted, setAnswerAccepted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completedWithPractice, setCompletedWithPractice] = useState(false);

  const interactionByClip = useMemo(
    () =>
      new Map(
        [...lesson.interactions, lesson.transferCheck].map((item) => [
          item.afterClip,
          item,
        ]),
      ),
    [lesson],
  );
  const clip = lesson.clips[clipIndex];
  const isSingleVideo = lesson.clips.length === 1;

  useEffect(() => {
    if (!shouldAutoPlayNextRef.current) return;
    shouldAutoPlayNextRef.current = false;
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      setIsPlaying(false);
    });
  }, [clip.id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerShellRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const resetQuestion = () => {
    setInteraction(null);
    setSelectedOptionId(null);
    setAnswerAccepted(false);
  };

  const loadClip = (index: number) => {
    setClipIndex(index);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setActiveCaption("");
    resetQuestion();
  };

  const playCurrentClip = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.ended) video.currentTime = 0;
    try {
      await video.play();
    } catch {
      setIsPlaying(false);
    }
  };

  const finishLesson = (withPractice = false) => {
    setCompleted(true);
    setCompletedWithPractice(withPractice);
    resetQuestion();
    setIsPlaying(false);
    setProgress(100);
    setCurrentTime(duration);
    setActiveCaption("");
    trackEvent("video_lesson_completed");
  };

  const continueLesson = () => {
    if (completed) {
      setCompleted(false);
      setCompletedWithPractice(false);
      shouldAutoPlayNextRef.current = true;
      loadClip(0);
      return;
    }

    if (interaction) {
      if (!answerAccepted) return;
      if (interaction.id === lesson.transferCheck.id) {
        finishLesson(true);
        return;
      }
      shouldAutoPlayNextRef.current = true;
      loadClip(Math.min(clipIndex + 1, lesson.clips.length - 1));
      return;
    }

    void playCurrentClip();
  };

  const handleClipEnded = () => {
    setIsPlaying(false);
    setProgress(100);
    setActiveCaption("");
    if (practicePauses) {
      const nextInteraction = interactionByClip.get(clip.id);
      if (nextInteraction) {
        setInteraction(nextInteraction);
        setSelectedOptionId(null);
        setAnswerAccepted(false);
        return;
      }
    }
    if (clipIndex + 1 < lesson.clips.length) {
      shouldAutoPlayNextRef.current = true;
      loadClip(clipIndex + 1);
      return;
    }
    finishLesson(false);
  };

  const chooseOption = (optionId: string) => {
    if (!interaction) return;
    const correct = optionId === interaction.correctOptionId;
    setSelectedOptionId(optionId);
    setAnswerAccepted(correct);
    trackEvent("video_checkpoint_answered", {
      outcome: correct ? "correct" : "incorrect",
      checkpoint:
        interaction.id === lesson.transferCheck.id ? "transfer" : "concept",
    });
  };

  const replayIdea = () => {
    setCompleted(false);
    setCompletedWithPractice(false);
    resetQuestion();
    setProgress(0);
    setCurrentTime(0);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video || interaction || completed) return;
    if (video.paused) {
      void playCurrentClip();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const seekTo = (seconds: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(seconds)) return;
    video.currentTime = seconds;
    setCurrentTime(seconds);
    if (video.duration) {
      setProgress(Math.min(100, (seconds / video.duration) * 100));
    }
  };

  const toggleFullscreen = async () => {
    const shell = playerShellRef.current;
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    if (!shell || !video) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (shell.requestFullscreen) {
        await shell.requestFullscreen();
      } else {
        video.webkitEnterFullscreen?.();
      }
    } catch {
      // Fullscreen can be blocked by browser policy; playback remains usable.
    }
  };

  const togglePracticePauses = () => {
    const nextValue = !practicePauses;
    setPracticePauses(nextValue);
    if (nextValue || !interaction) return;
    resetQuestion();
    if (clipIndex + 1 < lesson.clips.length) {
      shouldAutoPlayNextRef.current = true;
      loadClip(clipIndex + 1);
    } else {
      finishLesson(false);
    }
  };

  const syncCaption = (video: HTMLVideoElement) => {
    const track = video.textTracks[0];
    if (!track) return;
    track.mode = "hidden";
    const cue = track.activeCues?.[0] as VTTCue | undefined;
    setActiveCaption(captionsEnabled && cue ? cue.text : "");
  };

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const wholeSeconds = Math.floor(seconds);
    const minutes = Math.floor(wholeSeconds / 60);
    return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
  };

  const continueLabel = completed
    ? "Watch again"
    : interaction
      ? answerAccepted
        ? interaction.id === lesson.transferCheck.id
          ? "Finish lesson"
          : "Continue"
        : "Choose an answer"
      : isPlaying
        ? "Playing…"
        : clipIndex === 0 && progress === 0
          ? "Play explanation"
          : "Resume video";

  return (
    <section aria-labelledby="video-lesson-title" className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-1 sm:px-7">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-teal-600 dark:text-teal-400">
            Video explanation
          </p>
          <h2
            id="video-lesson-title"
            className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-2xl"
          >
            {lesson.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lesson.learningGoal}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {!isSingleVideo && (
            <span className="hidden rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium text-muted-foreground dark:border-white/10 sm:inline">
              Chapter {clipIndex + 1} of {lesson.clips.length}
            </span>
          )}
          <button
            type="button"
            onClick={togglePracticePauses}
            role="switch"
            aria-checked={practicePauses}
            className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 ${
              practicePauses
                ? "border-teal-500/50 bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-300"
                : "border-black/10 bg-white text-muted-foreground hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            Practice check
            <span
              aria-hidden="true"
              className={`relative h-5 w-9 shrink-0 rounded-full shadow-inner transition-colors ${
                practicePauses
                  ? "bg-teal-500"
                  : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  practicePauses ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {!isSingleVideo && (
        <div
          className="grid gap-1.5 px-5 sm:px-7"
          style={{
            gridTemplateColumns: `repeat(${lesson.clips.length}, minmax(0, 1fr))`,
          }}
          aria-label={`Video progress: chapter ${clipIndex + 1} of ${lesson.clips.length}`}
        >
          {lesson.clips.map((item, index) => {
            const fill =
              completed || index < clipIndex
                ? 100
                : index === clipIndex
                  ? progress
                  : 0;
            return (
              <span
                key={item.id}
                className="h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10"
                aria-hidden="true"
              >
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-primary-500 to-teal-400 transition-[width] duration-200"
                  style={{ width: `${fill}%` }}
                />
              </span>
            );
          })}
        </div>
      )}

      <div
        ref={playerShellRef}
        className={`overflow-hidden bg-[#07111f] shadow-inner ${
          isFullscreen
            ? "m-0 flex h-screen w-screen flex-col rounded-none border-0"
            : "mx-3 mt-4 rounded-2xl border border-black/10 dark:border-white/10 sm:mx-6"
        }`}
      >
        <div
          className={`relative ${
            isFullscreen
              ? "min-h-0 flex-1"
              : "aspect-video max-h-[calc(96dvh-22rem)] min-h-48 sm:min-h-60"
          }`}
        >
          <video
            key={clip.id}
            ref={videoRef}
            className={`h-full w-full bg-[#07111f] object-contain ${
              interaction || completed ? "invisible" : "visible"
            }`}
            src={clip.videoUrl}
            poster={clip.posterUrl}
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            onClick={togglePlayback}
            onDoubleClick={() => void toggleFullscreen()}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              setDuration(video.duration || 0);
              setCurrentTime(video.currentTime);
              setIsMuted(video.muted);
              syncCaption(video);
            }}
            onDurationChange={(event) => {
              setDuration(event.currentTarget.duration || 0);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onVolumeChange={(event) => {
              setIsMuted(event.currentTarget.muted);
            }}
            onEnded={handleClipEnded}
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              setCurrentTime(video.currentTime);
              if (video.duration) {
                setProgress(
                  Math.min(100, (video.currentTime / video.duration) * 100),
                );
              }
              syncCaption(video);
            }}
          >
            <track
              kind="captions"
              src={clip.captionsUrl}
              srcLang="en"
              label="English"
              default
              onLoad={(event) => {
                event.currentTarget.track.mode = "hidden";
              }}
            />
          </video>

          {interaction && !completed && (
            <section className="absolute inset-0 flex flex-col justify-center overflow-y-auto bg-[radial-gradient(circle_at_80%_15%,rgba(96,165,250,0.16),transparent_35%),#0a1b2b] p-5 sm:p-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-teal-300 sm:text-xs">
                {interaction.eyebrow}
              </p>
              {interaction.problem && (
                <p className="mt-2 self-start rounded-xl border border-blue-300/20 bg-blue-300/8 px-3 py-2 font-mono text-base text-amber-300 sm:text-2xl">
                  {interaction.problem}
                </p>
              )}
              <h3 className="mt-2 max-w-3xl text-lg font-bold leading-tight text-white sm:text-3xl">
                {interaction.prompt}
              </h3>
              <div className="mt-4 grid max-w-4xl gap-2 sm:grid-cols-3 sm:gap-3">
                {interaction.options.map((option) => {
                  const selected = selectedOptionId === option.id;
                  const correct = option.id === interaction.correctOptionId;
                  const accepted = selected && correct;
                  const rejected = selected && !correct;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => chooseOption(option.id)}
                      className={`min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition sm:min-h-16 sm:px-4 sm:text-base ${
                        accepted
                          ? "border-emerald-400 bg-emerald-400/15 text-emerald-100"
                          : rejected
                            ? "border-rose-400 bg-rose-400/15 text-rose-100"
                            : "border-white/15 bg-white/5 text-white hover:border-blue-300 hover:bg-blue-300/10"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {accepted && <Check className="h-4 w-4 shrink-0" />}
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p
                className={`mt-3 min-h-10 max-w-3xl text-sm leading-relaxed sm:text-base ${
                  answerAccepted ? "text-emerald-200" : "text-slate-300"
                }`}
                aria-live="polite"
              >
                {selectedOptionId
                  ? answerAccepted
                    ? interaction.correctFeedback
                    : interaction.incorrectFeedback
                  : ""}
              </p>
            </section>
          )}

          {completed && (
            <section className="absolute inset-0 grid place-content-center justify-items-center bg-[radial-gradient(circle_at_50%_10%,rgba(45,212,191,0.15),transparent_40%),#0a1b2b] p-8 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-400/15 text-emerald-300 sm:h-20 sm:w-20">
                <CheckCircle2 className="h-7 w-7 sm:h-10 sm:w-10" />
              </span>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-teal-300 sm:text-xs">
                Explanation complete
              </p>
              <h3 className="mt-2 max-w-2xl text-xl font-bold text-white sm:text-3xl">
                {completedWithPractice
                  ? lesson.completion.title
                  : "The solution is explained."}
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                {completedWithPractice
                  ? lesson.completion.body
                  : "Replay the full explanation, or turn on the optional practice check."}
              </p>
            </section>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 border-t border-white/10 bg-[#0a1b2b] px-2 py-2 text-white sm:gap-2 sm:px-3">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={Boolean(interaction) || completed}
            aria-label={isPlaying ? "Pause video" : "Play video"}
            title={isPlaying ? "Pause" : "Play"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current" />
            )}
          </button>
          <button
            type="button"
            onClick={replayIdea}
            aria-label={isSingleVideo ? "Replay video" : "Replay chapter"}
            title={isSingleVideo ? "Replay video" : "Replay chapter"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </button>
          <span className="hidden min-w-[76px] shrink-0 text-center text-xs font-medium tabular-nums text-slate-300 sm:inline">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <label className="flex min-w-0 flex-1 items-center px-1">
            <span className="sr-only">Video position</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.01)}
              step={0.05}
              value={Math.min(currentTime, Math.max(duration, 0.01))}
              onChange={(event) => seekTo(Number(event.currentTarget.value))}
              disabled={Boolean(interaction) || completed}
              className="h-1.5 w-full cursor-pointer accent-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Video position"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setCaptionsEnabled((value) => !value);
              setActiveCaption("");
            }}
            aria-pressed={captionsEnabled}
            aria-label={captionsEnabled ? "Turn captions off" : "Turn captions on"}
            title={captionsEnabled ? "Captions on" : "Captions off"}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition hover:bg-white/10 ${
              captionsEnabled ? "text-teal-300" : "text-slate-300"
            }`}
          >
            {captionsEnabled ? (
              <Captions className="h-5 w-5" />
            ) : (
              <CaptionsOff className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            title={isMuted ? "Unmute" : "Mute"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            {isMuted ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
            title={isFullscreen ? "Exit full screen" : "Full screen"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </button>
        </div>
        <div className="flex min-h-12 shrink-0 items-start gap-3 border-t border-white/10 bg-[#0a1b2b] px-3 py-2.5 text-white sm:px-4">
          <p className="text-sm leading-relaxed text-slate-200">
            {captionsEnabled
              ? activeCaption || "Captions will appear here without covering the math."
              : "Captions are off."}
          </p>
        </div>
      </div>

      {(interaction || completed) && (
        <div className="flex items-center justify-end gap-3 px-5 py-4 sm:px-7">
        <button
          type="button"
          onClick={continueLesson}
          disabled={isPlaying || (!!interaction && !answerAccepted)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isPlaying ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
          {continueLabel}
        </button>
        </div>
      )}

      <p className="px-5 py-3 text-right text-[11px] text-muted-foreground sm:px-7">
        {lesson.disclosure}
      </p>
    </section>
  );
}
