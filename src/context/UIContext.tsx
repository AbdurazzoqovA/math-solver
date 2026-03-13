"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

type UIContextType = {
  isCalculatorOpen: boolean;
  setCalculatorOpen: (open: boolean) => void;
  toggleCalculator: () => void;
  
  // Callback management for tools like calculator to insert values into active inputs
  registerInsertCallback: (id: string, callback: (val: string) => void) => void;
  unregisterInsertCallback: (id: string) => void;
  insertAtActiveField: (val: string) => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isCalculatorOpen, setCalculatorOpen] = useState(false);
  const callbacks = useRef<Record<string, (val: string) => void>>({});

  const toggleCalculator = useCallback(() => {
    setCalculatorOpen((prev) => !prev);
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
