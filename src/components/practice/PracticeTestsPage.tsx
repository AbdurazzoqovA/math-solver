"use client";

import { useChatContext } from "@/context/ChatContext";
import { useUI } from "@/context/UIContext";
import { useRouter } from "next/navigation";
import { BookOpen, ArrowRight, ClipboardList, Sparkles } from "lucide-react";
import { Question } from "@/context/UIContext";

type PracticeTestEntry = {
  chatId: string;
  chatTitle: string;
  messageId: string;
  title: string;
  questions: Question[];
};

export default function PracticeTestsPage() {
  const { chats, switchChat } = useChatContext();
  const { openPracticePanel } = useUI();
  const router = useRouter();

  // Scan all chats for messages with practice tests
  const practiceTests: PracticeTestEntry[] = [];
  for (const chat of chats) {
    for (const message of chat.messages) {
      if (message.practiceTest) {
        practiceTests.push({
          chatId: chat.id,
          chatTitle: chat.title,
          messageId: message.id,
          title: message.practiceTest.title,
          questions: message.practiceTest.questions,
        });
      }
    }
  }

  // Sort by most recent chat first
  const sortedTests = [...practiceTests].sort((a, b) => {
    const chatA = chats.find(c => c.id === a.chatId);
    const chatB = chats.find(c => c.id === b.chatId);
    return (chatB?.updatedAt || 0) - (chatA?.updatedAt || 0);
  });

  const handleTestClick = (test: PracticeTestEntry) => {
    switchChat(test.chatId);
    openPracticePanel(test.title, test.questions, test.messageId);
    router.push("/");
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="px-6 md:px-10 pt-10 md:pt-14 pb-6 shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Practice Tests
            </h1>
          </div>
          <p className="text-muted-foreground text-[15px] md:text-base mt-2 ml-[52px]">
            All your generated practice tests in one place. Click to practice again.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10">
        <div className="max-w-4xl mx-auto">
          {sortedTests.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center text-center py-24 px-4">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/20 flex items-center justify-center mb-6 shadow-sm">
                <ClipboardList className="w-9 h-9 text-primary-500 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">No practice tests yet</h2>
              <p className="text-muted-foreground text-[15px] max-w-sm leading-relaxed">
                Start a chat, solve a math problem, then tap <strong>"Take a Practice Test"</strong> to generate questions. They&apos;ll show up here.
              </p>
              <button
                onClick={() => router.push("/")}
                className="mt-8 flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                Start Solving
              </button>
            </div>
          ) : (
            /* Test Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedTests.map((test, idx) => (
                <button
                  key={`${test.chatId}-${test.messageId}-${idx}`}
                  onClick={() => handleTestClick(test)}
                  className="group text-left p-5 rounded-2xl border border-black/8 dark:border-white/8 bg-white dark:bg-zinc-900 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-[0_4px_20px_-4px_rgba(37,99,235,0.1)] dark:hover:shadow-none transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[15px] text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-snug line-clamp-2">
                        {test.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded-full">
                          {test.questions.length} questions
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 truncate">
                        From: {test.chatTitle}
                      </p>
                    </div>
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-black/[0.03] dark:bg-white/[0.06] flex items-center justify-center text-muted-foreground group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 group-hover:text-primary-500 transition-all">
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
