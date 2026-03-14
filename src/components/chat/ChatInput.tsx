"use client";

import { useState, useRef } from "react";
import { Calculator, ArrowUpCircle, ImagePlus, Loader2, X } from "lucide-react";
import InlineMathInput, { type InlineMathInputHandle } from "./InlineMathInput";
import MathKeyboard from "./MathKeyboard";
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

export default function ChatInput({
  onSubmit,
  disabled
}: {
  onSubmit?: (val: string, images?: { url: string; ocrText: string }[]) => void;
  disabled?: boolean;
}) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{ url: string; ocrText: string }[]>([]);
  const inputRef = useRef<InlineMathInputHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const { isCalculatorOpen, toggleCalculator } = useUI();

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

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
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

      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPaste={handlePaste}
        className={`w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] overflow-hidden transition-all relative ${isDragging
            ? "border-2 border-primary-500 shadow-[0_8px_40px_rgb(59,130,246,0.15)] ring-4 ring-primary-500/20"
            : "border border-black/5 dark:border-white/10 focus-within:ring-2 focus-within:ring-primary-500/30 focus-within:shadow-[0_8px_40px_rgb(0,0,0,0.12)] focus-within:bg-white dark:focus-within:bg-zinc-900"
          }`}
      >

        {/* Drag Overlay State */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-primary-50/90 dark:bg-primary-950/90 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-primary-500 rounded-3xl m-0.5 pointer-events-none">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center mb-2 animate-bounce">
              <ImagePlus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-lg font-bold text-primary-700 dark:text-primary-300">Drop image here</h3>
          </div>
        )}

        {/* Upload Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center mb-2">
              <Loader2 className="w-6 h-6 text-primary-600 dark:text-primary-400 animate-spin" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Extracting text…</h3>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">Analyzing your documents</p>
          </div>
        )}

        {/* Visible Upload Banner */}
        <div
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className="w-full border-b border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] p-3 flex items-center justify-center gap-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
            <ImagePlus className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap">
            Drag &amp; drop or{" "}
            <span className="text-primary-600 dark:text-primary-400">upload</span>{" "}
            an image
          </p>
        </div>

        <div className="p-2 flex flex-col">
          {/* Uploaded Image Thumbnail UI */}
          {uploadedImages.length > 0 && (
            <div className="px-3 pt-2 pb-1 flex flex-row gap-2 overflow-x-auto max-w-full">
              {uploadedImages.map((img, idx) => (
                <div key={idx} className="relative self-start group/img shrink-0">
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      setUploadedImages(prev => prev.filter((_, i) => i !== idx));
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity z-10 shadow-md hover:bg-zinc-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={img.url} 
                    alt={`Uploaded ${idx + 1}`} 
                    className="h-14 w-auto flex-none rounded-md border border-black/10 dark:border-white/10 object-contain bg-white dark:bg-zinc-800"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Inline rich input */}
          <InlineMathInput
            ref={inputRef}
            placeholder="Ask a math question or click Σ to insert a formula…"
            onSubmit={() => {
              if (!disabled && inputRef.current && onSubmit) {
                const val = inputRef.current.getValue();
                if (val.trim() || uploadedImages.length > 0) {
                  onSubmit(val, uploadedImages.length > 0 ? uploadedImages : undefined);
                  inputRef.current.clear();
                  setKeyboardOpen(false);
                  setUploadedImages([]);
                }
              }
            }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between px-2 pb-1 mt-1">
            <div className="flex items-center gap-1">

              <button
                onClick={toggleCalculator}
                onMouseDown={(e) => e.preventDefault()}
                className={`flex items-center justify-center p-2 rounded-xl transition-colors group ${isCalculatorOpen
                    ? "bg-primary-500/10 text-primary-600"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                title="Calculator"
              >
                <Calculator className="w-5 h-5 group-hover:text-primary-500 transition-colors" />
              </button>

              <button
                onClick={handleMathButtonClick}
                onMouseDown={(e) => e.preventDefault()}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-xl transition-colors group ${keyboardOpen
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
              >
                <SigmaIcon className="w-4 h-4 group-hover:text-primary-500 transition-colors" />
                <span className="hidden sm:inline">Math Input</span>
              </button>
            </div>

            <button
              onClick={() => {
                if (!disabled && inputRef.current && onSubmit) {
                  const val = inputRef.current.getValue();
                  if (val.trim() || uploadedImages.length > 0) {
                    onSubmit(val, uploadedImages.length > 0 ? uploadedImages : undefined);
                    inputRef.current.clear();
                    setKeyboardOpen(false);
                    setUploadedImages([]);
                  }
                }
              }}
              disabled={disabled}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all outline-none scale-95 hover:scale-100 active:scale-95 ${disabled
                  ? "bg-zinc-200 dark:bg-zinc-800 text-muted-foreground cursor-not-allowed shadow-none"
                  : "bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-primary-500/25"
                }`}
            >
              <ArrowUpCircle className={`w-6 h-6 ${disabled ? "opacity-50" : ""}`} />
            </button>
          </div>
        </div>

        {/* Keyboard panel */}
        {keyboardOpen && (
          <div className="border-t border-black/5 dark:border-white/5 p-4 bg-zinc-50/50 dark:bg-zinc-950/50 animate-in fade-in slide-in-from-top-2 duration-200">
            <MathKeyboard onInsert={handleMathInsert} />
          </div>
        )}
      </div>

      <div className="text-center mt-4">
        <p className="text-[11px] text-muted-foreground/60 w-full max-w-md font-medium">
          MathSolver can make mistakes. Please verify important calculations.
        </p>
      </div>
    </div>
  );
}

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
