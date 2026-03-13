"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowUpCircle, ImagePlus, Calculator, Loader2, X } from "lucide-react";
import MathKeyboard from "./MathKeyboard";
import InlineMathInput, { type InlineMathInputHandle } from "./InlineMathInput";
import { useUI } from "@/context/UIContext";

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/bmp",
  "image/tiff",
  "image/webp",
  "application/pdf",
];

export default function HeroInput({ onSubmit }: { onSubmit: (val: string, images?: { url: string; ocrText: string }[]) => void }) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; ocrText: string }[]>([]);
  const inputRef = useRef<InlineMathInputHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const { isCalculatorOpen, toggleCalculator, registerInsertCallback, unregisterInsertCallback } = useUI();

  // Register insert callback so the floating calculator can inject values
  useEffect(() => {
    const insertVal = (val: string) => {
      if (!inputRef.current) return;
      inputRef.current.smartInsert(val);
    };
    registerInsertCallback("hero-input", insertVal);
    return () => unregisterInsertCallback("hero-input");
  }, [registerInsertCallback, unregisterInsertCallback]);

  // Called by the Math Keyboard when a symbol is clicked
  const handleMathInsert = (latex: string) => {
    if (!inputRef.current) return;
    inputRef.current.smartInsert(latex);
  };

  const handleMathButtonClick = () => {
    const opening = !keyboardOpen;
    setKeyboardOpen(opening);
    if (opening) {
      setTimeout(() => {
        if (!inputRef.current) return;
        if (!inputRef.current.hasFocusedMath()) {
          inputRef.current.insertMathChip();
        }
      }, 80);
    }
  };

  // --- Drag & Drop / Paste Handlers ---
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      handleFileUpload(Array.from(e.clipboardData.files));
    }
  };

  const handleFileUpload = async (files: File[]) => {
    const validFiles = files.filter(f => ACCEPTED_FILE_TYPES.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (validFiles.length === 0) {
      alert("No valid files to upload. Check file types (Images/PDFs) and size (max 10MB).");
      return;
    }

    setIsUploading(true);

    try {
      const results = await Promise.all(validFiles.map(async file => {
        const base64 = await fileToBase64(file);
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64, mimeType: file.type }),
        });

        if (!response.ok) {
          throw new Error("Failed to extract text from file.");
        }

        const { text } = await response.json();
        if (text && text.trim()) {
           return { url: "data:" + file.type + ";base64," + base64, ocrText: text.trim() };
        }
        return null;
      }));

      const newImages = results.filter(Boolean) as {url: string, ocrText: string}[];
      if (newImages.length > 0) {
        setUploadedImages(prev => [...prev, ...newImages]);
      } else {
        alert("No text could be extracted from these files. Please try clearer images.");
      }
    } catch (error) {
      console.error("OCR upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to process the uploaded files.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div 
      className="w-full max-w-3xl mx-auto mt-6 relative z-10"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFileUpload(Array.from(e.target.files));
        }}
      />

      <div className={`bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-200 text-left relative ${
        isDragging 
          ? "border-2 border-primary-500 scale-[1.02] shadow-[0_8px_40px_rgb(59,130,246,0.15)] ring-4 ring-primary-500/20" 
          : "border border-black/5 dark:border-white/5 focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.08)]"
      }`}>

        {/* Drag Overlay State */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary-50/90 dark:bg-primary-950/90 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-primary-500 rounded-3xl m-1 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center mb-4 animate-bounce">
              <ImagePlus className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-bold text-primary-700 dark:text-primary-300">Drop your problem here</h3>
            <p className="text-primary-600/80 dark:text-primary-400/80 mt-1 font-medium">Image or PDF</p>
          </div>
        )}

        {/* Upload Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Extracting text…</h3>
            <p className="text-muted-foreground mt-1 text-sm font-medium">Analyzing your document with AI</p>
          </div>
        )}

        <div 
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className="w-full border-b border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] p-4 flex items-center justify-center gap-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center group-hover:scale-105 transition-all">
            <ImagePlus className="w-4.5 h-4.5 text-primary-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Drag &amp; drop or{" "}
            <span className="text-primary-600 dark:text-primary-400">upload</span>{" "}
            an image or PDF
          </p>
        </div>

        {/* Uploaded Image Thumbnail UI */}
        {uploadedImages.length > 0 && (
          <div className="px-5 pt-4 pb-0 flex flex-row gap-3 overflow-x-auto max-w-full">
            {uploadedImages.map((img, idx) => (
              <div key={idx} className="relative inline-block group/img shrink-0">
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    setUploadedImages(prev => prev.filter((_, i) => i !== idx));
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity z-10 shadow-md hover:bg-zinc-700"
                >
                  <X className="w-3 h-3" />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={img.url} 
                  alt={`Uploaded document ${idx + 1}`} 
                  className="h-16 w-auto flex-none rounded-lg border border-black/10 dark:border-white/10 object-contain bg-white dark:bg-zinc-800"
                />
              </div>
            ))}
          </div>
        )}

        {/* Unified Inline Input */}
        <div className="p-3">
          <InlineMathInput
            ref={inputRef}
            placeholder="Type your math problem, or click Σ Math to insert a formula…"
            onSubmit={() => {
              if (inputRef.current) {
                const val = inputRef.current.getValue();
                if (val.trim() || uploadedImages.length > 0) {
                  onSubmit(val, uploadedImages.length > 0 ? uploadedImages : undefined);
                }
                inputRef.current.clear();
                setUploadedImages([]);
              }
            }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between mt-2 px-2 pb-1">
            <div className="flex items-center gap-2">
              {/* Calculator toggle */}
              <button
                onClick={toggleCalculator}
                onMouseDown={(e) => e.preventDefault()}
                className={`flex items-center justify-center p-2.5 rounded-xl transition-colors group ${
                  isCalculatorOpen
                    ? "bg-primary-500/10 text-primary-600"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
                title="Calculator"
              >
                <Calculator className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
              </button>

              {/* Math keyboard toggle */}
              <button
                onClick={handleMathButtonClick}
                onMouseDown={(e) => e.preventDefault()}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl transition-colors group ${
                  keyboardOpen
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <SigmaIcon className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
                <span>Math</span>
              </button>
            </div>

            {/* Submit */}
            <button
              onClick={() => {
                if (inputRef.current) {
                  const val = inputRef.current.getValue();
                  if (val.trim() || uploadedImages.length > 0) {
                    onSubmit(val, uploadedImages.length > 0 ? uploadedImages : undefined);
                  }
                  inputRef.current.clear();
                  setUploadedImages([]);
                }
              }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white flex items-center justify-center shadow-lg shadow-primary-500/25 transition-all outline-none scale-95 hover:scale-100 active:scale-95"
            >
              <ArrowUpCircle className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* Math Keyboard Panel (slides in below toolbar) */}
        {keyboardOpen && (
          <div className="border-t border-black/5 dark:border-white/5 p-4 bg-zinc-50/50 dark:bg-zinc-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <MathKeyboard onInsert={handleMathInsert} />
          </div>
        )}
      </div>
    </div>
  );
}

// Sigma icon (matches competitor "Σ Math Input" button)
function SigmaIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 7V4H6l6 8-6 8h12v-3" />
    </svg>
  );
}

/** Convert a File to a base64 string (without the data:... prefix) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the "data:...;base64," prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
