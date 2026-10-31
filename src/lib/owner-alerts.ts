import "server-only";

// Shared Telegram transport for owner notifications (billing incidents,
// payments, AI-provider failures). Sending never throws, is bounded by a
// short timeout, and never logs the bot token or chat id. The variables keep
// their BILLING_TELEGRAM_* names from the first deployment; the chat receives
// every owner alert.

export type OwnerAlertFields = Record<
  string,
  string | number | boolean | null | undefined
>;

export type OwnerAlert = {
  // Alerts with the same key share one throttle window.
  key: string;
  title: string;
  fields?: OwnerAlertFields;
  throttleMs?: number;
};

const TIMEOUT_MS = 5_000;
const MAX_FIELD_LENGTH = 300;

type ThrottleEntry = { lastSent: number; suppressed: number };
const alertGlobals = globalThis as typeof globalThis & {
  __mathsolverOwnerAlertThrottle?: Map<string, ThrottleEntry>;
};
function throttle(): Map<string, ThrottleEntry> {
  return (alertGlobals.__mathsolverOwnerAlertThrottle ??= new Map());
}

export function resetOwnerAlertThrottle(): void {
  throttle().clear();
}

export function isOwnerAlertConfigured(): boolean {
  return Boolean(
    process.env.BILLING_TELEGRAM_BOT_TOKEN &&
      process.env.BILLING_TELEGRAM_CHAT_ID,
  );
}

export function formatOwnerAlert(
  title: string,
  fields: OwnerAlertFields = {},
  now: Date = new Date(),
): string {
  const lines = [title];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === "") continue;
    lines.push(`${key}: ${String(value).slice(0, MAX_FIELD_LENGTH)}`);
  }
  lines.push(
    `MathSolver · ${now.toISOString().slice(0, 16).replace("T", " ")} UTC`,
  );
  return lines.join("\n");
}

// Resolves to true only when Telegram accepted the message. Never throws.
export async function sendOwnerAlert(alert: OwnerAlert): Promise<boolean> {
  const token = process.env.BILLING_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.BILLING_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  let note: string | null = null;
  if (alert.throttleMs) {
    const now = Date.now();
    const entry = throttle().get(alert.key);
    if (entry && now - entry.lastSent < alert.throttleMs) {
      entry.suppressed += 1;
      return false;
    }
    if (entry?.suppressed) {
      note = `${entry.suppressed} similar alert(s) suppressed in the last ${Math.round(alert.throttleMs / 60_000)} min`;
    }
    throttle().set(alert.key, { lastSent: now, suppressed: 0 });
  }

  const fields = note ? { ...alert.fields, note } : alert.fields;
  const text = formatOwnerAlert(alert.title, fields);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          link_preview_options: { is_disabled: true },
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    const result = (await response.json().catch(() => null)) as
      | { ok?: unknown }
      | null;
    if (!response.ok || result?.ok !== true) {
      console.error("Owner alert delivery failed:", {
        key: alert.key,
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("Owner alert delivery failed:", {
      key: alert.key,
      name: error instanceof Error ? error.name : typeof error,
    });
    return false;
  }
}
