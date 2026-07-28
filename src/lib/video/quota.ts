export const DEFAULT_DAILY_VIDEO_LIMIT = 10;

export type DailyVideoQuota = {
  used: number;
  limit: number;
  periodKey: string;
  resetsAt: number;
};

type VideoQuotaPeriod = {
  key: string;
  resetsAt: number;
};

function positiveInteger(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : null;
}

export function videoQuotaPeriod(now: number): VideoQuotaPeriod {
  const date = new Date(now);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  return {
    key: [
      String(year).padStart(4, "0"),
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-"),
    resetsAt: Date.UTC(year, month, day + 1),
  };
}

export function normalizeDailyVideoQuota(
  value: unknown,
  configuredLimit: number,
  now: number,
): DailyVideoQuota {
  const period = videoQuotaPeriod(now);
  const safeConfiguredLimit =
    positiveInteger(configuredLimit) ?? DEFAULT_DAILY_VIDEO_LIMIT;

  if (!value || typeof value !== "object") {
    return {
      used: 0,
      limit: safeConfiguredLimit,
      periodKey: period.key,
      resetsAt: period.resetsAt,
    };
  }

  const record = value as Record<string, unknown>;
  const storedLimit = positiveInteger(record.limit);
  const limit = Math.max(safeConfiguredLimit, storedLimit ?? 0);
  const used =
    record.periodKey === period.key &&
    typeof record.used === "number" &&
    Number.isInteger(record.used) &&
    record.used >= 0
      ? record.used
      : 0;

  return {
    used,
    limit,
    periodKey: period.key,
    resetsAt: period.resetsAt,
  };
}
