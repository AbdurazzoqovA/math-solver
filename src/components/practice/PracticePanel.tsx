"use client";

import { useState, useEffect } from "react";
import { useUI } from "@/context/UIContext";
import { Loader2, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { useChatContext } from "@/context/ChatContext";

export default function PracticePanel() {
  const { isPracticePanelOpen, closePracticePanel, practiceTopic, practiceMessageId, practiceQuestions, setPracticeQuestions } = useUI();
  const { savePracticeToMessage } = useChatContext();
  
  const questions = practiceQuestions;
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // State per question index
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number | null>>({});
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [allWrongGuesses, setAllWrongGuesses] = useState<Record<number, Set<number>>>({});
  const [shownSteps, setShownSteps] = useState<Set<number>>(new Set());
  const [isGeneratingSteps, setIsGeneratingSteps] = useState<Record<number, boolean>>({});
  
  // Track specifically which accordion indices are open per question
  const [expandedAccordions, setExpandedAccordions] = useState<Record<number, Set<number>>>({});
  
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
      setSelectedOptions({});
      setCompletedQuestions(new Set());
      setAllWrongGuesses({});
      setShownSteps(new Set());
      setIsGeneratingSteps({});
      setExpandedAccordions({});
      setCorrectCount(0);
      setWrongCount(0);
      setAnsweredQuestions(new Set());
    }
  }, [isPracticePanelOpen, practiceTopic]);

  const currentSelectedOption = selectedOptions[currentIndex] ?? null;
  const isQuestionComplete = completedQuestions.has(currentIndex);
  const currentWrongGuesses = allWrongGuesses[currentIndex] ?? new Set<number>();
  const isStepsShown = shownSteps.has(currentIndex);

  const handleCheck = () => {
    if (currentSelectedOption === null) return;
    
    const isCorrect = currentSelectedOption === currentQ.correctAnswerIndex;

    if (isCorrect) {
      setCompletedQuestions(prev => new Set(prev).add(currentIndex));
      if (!answeredQuestions.has(currentIndex)) {
        setCorrectCount(prev => prev + 1);
        setAnsweredQuestions(prev => new Set(prev).add(currentIndex));
      }
    } else {
      setAllWrongGuesses(prev => {
        const currentSet = new Set(prev[currentIndex] || []);
        currentSet.add(currentSelectedOption);
        return { ...prev, [currentIndex]: currentSet };
      });
      if (!answeredQuestions.has(currentIndex)) {
        setWrongCount(prev => prev + 1);
        setAnsweredQuestions(prev => new Set(prev).add(currentIndex));
      }
    }
  };

  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const currentWrongGuessesSet = allWrongGuesses[currentIndex];
  const isQuestionAnsweredIncorrectly = currentWrongGuessesSet && currentWrongGuessesSet.size > 0;
  // Show steps button is available if the question is complete (correct) or if the user has attempted it and failed
  const canShowSteps = isQuestionComplete || isQuestionAnsweredIncorrectly;

  const handleShowStepsClick = async () => {
    // If we're already generating, do nothing
    if (isGeneratingSteps[currentIndex]) return;

    // Toggle close if currently open
    if (isStepsShown) {
      setShownSteps(prev => {
        const next = new Set(prev);
        next.delete(currentIndex);
        return next;
      });
      return;
    }

    const currentQ = questions[currentIndex];

    // If steps already exist on this question, just open it
    if (currentQ.steps) {
      setShownSteps(prev => new Set(prev).add(currentIndex));
      return;
    }

    // Otherwise, let's fetch them
    setIsGeneratingSteps(prev => ({ ...prev, [currentIndex]: true }));
    
    try {
      const response = await fetch('/api/practice/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQ.question,
          options: currentQ.options,
          correctAnswerIndex: currentQ.correctAnswerIndex
        })
      });

      if (!response.ok) throw new Error("Failed to fetch steps");
      const stepsData = await response.json();

      // Update the practice questions mapped array dynamically
      const newQuestions = [...questions];
      newQuestions[currentIndex] = { ...newQuestions[currentIndex], steps: stepsData };
      setPracticeQuestions(newQuestions);
      
      // Auto-persist back to localStorage if this session is bound to an actual chat message
      if (shortTitle && practiceMessageId) {
        savePracticeToMessage(practiceMessageId, {
           title: shortTitle,
           questions: newQuestions
        });
      }

      // Automatically open the steps panel now that they are loaded
      setShownSteps(prev => new Set(prev).add(currentIndex));

    } catch (error) {
      console.error("Error generating steps:", error);
      // Optional: Handle error UI here if required
    } finally {
      setIsGeneratingSteps(prev => ({ ...prev, [currentIndex]: false }));
    }
  };

  const toggleAccordion = (qIndex: number, stepIndex: number) => {
    setExpandedAccordions(prev => {
      const qSet = new Set(prev[qIndex] || []);
      if (qSet.has(stepIndex)) {
         qSet.delete(stepIndex);
      } else {
         qSet.add(stepIndex);
      }
      return { ...prev, [qIndex]: qSet };
    });
  };

  if (!isPracticePanelOpen) return null;

  const currentQ = questions[currentIndex];

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-zinc-950 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-black/5 dark:border-white/5 shrink-0 bg-zinc-50 dark:bg-zinc-900/50">
        <div>
          <h2 className="text-lg font-bold text-foreground leading-tight">Practice Test</h2>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{shortTitle}</p>
        </div>
        <button 
          onClick={closePracticePanel}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors shrink-0 ml-4"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          {questions.length > 0 && currentQ ? (
            <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Progress Stats */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                   <div className="text-sm font-medium text-muted-foreground">
                     Progress
                   </div>
                   <div className="text-[13px] text-muted-foreground font-medium">
                    <span className="text-emerald-500">{correctCount}</span> ✓ • <span className="text-rose-500">{wrongCount}</span> ✕
                   </div>
                </div>
                <div className="flex gap-1.5 h-1.5">
                  {questions.map((_, idx) => (
                     <div key={idx} className={`flex-1 rounded-full ${idx <= currentIndex ? 'bg-primary-500' : 'bg-black/5 dark:bg-white/10'}`} />
                  ))}
                </div>
              </div>

              {/* Navigation Header */}
              <div className="flex items-center justify-between mb-5">
                <button 
                  onClick={goToPrev}
                  disabled={currentIndex === 0}
                  className="p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-transparent hover:border-black/5 dark:hover:border-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-[13px] font-semibold text-foreground bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
                  Question {currentIndex + 1} of {questions.length}
                </div>
                <button 
                  onClick={goToNext}
                  disabled={currentIndex === questions.length - 1}
                  className="p-1.5 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-all border border-transparent hover:border-black/5 dark:hover:border-white/5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Question */}
              <div className="prose dark:prose-invert max-w-none text-[1.1rem] text-foreground prose-p:my-0 prose-p:leading-relaxed prose-math:text-primary-600 dark:prose-math:text-primary-400 font-medium mb-6">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {currentQ.question}
                </ReactMarkdown>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt, idx) => {
                  const isSelected = currentSelectedOption === idx;
                  const isCorrectAnswer = idx === currentQ.correctAnswerIndex;
                  const isWrongGuess = currentWrongGuesses.has(idx);
                  
                  let borderClass = "border-black/10 dark:border-white/10";
                  let bgClass = "bg-white dark:bg-zinc-900";
                  
                  if (isQuestionComplete && isCorrectAnswer) {
                      borderClass = "border-emerald-500/80 shadow-sm text-emerald-950 dark:text-emerald-50";
                      bgClass = "bg-emerald-50/50 dark:bg-emerald-500/10";
                  } else if (isWrongGuess) {
                      borderClass = "border-rose-400 dark:border-rose-500/60 text-rose-950 dark:text-rose-50";
                      bgClass = "bg-rose-50/50 dark:bg-rose-500/10";
                  } else if (isQuestionComplete) {
                      borderClass = "border-black/5 dark:border-white/5 opacity-50 grayscale";
                      bgClass = "bg-transparent";
                  } else if (isSelected) {
                    borderClass = "border-primary-500 ring-1 ring-primary-500 shadow-sm";
                  } else {
                    borderClass += " hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => !isQuestionComplete && !isWrongGuess && setSelectedOptions(prev => ({ ...prev, [currentIndex]: idx }))}
                      disabled={isQuestionComplete || isWrongGuess}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex items-start gap-4 group ${borderClass} ${bgClass}`}
                    >
                       <div className={`mt-1 w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-colors
                         ${isSelected && !isQuestionComplete && !isWrongGuess ? 'border-primary-500' : 'border-black/20 dark:border-white/20'}
                         ${isQuestionComplete && isCorrectAnswer ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                         ${isWrongGuess ? 'border-rose-500 bg-rose-500 text-white' : ''}
                       `}>
                          {isSelected && !isQuestionComplete && !isWrongGuess && <div className="w-2 h-2 bg-primary-500 rounded-full" />}
                          {isQuestionComplete && isCorrectAnswer && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          {isWrongGuess && <X className="w-2.5 h-2.5 stroke-[3]" />}
                       </div>
                       <div className={`prose md:prose-sm dark:prose-invert max-w-none m-0 prose-p:m-0 flex-1 leading-relaxed ${isQuestionComplete && !isCorrectAnswer ? 'prose-math:text-muted-foreground opacity-70 text-[0.95rem]' : 'text-[0.95rem] text-inherit prose-math:text-inherit dark:prose-math:text-inherit'}`}>
                         <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                           {opt}
                         </ReactMarkdown>
                       </div>
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-6 mt-6 border-t border-black/5 dark:border-white/5">
                {!isQuestionComplete ? (
                  <button
                    onClick={handleCheck}
                    disabled={currentSelectedOption === null || currentWrongGuesses.has(currentSelectedOption)}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:hover:bg-primary-600 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    onClick={currentIndex === questions.length - 1 ? closePracticePanel : goToNext}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                  >
                    {currentIndex === questions.length - 1 ? 'Finish Practice' : 'Next Question'}
                    {currentIndex !== questions.length - 1 && <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
                
                {canShowSteps && (
                  <button
                    onClick={handleShowStepsClick}
                    disabled={isGeneratingSteps[currentIndex]}
                    className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-sm font-semibold text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {isGeneratingSteps[currentIndex] && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                    {!isGeneratingSteps[currentIndex] && isStepsShown ? 'Hide Steps' : 'Show Steps'}
                  </button>
                )}
              </div>

              {/* Steps Area */}
              {canShowSteps && isStepsShown && currentQ.steps && (
                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                  {typeof currentQ.steps === 'string' ? (
                     // Legacy Support for older practice tests
                     <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-math:text-primary-600 dark:prose-math:text-primary-400">
                       <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                         {currentQ.steps}
                       </ReactMarkdown>
                     </div>
                  ) : (
                     // Accordion Support for new practice tests
                     <div className="flex flex-col gap-2">
                       {currentQ.steps.map((step, idx) => {
                         const isExpanded = (expandedAccordions[currentIndex] || new Set()).has(idx);
                         return (
                           <div key={idx} className="border-b border-black/5 dark:border-white/5 last:border-0 rounded-xl overflow-hidden group">
                             <button
                               onClick={() => toggleAccordion(currentIndex, idx)}
                               className="w-full flex items-center justify-between p-4 bg-white dark:bg-zinc-900 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                             >
                               <span className="font-semibold text-[15px] text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-start sm:items-center gap-2.5 text-left">
                                 <span className="flex items-center justify-center bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 w-6 h-6 rounded-full text-[13px] font-bold shrink-0 mt-0.5 sm:mt-0">
                                   {idx + 1}
                                 </span>
                                 <span>{step.title}</span>
                               </span>
                               <span className="shrink-0 text-muted-foreground w-6 h-6 flex items-center justify-center rounded-full transition-transform duration-200">
                                 {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                               </span>
                             </button>
                             {isExpanded && (
                               <div className="p-4 pt-1 bg-white dark:bg-zinc-900 border-t border-transparent text-[15px]">
                                 <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:m-0 prose-math:text-primary-600 dark:prose-math:text-primary-400">
                                   <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                     {step.explanation}
                                   </ReactMarkdown>
                                 </div>
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                  )}
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
