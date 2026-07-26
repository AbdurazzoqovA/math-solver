export type NumericGraphFunction = {
  id: number;
  label: string;
  color: string;
  evaluate: (x: number) => number;
};

export type GraphAnalysisWindow = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type GraphPoint = {
  x: number;
  y: number;
};

export type GraphExtremum = GraphPoint & {
  kind: "minimum" | "maximum";
};

export type FunctionGraphAnalysis = {
  id: number;
  label: string;
  color: string;
  roots: GraphPoint[];
  rootsEverywhere: boolean;
  extrema: GraphExtremum[];
};

export type GraphIntersection = GraphPoint & {
  firstId: number;
  secondId: number;
  firstLabel: string;
  secondLabel: string;
};

export type OverlappingGraphs = {
  firstId: number;
  secondId: number;
  firstLabel: string;
  secondLabel: string;
};

export type GraphAnalysis = {
  functions: FunctionGraphAnalysis[];
  intersections: GraphIntersection[];
  overlapping: OverlappingGraphs[];
};

export type PointAnalysis = {
  id: number;
  label: string;
  color: string;
  x: number;
  y: number | null;
  slope: number | null;
  slopeStatus: "available" | "undefined" | "outside-domain";
};

type Sample = {
  x: number;
  y: number | null;
};

const MAX_FEATURES_PER_FUNCTION = 24;
const MAX_INTERSECTIONS = 36;

