export type AnalyticsParameter = string | number | boolean;

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (
    command: "event",
    eventName: string,
    parameters?: Record<string, AnalyticsParameter>,
  ) => void;
};

export function trackEvent(
  eventName: string,
  parameters: Record<string, AnalyticsParameter> = {},
) {
  if (typeof window === "undefined") return;

  const analyticsWindow = window as AnalyticsWindow;
  if (typeof analyticsWindow.gtag === "function") {
    analyticsWindow.gtag("event", eventName, parameters);
    return;
  }

  analyticsWindow.dataLayer ??= [];
  analyticsWindow.dataLayer.push(["event", eventName, parameters]);
}

export function getDaysAwayBucket(daysAway: number): string {
  if (daysAway <= 1) return "1";
  if (daysAway <= 7) return "2_7";
  if (daysAway <= 30) return "8_30";
  return "31_plus";
}
