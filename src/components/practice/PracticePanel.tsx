"use client";

import { useState, useEffect } from "react";
import { useUI } from "@/context/UIContext";
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export default function PracticePanel() {
  const { isPracticePanelOpen, closePracticePanel, practiceTopic, practiceQuestions } = useUI();
  
  const questions = practiceQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // State for the current question
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  
  // Overall scores
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  // Track which questions we've already answered so we don't double count
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  const shortTitle = practiceTopic || "Math Topic";

  useEffect(() => {
    if (isPracticePanelOpen && practiceTopic) {
      // Reset state for new practice session
      setCurrentIndex(0);
      setSelectedOption(null);
      setIsChecked(false);
      setShowSteps(false);
      setCorrectCount(0);
      setWrongCount(0);
      setAnsweredQuestions(new Set());
    }
  }, [isPracticePanelOpen, practiceTopic]);

  const handleCheck = () => {
    if (selectedOption === null) return;
    setIsChecked(true);
    
    if (!answeredQuestions.has(currentIndex)) {
      if (selectedOption === currentQ.correctAnswerIndex) {
        setCorrectCount(prev => prev + 1);
      } else {
        setWrongCount(prev => prev + 1);
      }
      setAnsweredQuestions(prev => new Set(prev).add(currentIndex));
    }
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsChecked(false);
      setShowSteps(false);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      // We don't save state between going back and forth in this simple version,
      // so we reset view state.
      setSelectedOption(null);
      setIsChecked(false);
      setShowSteps(false);
    }
  };

  if (!isPracticePanelOpen) return null;

  const currentQ = questions[currentIndex];

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-zinc-950 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5 shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
        <div>
          <h2 className="text-xl font-bold text-foreground">Practice Test</h2>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{shortTitle}</p>
        </div>
        <button 
          onClick={closePracticePanel}
          className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors shrink-0 ml-4"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {questions.length > 0 && currentQ ? (
            <div className="flex flex-col space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Progress Stats */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  Let's start!
                </div>
                <div className="flex gap-2 mb-4 h-1.5">
                  {questions.map((_, idx) => (
                     <div key={idx} className={`flex-1 rounded-full ${idx <= currentIndex ? 'bg-primary-500' : 'bg-black/5 dark:bg-white/10'}`} />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  You got <span className="text-emerald-500 font-bold">{correctCount}</span> answers correct and <span className="text-rose-500 font-bold">{wrongCount}</span> wrong
                </div>
              </div>

              {/* Navigation Header */}
              <div className="flex items-center justify-between mt-8 border-t border-black/5 dark:border-white/5 pt-8">
                <button 
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className="p-2 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-sm font-medium text-muted-foreground">
                  Question {currentIndex + 1} of {questions.length}
                </div>
                <button 
                  onClick={goToNext}
                  disabled={currentIndex === questions.length - 1}
                  className="p-2 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Question */}
              <div className="prose dark:prose-invert max-w-none text-lg text-foreground prose-p:my-0 prose-math:text-primary-600 dark:prose-math:text-primary-400 font-medium">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {currentQ.question}
                </ReactMarkdown>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  let borderClass = "border-black/10 dark:border-white/10 hover:border-primary-500/50";
                  let bgClass = "bg-white dark:bg-zinc-900";
                  
                  if (isChecked) {
                    if (idx === currentQ.correctAnswerIndex) {
                      borderClass = "border-emerald-500 text-emerald-700 dark:text-emerald-400";
                      bgClass = "bg-emerald-50 dark:bg-emerald-500/10";
                    } else if (isSelected) {
                      borderClass = "border-rose-500 text-rose-700 dark:text-rose-400";
                      bgClass = "bg-rose-50 dark:bg-rose-500/10";
                    } else {
                       borderClass = "border-black/5 dark:border-white/5 opacity-50";
                    }
                  } else if (isSelected) {
                    borderClass = "border-primary-500 ring-1 ring-primary-500";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => !isChecked && setSelectedOption(idx)}
                      disabled={isChecked}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${borderClass} ${bgClass}`}
                    >
                       <div className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center
                         ${isSelected ? 'border-primary-500' : 'border-black/20 dark:border-white/20'}
                         ${isChecked && idx === currentQ.correctAnswerIndex ? 'border-emerald-500 bg-emerald-500' : ''}
                         ${isChecked && isSelected && idx !== currentQ.correctAnswerIndex ? 'border-rose-500 bg-rose-500' : ''}
                       `}>
                          {isSelected && !isChecked && <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />}
                       </div>
                       <div className={`prose dark:prose-invert max-w-none m-0 prose-p:m-0 ${isChecked ? 'prose-math:text-inherit' : 'prose-math:text-foreground dark:prose-math:text-foreground'}`}>
                         <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                           {opt}
                         </ReactMarkdown>
                       </div>
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={handleCheck}
                  disabled={selectedOption === null || isChecked}
                  className="px-6 py-2.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-200 dark:disabled:hover:bg-zinc-800 text-foreground font-semibold rounded-xl text-sm transition-colors"
                >
                  Check
                </button>
                
                {isChecked && (
                  <button
                    onClick={() => setShowSteps(!showSteps)}
                    className="text-sm font-semibold text-primary-500 hover:text-primary-600 transition-colors"
                  >
                    {showSteps ? 'Hide Steps' : 'Show Steps'}
                  </button>
                )}
              </div>

              {/* Steps Area */}
              {isChecked && showSteps && (
                <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-math:text-primary-600 dark:prose-math:text-primary-400">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {currentQ.steps}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <p>Could not load questions. Please try again.</p>
            </div>
          )}
        </div>
    </div>
  );
}
