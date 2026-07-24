"use client";

import {
  Eye,
  EyeOff,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { CalculatorExample } from "@/lib/calculators";
import { compileMathExpression } from "@/lib/math-expression";

type FunctionRow = {
  id: number;
  expression: string;
  color: string;
  visible: boolean;
};

type GraphWindow = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

const colors = ["#2563eb", "#dc2626", "#059669", "#9333ea"];
const defaultWindow: GraphWindow = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
};

function createRow(id: number, expression = "", color?: string): FunctionRow {
  return {
    id,
    expression,
    color: color ?? colors[id % colors.length],
    visible: true,
  };
}

function niceGridStep(range: number) {
  const roughStep = range / 10;
  const power = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / power;
  const multiplier = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return multiplier * power;
}

function formatTick(value: number, step: number) {
  const precision = Math.max(0, Math.min(6, -Math.floor(Math.log10(step))));
  return Number(value.toFixed(precision)).toString();
}

export default function GraphingCalculator({
  initialExpressions,
  examples,
  onExplain,
}: {
  initialExpressions: string[];
  examples: CalculatorExample[];
  onExplain: (request: string) => void;
}) {
  const [rows, setRows] = useState<FunctionRow[]>(() =>
    (initialExpressions.length > 0 ? initialExpressions : ["x^2"]).map(
      (expression, index) => createRow(index, expression),
    ),
  );
  const [view, setView] = useState<GraphWindow>(defaultWindow);
  const [hoverPoint, setHoverPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    view: GraphWindow;
  } | null>(null);
  const nextIdRef = useRef(rows.length);

  const compiledRows = useMemo(
    () =>
      rows.map((row) => {
        if (!row.expression.trim()) {
          return { ...row, graph: null, error: "" };
        }
        try {
          return {
            ...row,
            graph: compileMathExpression(row.expression),
            error: "",
          };
        } catch (error) {
          return {
            ...row,
            graph: null,
            error:
              error instanceof Error ? error.message : "Check this function",
          };
        }
      }),
    [rows],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);

      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const styles = getComputedStyle(canvas);
      const background = styles.getPropertyValue("--graph-background").trim();
      const grid = styles.getPropertyValue("--graph-grid").trim();
      const axis = styles.getPropertyValue("--graph-axis").trim();
      const label = styles.getPropertyValue("--graph-label").trim();

      context.fillStyle = background || "#ffffff";
      context.fillRect(0, 0, width, height);

      const xRange = view.xMax - view.xMin;
      const yRange = view.yMax - view.yMin;
      const xToPixel = (x: number) => ((x - view.xMin) / xRange) * width;
      const yToPixel = (y: number) => height - ((y - view.yMin) / yRange) * height;
      const xStep = niceGridStep(xRange);
      const yStep = niceGridStep(yRange);

      context.lineWidth = 1;
      context.strokeStyle = grid || "#e2e8f0";
      context.fillStyle = label || "#64748b";
      context.font = "11px ui-sans-serif, system-ui, sans-serif";

      for (
        let x = Math.ceil(view.xMin / xStep) * xStep;
        x <= view.xMax + xStep / 100;
        x += xStep
      ) {
        const pixelX = xToPixel(x);
        context.beginPath();
        context.moveTo(pixelX, 0);
        context.lineTo(pixelX, height);
        context.stroke();
      }

      for (
        let y = Math.ceil(view.yMin / yStep) * yStep;
        y <= view.yMax + yStep / 100;
        y += yStep
      ) {
        const pixelY = yToPixel(y);
        context.beginPath();
        context.moveTo(0, pixelY);
        context.lineTo(width, pixelY);
        context.stroke();
      }

      context.strokeStyle = axis || "#94a3b8";
      context.lineWidth = 1.5;
      const axisX = xToPixel(0);
      const axisY = yToPixel(0);

      if (axisX >= 0 && axisX <= width) {
        context.beginPath();
        context.moveTo(axisX, 0);
        context.lineTo(axisX, height);
        context.stroke();
      }
      if (axisY >= 0 && axisY <= height) {
        context.beginPath();
        context.moveTo(0, axisY);
        context.lineTo(width, axisY);
        context.stroke();
      }

      const labelY = Math.min(height - 5, Math.max(14, axisY + 15));
      for (
        let x = Math.ceil(view.xMin / xStep) * xStep;
        x <= view.xMax + xStep / 100;
        x += xStep
      ) {
        if (Math.abs(x) > xStep / 100) {
          context.fillText(formatTick(x, xStep), xToPixel(x) + 3, labelY);
        }
      }

      const labelX = Math.min(width - 28, Math.max(4, axisX + 5));
      for (
        let y = Math.ceil(view.yMin / yStep) * yStep;
        y <= view.yMax + yStep / 100;
        y += yStep
      ) {
        if (Math.abs(y) > yStep / 100) {
          context.fillText(formatTick(y, yStep), labelX, yToPixel(y) - 4);
        }
      }

      for (const row of compiledRows) {
        if (!row.visible || !row.graph) {
          continue;
        }
        context.strokeStyle = row.color;
        context.lineWidth = 2.5;
        context.lineJoin = "round";
        context.beginPath();
        let drawing = false;
        let previousPixelY = 0;

        for (let pixelX = 0; pixelX <= width; pixelX += 1) {
          const x = view.xMin + (pixelX / width) * xRange;
          const y = row.graph.evaluate(x);
          const pixelY = yToPixel(y);
          const onReasonableScale =
            Number.isFinite(pixelY) && Math.abs(pixelY) < height * 6;
          const crossesDiscontinuity =
            drawing && Math.abs(pixelY - previousPixelY) > height * 1.5;

          if (!onReasonableScale || crossesDiscontinuity) {
            drawing = false;
            continue;
          }

          if (drawing) {
            context.lineTo(pixelX, pixelY);
          } else {
            context.moveTo(pixelX, pixelY);
            drawing = true;
          }
          previousPixelY = pixelY;
        }
        context.stroke();
      }

      if (hoverPoint) {
        const hoverX = xToPixel(hoverPoint.x);
        const hoverY = yToPixel(hoverPoint.y);
        context.strokeStyle = axis || "#94a3b8";
        context.lineWidth = 1;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(hoverX, 0);
        context.lineTo(hoverX, height);
        context.moveTo(0, hoverY);
        context.lineTo(width, hoverY);
        context.stroke();
        context.setLineDash([]);
      }
    };

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [compiledRows, hoverPoint, view]);

  const setExpression = (id: number, expression: string) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id ? { ...row, expression } : row,
      ),
    );
  };

  const addFunction = () => {
    if (rows.length >= colors.length) {
      return;
    }
    const id = nextIdRef.current;
    nextIdRef.current += 1;
    setRows((currentRows) => {
      const availableColor =
        colors.find(
          (color) => !currentRows.some((row) => row.color === color),
        ) ?? colors[id % colors.length];
      return [...currentRows, createRow(id, "", availableColor)];
    });
  };

  const zoom = (factor: number) => {
    setView((current) => {
      const centerX = (current.xMin + current.xMax) / 2;
      const centerY = (current.yMin + current.yMax) / 2;
      const halfWidth = ((current.xMax - current.xMin) * factor) / 2;
      const halfHeight = ((current.yMax - current.yMin) * factor) / 2;
      return {
        xMin: centerX - halfWidth,
        xMax: centerX + halfWidth,
        yMin: centerY - halfHeight,
        yMax: centerY + halfHeight,
      };
    });
  };

  const updatePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const pixelX = event.clientX - bounds.left;
    const pixelY = event.clientY - bounds.top;
    const x =
      view.xMin + (pixelX / Math.max(bounds.width, 1)) * (view.xMax - view.xMin);
    const y =
      view.yMax - (pixelY / Math.max(bounds.height, 1)) * (view.yMax - view.yMin);
    setHoverPoint({ x, y });

    const drag = dragRef.current;
    if (drag) {
      const xShift =
        ((event.clientX - drag.x) / Math.max(bounds.width, 1)) *
        (drag.view.xMax - drag.view.xMin);
      const yShift =
        ((event.clientY - drag.y) / Math.max(bounds.height, 1)) *
        (drag.view.yMax - drag.view.yMin);
      setView({
        xMin: drag.view.xMin - xShift,
        xMax: drag.view.xMax - xShift,
        yMin: drag.view.yMin + yShift,
        yMax: drag.view.yMax + yShift,
      });
    }
  };

  const validExpressions = compiledRows
    .filter((row) => row.visible && row.graph)
    .map((row) => row.expression.trim());
  const sampleRows = compiledRows.filter((row) => row.visible && row.graph);
  const sampleInputs = [-2, -1, 0, 1, 2];

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl border border-black/8 bg-card shadow-sm dark:border-white/10">
      <div className="grid lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.28fr)]">
        <div className="border-b border-black/8 p-4 dark:border-white/10 sm:p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Functions
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Use x, pi, e, powers, and functions such as sin(x) or sqrt(x).
              </p>
            </div>
            <button
              type="button"
              onClick={addFunction}
              disabled={rows.length >= colors.length}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/8 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
              aria-label="Add function"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {compiledRows.map((row, index) => (
              <div key={row.id}>
                <div
                  className={`flex items-center gap-2 rounded-xl border bg-background px-3 py-2 ${
                    row.error
                      ? "border-red-300 dark:border-red-800"
                      : "border-black/8 dark:border-white/10"
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: row.color }}
                    aria-hidden="true"
                  />
                  <label className="sr-only" htmlFor={`graph-function-${row.id}`}>
                    Function {index + 1}
                  </label>
                  <span className="text-sm text-muted-foreground">y =</span>
                  <input
                    id={`graph-function-${row.id}`}
                    value={row.expression}
                    onChange={(event) =>
                      setExpression(row.id, event.target.value)
                    }
                    className="min-w-0 flex-1 bg-transparent font-mono text-sm text-foreground outline-none"
                    placeholder={index === 0 ? "x^2" : "sin(x)"}
                    spellCheck={false}
                    autoComplete="off"
                    maxLength={200}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRows((currentRows) =>
                        currentRows.map((currentRow) =>
                          currentRow.id === row.id
                            ? { ...currentRow, visible: !currentRow.visible }
                            : currentRow,
                        ),
                      )
                    }
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`${row.visible ? "Hide" : "Show"} function ${index + 1}`}
                  >
                    {row.visible ? (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setRows((currentRows) =>
                          currentRows.filter(
                            (currentRow) => currentRow.id !== row.id,
                          ),
                        )
                      }
                      className="text-muted-foreground hover:text-red-600"
                      aria-label={`Remove function ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
                {row.error ? (
                  <p className="mt-1 px-1 text-xs text-red-600 dark:text-red-400">
                    {row.error}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <p className="text-xs font-medium text-muted-foreground">
              Try an example
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example.expression}
                  type="button"
                  onClick={() => setExpression(rows[0].id, example.expression)}
                  className="rounded-lg border border-black/8 bg-background px-3 py-2 font-mono text-xs text-foreground transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-white/10 dark:hover:border-primary-700 dark:hover:bg-primary-950/30"
                >
                  {example.expression}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={validExpressions.length === 0}
            onClick={() =>
              onExplain(
                `Analyze the graph of ${validExpressions
                  .map((expression) => `y = ${expression}`)
                  .join(" and ")}. Explain the domain, range, intercepts, turning points, asymptotes, and transformations that apply.`,
              )
            }
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Explain this graph
          </button>
        </div>

        <div className="min-w-0 p-3 sm:p-4">
          <div className="relative overflow-hidden rounded-xl border border-black/8 dark:border-white/10">
            <canvas
              ref={canvasRef}
              className="block h-[360px] w-full cursor-crosshair touch-none [--graph-axis:#94a3b8] [--graph-background:#ffffff] [--graph-grid:#e2e8f0] [--graph-label:#64748b] dark:[--graph-axis:#64748b] dark:[--graph-background:#09090b] dark:[--graph-grid:#27272a] dark:[--graph-label:#a1a1aa] sm:h-[460px]"
              aria-label={`Coordinate graph showing ${validExpressions.length} visible function${validExpressions.length === 1 ? "" : "s"}`}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                dragRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                  view,
                };
              }}
              onPointerMove={updatePointer}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
              onPointerLeave={() => {
                if (!dragRef.current) {
                  setHoverPoint(null);
                }
              }}
            />

            <div className="absolute right-3 top-3 flex gap-1 rounded-lg border border-black/8 bg-white/90 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/90">
              <button
                type="button"
                onClick={() => zoom(0.75)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Zoom in"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => zoom(1.35)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Zoom out"
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setView(defaultWindow)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Reset graph window"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {hoverPoint ? (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-black/8 bg-white/90 px-2 py-1 font-mono text-xs text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-200">
                x {hoverPoint.x.toFixed(2)}, y {hoverPoint.y.toFixed(2)}
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {(
              [
                ["xMin", "x min"],
                ["xMax", "x max"],
                ["yMin", "y min"],
                ["yMax", "y max"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs text-muted-foreground">
                <span className="mb-1 block">{label}</span>
                <input
                  type="number"
                  value={Number(view[key].toFixed(4))}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) {
                      return;
                    }
                    setView((current) => {
                      const next = { ...current, [key]: value };
                      if (
                        next.xMin >= next.xMax ||
                        next.yMin >= next.yMax
                      ) {
                        return current;
                      }
                      return next;
                    });
                  }}
                  className="w-full rounded-lg border border-black/8 bg-background px-2 py-2 font-mono text-xs text-foreground outline-none focus:border-primary-400 dark:border-white/10"
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Drag the graph to pan. Use the controls to zoom or reset the viewing
            window. Curves are calculated in your browser.
          </p>

          {sampleRows.length > 0 ? (
            <details className="mt-3 rounded-lg border border-black/8 px-3 py-2 dark:border-white/10">
              <summary className="cursor-pointer text-xs font-medium text-foreground">
                Sample value table
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-96 border-collapse text-center text-xs">
                  <thead>
                    <tr className="text-muted-foreground">
                      <th className="border-b border-black/8 px-2 py-2 text-left font-medium dark:border-white/10">
                        Function
                      </th>
                      {sampleInputs.map((x) => (
                        <th
                          key={x}
                          className="border-b border-black/8 px-2 py-2 font-medium dark:border-white/10"
                        >
                          x = {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleRows.map((row) => (
                      <tr key={row.id}>
                        <th className="border-b border-black/5 px-2 py-2 text-left font-mono font-medium text-foreground dark:border-white/5">
                          {row.expression}
                        </th>
                        {sampleInputs.map((x) => {
                          const value = row.graph?.evaluate(x);
                          return (
                            <td
                              key={x}
                              className="border-b border-black/5 px-2 py-2 font-mono text-muted-foreground dark:border-white/5"
                            >
                              {value !== undefined && Number.isFinite(value)
                                ? Number(value.toFixed(4))
                                : "undefined"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );
}
