export type FirebaseAuthActionMode =
  | "verifyEmail"
  | "resetPassword"
  | "recoverEmail";

export function isFirebaseAuthActionMode(
  value: string | null,
): value is FirebaseAuthActionMode {
  return (
    value === "verifyEmail" ||
    value === "resetPassword" ||
    value === "recoverEmail"
  );
}

export function getSafeAuthContinueUrl(
  candidate: string | null,
  currentOrigin: string,
): string {
  const fallback = new URL("/", currentOrigin);
  if (!candidate) return fallback.toString();

  try {
    const parsed = new URL(candidate);
    if (
      parsed.origin !== fallback.origin ||
      parsed.pathname === "/auth/action"
    ) {
      return fallback.toString();
    }
    return parsed.toString();
  } catch {
    return fallback.toString();
  }
}
