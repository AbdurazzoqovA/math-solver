"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, GripHorizontal, Delete } from "lucide-react";
import { useUI } from "@/context/UIContext";

export default function DraggableCalculator() {
  const { isCalculatorOpen, setCalculatorOpen, insertAtActiveField } = useUI();
  const [expression, setExpression] = useState("");

  if (!isCalculatorOpen) return null;

  const handleInput = (val: string) => {
    setExpression((prev) => prev + val);
  };

  const handleClear = () => {
    setExpression("");
  };

  const handleDelete = () => {
    setExpression((prev) => prev.slice(0, -1));
  };

  const calculateText = (expr: string) => {
    try {
      const safeExpr = expr.replace(/×/g, "*").replace(/÷/g, "/");
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${safeExpr}`)();
      if (Number.isFinite(result)) {
        return String(result);
      }
      return "Error";
    } catch {
      return "Error";
    }
  };

  const handleCalculate = () => {
    if (!expression) return;
    const res = calculateText(expression);
    setExpression(res);
  };

  const buttons = [
    { label: "AC", action: handleClear, type: "action" },
    { label: <Delete className="w-5 h-5 mx-auto" />, action: handleDelete, type: "action" },
    { label: "^", action: () => handleInput("^"), type: "action" },
    { label: "÷", action: () => handleInput("÷"), type: "operator" },
    
    { label: "7", action: () => handleInput("7"), type: "number" },
    { label: "8", action: () => handleInput("8"), type: "number" },
    { label: "9", action: () => handleInput("9"), type: "number" },
    { label: "×", action: () => handleInput("×"), type: "operator" },
    
    { label: "4", action: () => handleInput("4"), type: "number" },
    { label: "5", action: () => handleInput("5"), type: "number" },
    { label: "6", action: () => handleInput("6"), type: "number" },
    { label: "−", action: () => handleInput("-"), type: "operator" },
    
    { label: "1", action: () => handleInput("1"), type: "number" },
    { label: "2", action: () => handleInput("2"), type: "number" },
    { label: "3", action: () => handleInput("3"), type: "number" },
    { label: "+", action: () => handleInput("+"), type: "operator" },
    
    { label: "(", action: () => handleInput("("), type: "action" },
    { label: "0", action: () => handleInput("0"), type: "number" },
    { label: ".", action: () => handleInput("."), type: "number" },
    { label: "=", action: handleCalculate, type: "operator" },
  ];

  return (
    <motion.div
      drag
      dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="fixed z-[999] top-20 left-10 w-64 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Draggable Header */}
      <div className="flex items-center justify-between p-3 border-b border-black/5 dark:border-white/5 cursor-move" title="Drag to move">
        <div className="w-6" />
        <GripHorizontal className="w-5 h-5 text-muted-foreground/50 pointer-events-none" />
        <button 
          onClick={() => setCalculatorOpen(false)}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Display */}
        <div className="w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl p-4 flex flex-col items-end justify-center min-h-[80px] border border-black/5 dark:border-white/5">
          <div className="text-3xl font-medium text-foreground tracking-tight break-all overflow-hidden line-clamp-2 text-right">
            {expression || "0"}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-2">
          {buttons.map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className={`h-12 rounded-xl flex items-center justify-center text-lg font-medium transition-all active:scale-90 shadow-sm
                ${btn.type === "operator" 
                  ? "bg-primary-500 text-white hover:bg-primary-600 border border-primary-600/20" 
                  : btn.type === "action"
                  ? "bg-black/5 dark:bg-white/10 text-foreground hover:bg-black/10 dark:hover:bg-white/20"
                  : "bg-white dark:bg-zinc-800 text-foreground border border-black/5 dark:border-white/5 hover:bg-zinc-50 hover:border-black/10 dark:hover:bg-zinc-700"}
              `}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Insert Button */}
        <button
          onClick={() => {
            if (expression && expression !== "Error") {
              insertAtActiveField(expression);
            }
          }}
          disabled={!expression || expression === "Error"}
          className="w-full mt-1 py-3 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
           Insert to Input
        </button>
      </div>
    </motion.div>
  );
}
