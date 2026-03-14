import { CheckCircle2, Edit2, FileText, Loader2, ClipboardList } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useUI, Question } from "@/context/UIContext";
import { useChatContext } from "@/context/ChatContext";
import { useState } from "react";
import Image from "next/image";

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isCorrect?: boolean;
  images?: { url: string; ocrText: string }[]; // Replace singular imageUrl / ocrText
  practiceTest?: {
    title: string;
    questions: Question[];
  };
};

// Pre-process LaTeX delimiters from OpenAI's default \( \) and \[ \] to remark-math's required $ and $$
const preprocessLaTeX = (content: string) => {
  let processed = content;
  // Replace block math \[ ... \] with $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`);
  // Replace inline math \( ... \) with $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`);
  return processed;
};

export default function MessageList({
  messages,
  isLoading
}: {
  messages: Message[];
  isLoading?: boolean;
}) {
  const { openPracticePanel } = useUI();
  const { savePracticeToMessage } = useChatContext();
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);

  const handlePracticeClick = async (messageId: string, content: string) => {
    setLoadingMessageId(messageId);
    try {
      const res = await fetch("/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: content }),
      });
      const data = await res.json();
      if (data.questions) {
        savePracticeToMessage(messageId, { title: data.title || content, questions: data.questions });
        openPracticePanel(data.title || content, data.questions, messageId);
      }
    } catch (error) {
      console.error("Failed to fetch practice questions:", error);
    } finally {
      setLoadingMessageId(null);
    }
  };

  const handleOpenSavedPractice = (messageId: string, practiceTest: { title: string; questions: Question[] }) => {
    openPracticePanel(practiceTest.title, practiceTest.questions, messageId);
  };

  return (
    <div className="flex flex-col gap-12">
      {messages.map((message) => (
        <div key={message.id} className="group w-full">
          {message.role === 'user' ? (
            <div className="flex justify-end ml-auto max-w-[85%] relative">
              <div className="absolute top-2 -left-12 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors" title="Edit message">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-primary-600 text-white px-5 py-4 rounded-3xl rounded-tr-sm shadow-sm leading-relaxed relative flex flex-col items-end">
                {message.images && message.images.length > 0 && (
                  <div className="mb-3 flex flex-row gap-2 overflow-x-auto pb-2 w-full justify-end max-w-full">
                    {message.images.map((img, index) => (
                      <div key={index} className="relative group/img cursor-pointer shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
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
                    {preprocessLaTeX(message.content)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4 md:gap-6 max-w-full">
              <div className="w-8 h-8 shrink-0 flex items-center justify-center mt-1">
                <Image
                  src="/icons8-math-40.png"
                  alt="Assistant"
                  width={32}
                  height={32}
                  className="object-contain drop-shadow-sm"
                />
              </div>
              <div className="flex-1 w-full max-w-[calc(100%-3rem)] md:max-w-[calc(100%-4rem)] overflow-hidden pt-1">

                {message.isCorrect && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium text-sm mb-4">
                    <CheckCircle2 className="w-4 h-4" />
                    Correct Approach
                  </div>
                )}

                {/* Advanced Markdown Rendering */}
                <div className="prose md:prose-lg max-w-none text-foreground leading-loose text-[1.1rem] dark:prose-invert prose-p:my-5 prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-800/50 prose-pre:border prose-pre:border-black/5 dark:prose-pre:border-white/5 prose-math:text-primary-600 dark:prose-math:text-primary-400 [&_.math-display]:my-8 [&_.math-display]:text-xl md:[&_.math-display]:text-2xl [&_.math-display]:tracking-wider [&>hr]:my-12 [&>hr]:border-t-2 [&>hr]:border-black/5 dark:[&>hr]:border-white/5 [&>hr]:w-[calc(100%+2rem)] [&>hr]:-ml-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {preprocessLaTeX(message.content)}
                  </ReactMarkdown>
                </div>

                {/* Call To Action or Saved Practice Test */}
                <div className="mt-8 pt-4 flex">
                  {message.practiceTest ? (
                    <button
                      onClick={() => handleOpenSavedPractice(message.id, message.practiceTest!)}
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

              </div>
            </div>
          )}
        </div>
      ))}

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