function safeEvaluate(evaluate: (x: number) => number, x: number) {
  try {
    const value = evaluate(x);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function createSamples(
  evaluate: (x: number) => number,
  xMin: number,
  xMax: number,
) {
  const range = xMax - xMin;
  const count = Math.min(1200, Math.max(640, Math.round(range * 48)));
  return Array.from({ length: count + 1 }, (_, index): Sample => {
    const x = xMin + (index / count) * range;
    return { x, y: safeEvaluate(evaluate, x) };
  });
}

function dedupePoints(points: GraphPoint[], xTolerance: number, limit: number) {
  const sorted = [...points].sort((first, second) => first.x - second.x);
  const deduped: GraphPoint[] = [];

  for (const point of sorted) {
    const previous = deduped.at(-1);
    if (previous && Math.abs(point.x - previous.x) <= xTolerance) {
      if (Math.abs(point.y) < Math.abs(previous.y)) {
        deduped[deduped.length - 1] = point;
      }
      continue;
    }
    deduped.push(point);
    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

function refineBracketedZero(
  evaluate: (x: number) => number,
  left: Sample,
  right: Sample,
  yTolerance: number,
) {
  if (left.y === null || right.y === null) {
    return null;
  }

  let lowX = left.x;
  let highX = right.x;
  let lowY = left.y;
  let highY = right.y;
  let best = Math.abs(lowY) <= Math.abs(highY) ? left : right;

  for (let iteration = 0; iteration < 60; iteration += 1) {
    const middleX = (lowX + highX) / 2;
    const middleY = safeEvaluate(evaluate, middleX);
    if (middleY === null) {
      return null;
    }
    if (Math.abs(middleY) < Math.abs(best.y ?? Number.POSITIVE_INFINITY)) {
      best = { x: middleX, y: middleY };
    }
    if (Math.abs(middleY) <= yTolerance) {
      return { x: middleX, y: middleY };
    }

    if (Math.sign(lowY) === Math.sign(middleY)) {
      lowX = middleX;
      lowY = middleY;
    } else {
      highX = middleX;
      highY = middleY;
    }
  }

  const bestY = best.y;
  if (bestY === null || Math.abs(bestY) > yTolerance * 8) {
    return null;
  }
  return { x: best.x, y: bestY };
}

function refineNearZero(
  evaluate: (x: number) => number,
  leftX: number,
  rightX: number,
  yTolerance: number,
) {
  let low = leftX;
  let high = rightX;

  for (let iteration = 0; iteration < 52; iteration += 1) {
    const firstX = low + (high - low) / 3;
    const secondX = high - (high - low) / 3;
    const firstY = safeEvaluate(evaluate, firstX);
    const secondY = safeEvaluate(evaluate, secondX);
    if (firstY === null || secondY === null) {
      return null;
    }
    if (Math.abs(firstY) <= Math.abs(secondY)) {
      high = secondX;
    } else {
      low = firstX;
    }
  }

  const x = (low + high) / 2;
  const y = safeEvaluate(evaluate, x);
  if (y === null || Math.abs(y) > yTolerance * 8) {
    return null;
  }
  return { x, y };
}

function findZeros(
  evaluate: (x: number) => number,
  window: GraphAnalysisWindow,
) {
  const samples = createSamples(evaluate, window.xMin, window.xMax);
  const xRange = window.xMax - window.xMin;
  const yRange = window.yMax - window.yMin;
  const step = xRange / Math.max(1, samples.length - 1);
  const yTolerance = Math.max(1e-8, Math.min(0.01, yRange / 20_000));
  const finiteSamples = samples.filter(
    (sample): sample is { x: number; y: number } => sample.y !== null,
  );
  const rootsEverywhere =
    finiteSamples.length > samples.length * 0.8 &&
    finiteSamples.every((sample) => Math.abs(sample.y) <= yTolerance);

  if (rootsEverywhere) {
    return { points: [] as GraphPoint[], rootsEverywhere: true };
  }

  const candidates: GraphPoint[] = [];
  for (let index = 0; index < samples.length; index += 1) {
    const current = samples[index];
    if (current.y === null) {
      continue;
    }
    const previous = samples[index - 1];
    const next = samples[index + 1];

    if (
      previous?.y !== null &&
      previous?.y !== undefined &&
      Math.sign(previous.y) !== Math.sign(current.y)
    ) {
      const refined = refineBracketedZero(
        evaluate,
        previous,
        current,
        yTolerance,
      );
      if (refined) {
        candidates.push(refined);
      }
    }

    if (
      previous?.y !== null &&
      previous?.y !== undefined &&
      next?.y !== null &&
      next?.y !== undefined &&
      Math.abs(current.y) <= Math.abs(previous.y) &&
      Math.abs(current.y) <= Math.abs(next.y)
    ) {
      const refined = refineNearZero(
        evaluate,
        previous.x,
        next.x,
        yTolerance,
      );
      if (refined) {
        candidates.push(refined);
      }
    }

    if (
      Math.abs(current.y) <= yTolerance &&
      (!previous || !next)
    ) {
      candidates.push({ x: current.x, y: current.y });
    }
  }

  return {
    points: dedupePoints(
      candidates,
      Math.max(1e-7, step * 1.6),
      MAX_FEATURES_PER_FUNCTION,
    ).map((point) => ({ x: point.x, y: 0 })),
    rootsEverywhere: false,
  };
}

function refineExtremum(
  evaluate: (x: number) => number,
  leftX: number,
  rightX: number,
  kind: GraphExtremum["kind"],
) {
  let low = leftX;
  let high = rightX;

  for (let iteration = 0; iteration < 52; iteration += 1) {
    const firstX = low + (high - low) / 3;
    const secondX = high - (high - low) / 3;
    const firstY = safeEvaluate(evaluate, firstX);
    const secondY = safeEvaluate(evaluate, secondX);
    if (firstY === null || secondY === null) {
      return null;
    }

    const keepLeft =
      kind === "minimum" ? firstY <= secondY : firstY >= secondY;
    if (keepLeft) {
      high = secondX;
    } else {
      low = firstX;
    }
  }

  const x = (low + high) / 2;
  const y = safeEvaluate(evaluate, x);
  return y === null ? null : { x, y, kind };
}

function findExtrema(
  evaluate: (x: number) => number,
  window: GraphAnalysisWindow,
) {
  const samples = createSamples(evaluate, window.xMin, window.xMax);
  const xRange = window.xMax - window.xMin;
  const yRange = window.yMax - window.yMin;
  const step = xRange / Math.max(1, samples.length - 1);
  const yTolerance = Math.max(1e-8, yRange / 1_000_000);
  const candidates: GraphExtremum[] = [];

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    if (previous.y === null || current.y === null || next.y === null) {
      continue;
    }

    const isMinimum =
      current.y < previous.y - yTolerance &&
      current.y <= next.y + yTolerance;
    const isMaximum =
      current.y > previous.y + yTolerance &&
      current.y >= next.y - yTolerance;
    if (!isMinimum && !isMaximum) {
      continue;
    }

    const kind = isMinimum ? "minimum" : "maximum";
    const refined = refineExtremum(
      evaluate,
      previous.x,
      next.x,
      kind,
    );
    if (!refined) {
      continue;
    }

    const padding = yRange * 0.03;
    if (
      refined.y < window.yMin - padding ||
      refined.y > window.yMax + padding
    ) {
      continue;
    }

    const neighborhood = Math.max(1e-6, xRange / 100_000);
    const leftY = safeEvaluate(evaluate, refined.x - neighborhood);
    const rightY = safeEvaluate(evaluate, refined.x + neighborhood);
    if (leftY === null || rightY === null) {
      continue;
    }
    const isConfirmed =
      kind === "minimum"
        ? refined.y <= leftY + yTolerance &&
          refined.y <= rightY + yTolerance
        : refined.y >= leftY - yTolerance &&
          refined.y >= rightY - yTolerance;
    if (isConfirmed) {
      candidates.push(refined);
    }
  }

  const sorted = [...candidates].sort((first, second) => first.x - second.x);
  const deduped: GraphExtremum[] = [];
  for (const point of sorted) {
    const previous = deduped.at(-1);
    if (
      previous &&
      previous.kind === point.kind &&
      Math.abs(previous.x - point.x) <= step * 1.6
    ) {
      continue;
    }
    deduped.push(point);
    if (deduped.length >= MAX_FEATURES_PER_FUNCTION) {
      break;
    }
  }
  return deduped;
}

export function analyzeGraphFunctions(
  functions: NumericGraphFunction[],
  window: GraphAnalysisWindow,
): GraphAnalysis {
  const functionAnalyses = functions.map((graphFunction) => {
    const zeroScan = findZeros(graphFunction.evaluate, window);
    return {
      id: graphFunction.id,
      label: graphFunction.label,
      color: graphFunction.color,
      roots: zeroScan.points,
      rootsEverywhere: zeroScan.rootsEverywhere,
      extrema: findExtrema(graphFunction.evaluate, window),
    };
  });
  const intersections: GraphIntersection[] = [];
  const overlapping: OverlappingGraphs[] = [];

  for (let firstIndex = 0; firstIndex < functions.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < functions.length;
      secondIndex += 1
    ) {
      const first = functions[firstIndex];
      const second = functions[secondIndex];
      const difference = (x: number) =>
        first.evaluate(x) - second.evaluate(x);
      const zeroScan = findZeros(difference, window);
      if (zeroScan.rootsEverywhere) {
        overlapping.push({
          firstId: first.id,
          secondId: second.id,
          firstLabel: first.label,
          secondLabel: second.label,
        });
        continue;
      }

      for (const root of zeroScan.points) {
        const firstY = safeEvaluate(first.evaluate, root.x);
        const secondY = safeEvaluate(second.evaluate, root.x);
        if (firstY === null || secondY === null) {
          continue;
        }
        const y = (firstY + secondY) / 2;
        if (y < window.yMin || y > window.yMax) {
          continue;
        }
        intersections.push({
          x: root.x,
          y,
          firstId: first.id,
          secondId: second.id,
          firstLabel: first.label,
          secondLabel: second.label,
        });
        if (intersections.length >= MAX_INTERSECTIONS) {
          break;
        }
      }
    }
  }

  return {
    functions: functionAnalyses,
    intersections,
    overlapping,
  };
}

export function analyzeFunctionsAtX(
  functions: NumericGraphFunction[],
  x: number,
  xRange: number,
): PointAnalysis[] {
  const step = Math.max(1e-6, Math.abs(xRange) * 1e-5);

  return functions.map((graphFunction) => {
    const y = safeEvaluate(graphFunction.evaluate, x);
    if (y === null) {
      return {
        id: graphFunction.id,
        label: graphFunction.label,
        color: graphFunction.color,
        x,
        y: null,
        slope: null,
        slopeStatus: "outside-domain" as const,
      };
    }

    const leftY = safeEvaluate(graphFunction.evaluate, x - step);
    const rightY = safeEvaluate(graphFunction.evaluate, x + step);
    if (leftY === null || rightY === null) {
      return {
        id: graphFunction.id,
        label: graphFunction.label,
        color: graphFunction.color,
        x,
        y,
        slope: null,
        slopeStatus: "undefined" as const,
      };
    }

    const leftSlope = (y - leftY) / step;
    const rightSlope = (rightY - y) / step;
    const scale = Math.max(1, Math.abs(leftSlope), Math.abs(rightSlope));
    if (
      !Number.isFinite(leftSlope) ||
      !Number.isFinite(rightSlope) ||
      Math.abs(leftSlope - rightSlope) > Math.max(0.01, scale * 0.02)
    ) {
      return {
        id: graphFunction.id,
        label: graphFunction.label,
        color: graphFunction.color,
        x,
        y,
        slope: null,
        slopeStatus: "undefined" as const,
      };
    }

    return {
      id: graphFunction.id,
      label: graphFunction.label,
      color: graphFunction.color,
      x,
      y,
      slope: (leftSlope + rightSlope) / 2,
      slopeStatus: "available" as const,
    };
  });
}
