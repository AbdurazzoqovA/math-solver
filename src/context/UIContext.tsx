"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import type { ReviewState } from "@/lib/learning-progress";
import type { Locale } from "@/lib/i18n/locales";
import type { InlineMathDraftSegment } from "@/components/chat/InlineMathInput";

export type ComposerDraft = {
  segments: InlineMathDraftSegment[];
  images: { url: string; ocrText: string }[];
  pendingUploads: number;
};

export const EMPTY_COMPOSER_DRAFT: ComposerDraft = {
  segments: [],
  images: [],
  pendingUploads: 0,
};

export type PracticeSessionState = {
  id: number;
  currentIndex: number;
  selectedOptions: Record<number, number | null>;
  completedQuestions: Set<number>;
  allWrongGuesses: Record<number, Set<number>>;
  shownSteps: Set<number>;
  stepsError: string | null;
  isGeneratingSteps: Record<number, boolean>;
  expandedAccordions: Record<number, Set<number>>;
  correctCount: number;
  wrongCount: number;
  answeredQuestions: Set<number>;
};

function newPracticeSession(id = 0): PracticeSessionState {
  return {
    id,
    currentIndex: 0,
    selectedOptions: {},
    completedQuestions: new Set(),
    allWrongGuesses: {},
    shownSteps: new Set(),
    stepsError: null,
    isGeneratingSteps: {},
    expandedAccordions: {},
    correctCount: 0,
    wrongCount: 0,
    answeredQuestions: new Set(),
  };
}

export type Step = {
  title: string;
  explanation: string;
};

export type Question = {
  id?: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  steps?: string | Step[];
  language?: Locale;
  stepsLanguage?: Locale;
  reviewState?: ReviewState;
};

export type ReviewItem = {
  messageId: string;
  questionIndex: number;
  question: Question;
  title: string;
};

type UIContextType = {
  isCalculatorOpen: boolean;
  setCalculatorOpen: (open: boolean) => void;
  toggleCalculator: () => void;
  
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  isPracticePanelOpen: boolean;
  practiceTopic: string | null;
  practiceMessageId: string | null;
  practiceQuestions: Question[];
  practiceMode: "practice" | "review";
  practiceReviewItems: ReviewItem[];
  setPracticeQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  updatePracticeQuestions: (sessionId: number, update: React.SetStateAction<Question[]>) => void;
  practiceSession: PracticeSessionState;
  setPracticeSession: React.Dispatch<React.SetStateAction<PracticeSessionState>>;
  openPracticePanel: (topic: string, questions: Question[], messageId?: string) => void;
  openReviewPanel: (items: ReviewItem[]) => void;
  closePracticePanel: () => void;
  
  // Callback management for tools like calculator to insert values into active inputs
  registerInsertCallback: (id: string, callback: (val: string) => void) => void;
  unregisterInsertCallback: (id: string) => void;
  insertAtActiveField: (val: string) => void;
  composerDrafts: Record<string, ComposerDraft>;
  updateComposerDraft: (id: string, update: (draft: ComposerDraft) => ComposerDraft) => void;
  clearComposerDraft: (id: string) => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isCalculatorOpen, setCalculatorOpen] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isPracticePanelOpen, setIsPracticePanelOpen] = useState(false);
  const [practiceTopic, setPracticeTopic] = useState<string | null>(null);
  const [practiceMessageId, setPracticeMessageId] = useState<string | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [practiceSession, setPracticeSession] = useState(newPracticeSession);
  const practiceSessionId = useRef(0);
  const [practiceMode, setPracticeMode] =
    useState<"practice" | "review">("practice");
  const [practiceReviewItems, setPracticeReviewItems] = useState<ReviewItem[]>(
    [],
  );

  const callbacks = useRef<Record<string, (val: string) => void>>({});
  // Keep unsent input in memory across locale navigation, including OCR that
  // finishes after the original composer has unmounted.
  const [composerDrafts, setComposerDrafts] = useState<Record<string, ComposerDraft>>({});
  const updateComposerDraft = useCallback((id: string, update: (draft: ComposerDraft) => ComposerDraft) => {
    setComposerDrafts((drafts) => ({
      ...drafts,
      [id]: update(drafts[id] ?? EMPTY_COMPOSER_DRAFT),
    }));
  }, []);
  const clearComposerDraft = useCallback((id: string) => {
    setComposerDrafts((drafts) => ({
      ...drafts,
      [id]: { ...EMPTY_COMPOSER_DRAFT, pendingUploads: drafts[id]?.pendingUploads ?? 0 },
    }));
  }, []);

  const toggleCalculator = useCallback(() => {
    setCalculatorOpen((prev) => !prev);
  }, []);

  const updatePracticeQuestions = useCallback((sessionId: number, update: React.SetStateAction<Question[]>) => {
    setPracticeQuestions((questions) => practiceSessionId.current !== sessionId
      ? questions
      : typeof update === "function" ? update(questions) : update);
  }, []);

  const openPracticePanel = useCallback((topic: string, questions: Question[], messageId?: string) => {
    practiceSessionId.current += 1;
    setPracticeSession(newPracticeSession(practiceSessionId.current));
    setPracticeMode("practice");
    setPracticeReviewItems([]);
    setPracticeTopic(topic);
    setPracticeMessageId(messageId || null);
    setPracticeQuestions(questions);
    setIsPracticePanelOpen(true);
  }, []);

  const openReviewPanel = useCallback((items: ReviewItem[]) => {
    if (items.length === 0) return;
    practiceSessionId.current += 1;
    setPracticeSession(newPracticeSession(practiceSessionId.current));
    setPracticeMode("review");
    setPracticeReviewItems(items);
    setPracticeTopic("Mistake review");
    setPracticeMessageId(null);
    setPracticeQuestions(items.map((item) => item.question));
    setIsPracticePanelOpen(true);
  }, []);

  const closePracticePanel = useCallback(() => {
    practiceSessionId.current += 1;
    const closingSessionId = practiceSessionId.current;
    setPracticeSession(newPracticeSession(closingSessionId));
    setIsPracticePanelOpen(false);
    setTimeout(() => {
      if (practiceSessionId.current !== closingSessionId) return;
      setPracticeTopic(null);
      setPracticeMessageId(null);
      setPracticeQuestions([]);
      setPracticeMode("practice");
      setPracticeReviewItems([]);
    }, 300); // clear after animation
  }, []);

  const registerInsertCallback = useCallback((id: string, callback: (val: string) => void) => {
    callbacks.current[id] = callback;
  }, []);

  const unregisterInsertCallback = useCallback((id: string) => {
    delete callbacks.current[id];
  }, []);

  const insertAtActiveField = useCallback((val: string) => {
    // Current simple logic: call all registered callbacks (usually only one active input at a time)
    Object.values(callbacks.current).forEach(cb => cb(val));
  }, []);

  return (
    <UIContext.Provider value={{ 
      isCalculatorOpen, 
      setCalculatorOpen, 
      toggleCalculator,
      isMobileSidebarOpen,
      setMobileSidebarOpen,
      isPracticePanelOpen,
      practiceTopic,
      practiceMessageId,
      practiceQuestions,
      practiceMode,
      practiceReviewItems,
      setPracticeQuestions,
      updatePracticeQuestions,
      practiceSession,
      setPracticeSession,
      openPracticePanel,
      openReviewPanel,
      closePracticePanel,
      registerInsertCallback,
      unregisterInsertCallback,
      insertAtActiveField,
      composerDrafts,
      updateComposerDraft,
      clearComposerDraft
    }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
