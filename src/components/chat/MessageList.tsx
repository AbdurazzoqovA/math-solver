import {
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Edit2,
  FileText,
  Loader2,
  RefreshCw,
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useUI, Question } from "@/context/UIContext";
import { useChatContext } from "@/context/ChatContext";
import { useTurnstile } from "@/components/providers/TurnstileProvider";
import { useState } from "react";
import Image from "next/image";
import {
  buildStepExplanationPrompt,
  getSolutionStepNumbers,
  isActionableSolution,
  SIMILAR_PROBLEM_PROMPT,
} from "@/lib/post-solution-actions";
import { preprocessMathMarkdown } from "@/lib/math-markdown";

export type PracticeAttempt = {
  id: string;
  completedAt: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isCorrect?: boolean;
  images?: { url?: string; ocrText: string }[];
  practiceTest?: {
    title: string;
    questions: Question[];
    attempts?: PracticeAttempt[];
  };
};

export default function MessageList({
  messages,
  isLoading = false,
}: {
  messages: Message[];
  isLoading?: boolean;
}) {
  const { openPracticePanel } = useUI();
  const { savePracticeToMessage, sendMessage } = useChatContext();
  const { getToken } = useTurnstile();
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);
  const [pendingFollowUp, setPendingFollowUp] = useState<string | null>(null);
  const [practiceError, setPracticeError] = useState<{
    messageId: string;
    message: string;
  } | null>(null);

  const latestAssistantMessageId = [...messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  const handlePracticeClick = async (messageId: string, content: string) => {
    setPracticeError(null);
    setLoadingMessageId(messageId);
    try {
      const captchaToken = getToken();
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: content, captchaToken }),
      });
      if (!res.ok) throw new Error("Failed to generate practice questions");
      const data: unknown = await res.json();
      if (
        !data ||
        typeof data !== "object" ||
        !("questions" in data) ||
        !Array.isArray(data.questions) ||
        data.questions.length === 0
      ) {
        throw new Error("The quiz response did not contain questions");
      }

      const title =
        "title" in data && typeof data.title === "string" && data.title.trim()
          ? data.title
          : content;
      const questions = (data.questions as Question[]).map((question) => ({
        ...question,
        id: question.id || crypto.randomUUID(),
      }));
      savePracticeToMessage(messageId, { title, questions });
      openPracticePanel(title, questions, messageId);
    } catch (error) {
      console.error("Failed to fetch practice questions:", error);
      setPracticeError({
        messageId,
        message: "The quiz could not be created. Please try again.",
      });
    } finally {
      setLoadingMessageId(null);
    }
  };

  const handleOpenSavedPractice = (messageId: string, practiceTest: { title: string; questions: Question[] }) => {
    openPracticePanel(practiceTest.title, practiceTest.questions, messageId);
  };

  const handleFollowUp = async (actionId: string, prompt: string) => {
    setPendingFollowUp(actionId);
    try {
      await sendMessage(prompt);
    } finally {
      setPendingFollowUp(null);
    }
  };

  return (
    <div className="flex flex-col gap-12">
      {messages.map((message) => {
        const isLatestAssistant =
          message.role === "assistant" &&
          message.id === latestAssistantMessageId;
        const showQuickActions =
          isLatestAssistant &&
          !isLoading &&
          isActionableSolution(message.content);
        const stepNumbers = showQuickActions
          ? getSolutionStepNumbers(message.content)
          : [];

        return (
          <div key={message.id} className="group w-full">
            {message.role === 'user' ? (
              <div className="flex justify-end ml-auto max-w-[85%] relative">
              <div className="absolute top-2 -left-12 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-70 transition-opacity">
                <button className="p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors" title="Edit message">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-primary-600 text-white px-5 py-4 rounded-3xl rounded-tr-sm shadow-sm leading-relaxed relative flex flex-col items-end">
                {message.images?.some((image) => image.url) && (
                  <div className="mb-3 flex flex-row gap-2 overflow-x-auto pb-2 w-full justify-end max-w-full">
                    {message.images.filter((image) => image.url).map((img, index) => (
                      <div key={index} className="relative group/img cursor-pointer shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url!}
                          alt={`Uploaded problem ${index + 1}`}
                          className="max-w-[200px] sm:max-w-[280px] rounded-xl shadow-md border-2 border-primary-500/30 object-contain max-h-[160px] bg-white dark:bg-zinc-800"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="prose md:prose-lg max-w-none text-white leading-relaxed prose-p:m-0 prose-math:text-white dark:prose-math:text-white">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {preprocessMathMarkdown(message.content)}
                  </ReactMarkdown>
                </div>
              </div>
              </div>
            ) : (
              <div className="flex gap-4 md:gap-6 max-w-full items-start">
              <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-1.5">
                <Image
                  src="/icons8-math-40.png"
                  alt="Assistant"
                  width={32}
                  height={32}
                  className="object-contain drop-shadow-sm"
                />
              </div>
              <div className="flex-1 w-full max-w-[calc(100%-3rem)] md:max-w-[calc(100%-4rem)] overflow-hidden">

                {message.isCorrect && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-4 mt-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Correct Approach
                  </div>
                )}

                {/* Advanced Markdown Rendering */}
                <div className="assistant-prose prose md:prose-lg max-w-none text-foreground leading-loose text-[1.1rem] dark:prose-invert prose-p:mb-4 prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800/50 prose-pre:border prose-pre:border-black/5 dark:prose-pre:border-white/5 prose-math:text-primary-600 dark:prose-math:text-primary-400 [&_.math-display]:my-8 [&_.math-display]:text-xl md:[&_.math-display]:text-2xl [&_.math-display]:tracking-wider [&>hr]:my-12 [&>hr]:border-t-2 [&>hr]:border-black/5 dark:[&>hr]:border-white/5 [&>hr]:w-[calc(100%+2rem)] [&>hr]:-ml-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {preprocessMathMarkdown(message.content)}
                  </ReactMarkdown>
                </div>

                {showQuickActions ? (
                  <section
                    aria-label="Continue learning"
                    className="mt-8 border-t border-black/8 pt-5 dark:border-white/10"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground md:text-center">
                      Keep learning
                    </p>
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:justify-center">
                      {stepNumbers.length > 0 && (
                        <label className="relative shrink-0">
                          <span className="sr-only">
                            Choose a solution step to explain
                          </span>
                          {pendingFollowUp?.startsWith(
                            `${message.id}:step:`,
                          ) ? (
                            <Loader2
                              className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <BookOpenCheck
                              className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary-600 dark:text-primary-400"
                              aria-hidden="true"
                            />
                          )}
                          <select
                            aria-label="Explain a solution step"
                            value=""
                            onChange={(event) => {
                              const stepNumber = Number(event.target.value);
                              if (!Number.isInteger(stepNumber)) return;
                              void handleFollowUp(
                                `${message.id}:step:${stepNumber}`,
                                buildStepExplanationPrompt(stepNumber),
                              );
                            }}
                            disabled={
                              pendingFollowUp !== null ||
                              loadingMessageId !== null
                            }
                            className="min-h-10 cursor-pointer appearance-none rounded-full border border-black/10 bg-white py-2 pl-10 pr-8 text-sm font-medium text-foreground outline-none transition-colors hover:border-primary-300 hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-55 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-primary-800 dark:hover:bg-primary-950/25"
                          >
                            <option value="" disabled>
                              Explain a step
                            </option>
                            {stepNumbers.map((stepNumber) => (
                              <option key={stepNumber} value={stepNumber}>
                                Step {stepNumber}
                              </option>
                            ))}
                          </select>
                          <span
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                            aria-hidden="true"
                          >
                            ▾
                          </span>
                        </label>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          void handleFollowUp(
                            `${message.id}:similar`,
                            SIMILAR_PROBLEM_PROMPT,
                          )
                        }
                        disabled={
                          pendingFollowUp !== null ||
                          loadingMessageId !== null
                        }
                        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary-300 hover:bg-primary-50 disabled:pointer-events-none disabled:opacity-55 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-primary-800 dark:hover:bg-primary-950/25"
                      >
                        {pendingFollowUp === `${message.id}:similar` ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <RefreshCw
                            className="h-4 w-4 text-primary-600 dark:text-primary-400"
                            aria-hidden="true"
                          />
                        )}
                        Similar problem
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          message.practiceTest
                            ? handleOpenSavedPractice(
                                message.id,
                                message.practiceTest,
                              )
                            : void handlePracticeClick(
                                message.id,
                                message.content,
                              )
                        }
                        disabled={
                          pendingFollowUp !== null ||
                          loadingMessageId !== null
                        }
                        className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-primary-600 bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 transition-colors hover:border-primary-700 hover:bg-primary-700 disabled:pointer-events-none disabled:opacity-55 dark:border-primary-500 dark:bg-primary-500 dark:text-white dark:hover:border-primary-400 dark:hover:bg-primary-400"
                      >
                        {loadingMessageId === message.id ? (
                          <Loader2
                            className="h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <ClipboardList
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        )}
                        {loadingMessageId === message.id
                          ? "Building quiz…"
                          : message.practiceTest
                            ? "Practice again"
                            : "Quiz me"}
                      </button>
                    </div>
                    {practiceError?.messageId === message.id && (
                      <p
                        className="mt-3 text-sm text-amber-700 dark:text-amber-400"
                        role="alert"
                      >
                        {practiceError.message}
                      </p>
                    )}
                  </section>
                ) : message.practiceTest || !isLatestAssistant ? (
                  /* Keep historical practice tests reachable after a newer answer arrives. */
                  <div className="mt-8 pt-4 flex">
                    {message.practiceTest ? (
                      <button
                        onClick={() =>
                          handleOpenSavedPractice(
                            message.id,
                            message.practiceTest!,
                          )
                        }
                        className="group flex items-center justify-between w-full p-3 sm:px-4 sm:py-3.5 rounded-2xl border border-[#A6C8FF] dark:border-blue-900/40 bg-white dark:bg-zinc-900 overflow-hidden transition-all hover:shadow-[0_4px_16px_-4px_rgba(37,99,235,0.08)] dark:hover:shadow-none hover:border-blue-400 dark:hover:border-blue-800 text-left"
                      >
                        <div className="flex flex-col gap-0.5 pr-3">
                          <span className="text-[15px] sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                            {message.practiceTest.title}
                          </span>
                          <span className="text-xs sm:text-[13px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">
                            {message.practiceTest.questions.length} questions
                          </span>
                        </div>
                        <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#E8F8F0] dark:bg-emerald-500/10 flex items-center justify-center text-[#10B981] dark:text-emerald-500 group-hover:scale-[1.03] transition-transform">
                          <ClipboardList className="w-[18px] h-[18px] sm:w-5 sm:h-5 stroke-[2.5]" />
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePracticeClick(message.id, message.content)}
                        disabled={loadingMessageId === message.id}
                        className="group flex items-center justify-between w-full p-3 sm:px-4 sm:py-3.5 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 transition-all hover:bg-black/5 dark:hover:bg-white/5 text-left disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <div className="flex flex-col gap-0.5 pr-3">
                          <span className="text-[15px] sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 transition-colors leading-tight">
                            {loadingMessageId === message.id ? 'Generating Practice Test...' : 'Take a Practice Test'}
                          </span>
                          <span className="text-xs sm:text-[13px] font-medium text-zinc-500 dark:text-zinc-400 leading-tight">
                            {loadingMessageId === message.id ? 'Analyzing solver context to build questions' : 'Generate 4 multiple-choice questions based on this answer'}
                          </span>
                        </div>
                        <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black/5 dark:bg-white/10 flex items-center justify-center text-foreground group-hover:scale-[1.03] transition-transform">
                          {loadingMessageId === message.id ? (
                            <Loader2 className="w-[18px] h-[18px] sm:w-5 sm:h-5 stroke-[2.5] animate-spin" />
                          ) : (
                            <FileText className="w-[18px] h-[18px] sm:w-5 sm:h-5 stroke-[2.5]" />
                          )}
                        </div>
                      </button>
                    )}
                  </div>
                ) : null}

              </div>
            </div>
            )}
          </div>
        );
      })}

      {/* Loading Skeleton */}
      {isLoading && messages[messages.length - 1]?.role === 'user' && (
        <div className="group w-full flex gap-4 md:gap-6 max-w-full animate-pulse">
          <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-1 opacity-50">
            <Image
              src="/icons8-math-40.png"
              alt="Loading..."
              width={32}
              height={32}
              className="object-contain grayscale"
            />
          </div>
          <div className="flex-1 w-full max-w-[calc(100%-3rem)] md:max-w-[calc(100%-4rem)] pt-2 space-y-3">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-3/4"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-1/2"></div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-full w-5/6"></div>
          </div>
        </div>
      )}
    </div>
  );
}
