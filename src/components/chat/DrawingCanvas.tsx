"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Eraser, Undo } from "lucide-react";

const COLORS = [
  "#000000",
  "#EF4444",
  "#3B82F6",
  "#22C55E",
  "#F97316",
  "#A855F7",
];

interface DrawingCanvasProps {
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export default function DrawingCanvas({ onConfirm, onCancel }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [color, setColor] = useState(COLORS[0]);
  const [lineWidth, setLineWidth] = useState(3);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // History for Undo — store data URLs (lightweight, DPR-safe)
  const historyRef = useRef<string[]>([]);
  const [historyLen, setHistoryLen] = useState(0);

  // Current color/lineWidth refs so pointer handlers always see latest
  const colorRef = useRef(color);
  colorRef.current = color;
  const lineWidthRef = useRef(lineWidth);
  lineWidthRef.current = lineWidth;

  // ---------- Canvas sizing ----------
  // Keep canvas.width/height === CSS display size (1:1).
  // This avoids ALL coordinate/DPR bugs. We upscale only at export.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const fitCanvas = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      if (canvas.width === w && canvas.height === h) return;

      // First mount — just size and fill white
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Reset history on resize since pixel data is invalid
      historyRef.current = [];
      setHistoryLen(0);
    };

    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, []);

  // ---------- Save / Undo ----------
  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    historyRef.current.push(canvas.toDataURL("image/png"));
    setHistoryLen(historyRef.current.length);
  }, []);

  const undo = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || historyRef.current.length === 0) return;

    const dataUrl = historyRef.current.pop()!;
    setHistoryLen(historyRef.current.length);

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    saveSnapshot();
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [saveSnapshot]);

  // ---------- Coordinate helper ----------
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // ---------- Pointer handlers ----------
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);

    saveSnapshot();
    isDrawingRef.current = true;

    const pos = getPos(e);
    lastPosRef.current = pos;

    // Draw a dot so single-clicks are visible
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, lineWidthRef.current / 2, 0, Math.PI * 2);
    ctx.fillStyle = colorRef.current;
    ctx.fill();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPosRef.current) return;
    e.preventDefault();

    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = colorRef.current;
    ctx.lineWidth = lineWidthRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    lastPosRef.current = pos;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    isDrawingRef.current = false;
    lastPosRef.current = null;

    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  // ---------- Export ----------
  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Upscale 2× for better OCR accuracy
    const scale = 2;
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width * scale;
    exportCanvas.height = canvas.height * scale;
    const ectx = exportCanvas.getContext("2d")!;

    ectx.fillStyle = "#FFFFFF";
    ectx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ectx.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);

    exportCanvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "drawing.jpg", { type: "image/jpeg" });
          onConfirm(file);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  // ---------- Render ----------
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-950 rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-black/5 dark:border-white/5">
          <h2 className="text-xl font-bold text-foreground">Draw Your Math Problem</h2>
          <button
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 bg-zinc-50 dark:bg-zinc-900 relative cursor-crosshair touch-none"
          style={{ minHeight: 340 }}
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full block"
            style={{ background: "#fff" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>

        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-black/5 dark:border-white/5 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={clearCanvas}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eraser className="w-4 h-4" />
              Clear
            </button>

            <button
              onClick={undo}
              disabled={historyLen === 0}
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                historyLen === 0
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Undo className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-black/10 dark:bg-white/10 hidden sm:block" />

            {/* Colors */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground mr-0.5 hidden sm:inline">Color:</span>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-md border-2 transition-all ${
                    color === c
                      ? "border-primary-500 scale-110 shadow-sm"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <div className="h-5 w-px bg-black/10 dark:bg-white/10 hidden sm:block" />

            {/* Line Width */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
                Width:
              </span>
              <input
                type="range"
                min="1"
                max="8"
                value={lineWidth}
                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                className="w-20 accent-primary-500"
              />
              <span className="text-xs font-medium w-3 text-center">{lineWidth}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-sm transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
