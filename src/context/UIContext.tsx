"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type Question = {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  steps: string;
};

type UIContextType = {
  isCalculatorOpen: boolean;
  setCalculatorOpen: (open: boolean) => void;
  toggleCalculator: () => void;
  
  isPracticePanelOpen: boolean;
  practiceTopic: string | null;
  practiceQuestions: Question[];
  openPracticePanel: (topic: string, questions: Question[]) => void;
  closePracticePanel: () => void;
  
  // Callback management for tools like calculator to insert values into active inputs
  registerInsertCallback: (id: string, callback: (val: string) => void) => void;
  unregisterInsertCallback: (id: string) => void;
  insertAtActiveField: (val: string) => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isCalculatorOpen, setCalculatorOpen] = useState(false);
  const [isPracticePanelOpen, setIsPracticePanelOpen] = useState(false);
  const [practiceTopic, setPracticeTopic] = useState<string | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);

  const callbacks = useRef<Record<string, (val: string) => void>>({});

  const toggleCalculator = useCallback(() => {
    setCalculatorOpen((prev) => !prev);
  }, []);

  const openPracticePanel = useCallback((topic: string, questions: Question[]) => {
    setPracticeTopic(topic);
    setPracticeQuestions(questions);
    setIsPracticePanelOpen(true);
  }, []);

  const closePracticePanel = useCallback(() => {
    setIsPracticePanelOpen(false);
    setTimeout(() => {
      setPracticeTopic(null);
      setPracticeQuestions([]);
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
      isPracticePanelOpen,
      practiceTopic,
      practiceQuestions,
      openPracticePanel,
      closePracticePanel,
      registerInsertCallback,
      unregisterInsertCallback,
      insertAtActiveField
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
