export type MobilePlatform = "ios" | "android";
export type MobileUpdateAction = "none" | "encourage" | "required";
export type RequiredUpdateReason = "compatibility" | "security";

export type MobileVersionPolicy = {
  action: MobileUpdateAction;
  currentVersion: string;
  latestVersion: string;
  minimumSupportedVersion: string;
  message: string | null;
  reason: RequiredUpdateReason | null;
  storeUrl: string | null;
};

type PolicyConfig = {
  latestVersion: string;
  minimumSupportedVersion: string;
  requiredReason?: string;
  storeUrl?: string;
  message?: string;
};

const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function isValidMobileVersion(value: string): boolean {
  return VERSION_PATTERN.test(value);
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

function supportedRequiredReason(
  value: string | undefined,
): RequiredUpdateReason | null {
  return value === "compatibility" || value === "security" ? value : null;
}

function validStoreUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function buildMobileVersionPolicy(
  currentVersion: string,
  config: PolicyConfig,
): MobileVersionPolicy {
  if (
    !isValidMobileVersion(currentVersion) ||
    !isValidMobileVersion(config.latestVersion) ||
    !isValidMobileVersion(config.minimumSupportedVersion)
  ) {
    throw new Error("Mobile version policy requires x.y.z versions");
  }

  const storeUrl = validStoreUrl(config.storeUrl);
  const requiredReason = supportedRequiredReason(config.requiredReason);
  const belowMinimum =
    compareVersions(currentVersion, config.minimumSupportedVersion) < 0;
  const belowLatest = compareVersions(currentVersion, config.latestVersion) < 0;

  // A hard gate is deliberately fail-safe: it requires both a usable store
  // destination and an explicit compatibility/security reason. A marketing
  // change (including future ads) is never a valid reason to force an update.
  if (belowMinimum && storeUrl && requiredReason) {
    return {
      action: "required",
      currentVersion,
      latestVersion: config.latestVersion,
      minimumSupportedVersion: config.minimumSupportedVersion,
      message:
        config.message?.trim() ||
        "This version can no longer connect safely. Update MathSolver to continue.",
      reason: requiredReason,
      storeUrl,
    };
  }

  if ((belowLatest || belowMinimum) && storeUrl) {
    return {
      action: "encourage",
      currentVersion,
      latestVersion: config.latestVersion,
      minimumSupportedVersion: config.minimumSupportedVersion,
      message:
        config.message?.trim() ||
        "A newer MathSolver version is available with the latest improvements.",
      reason: null,
      storeUrl,
    };
  }

  return {
    action: "none",
    currentVersion,
    latestVersion: config.latestVersion,
    minimumSupportedVersion: config.minimumSupportedVersion,
    message: null,
    reason: null,
    storeUrl: null,
  };
}

function configuredVersion(value: string | undefined): string {
  return value && isValidMobileVersion(value) ? value : "1.0.0";
}

export function mobileVersionPolicyFromEnvironment(
  platform: MobilePlatform,
  currentVersion: string,
): MobileVersionPolicy {
  const prefix = platform === "ios" ? "MOBILE_IOS" : "MOBILE_ANDROID";
  return buildMobileVersionPolicy(currentVersion, {
    latestVersion: configuredVersion(
      process.env[`${prefix}_LATEST_VERSION`],
    ),
    minimumSupportedVersion: configuredVersion(
      process.env[`${prefix}_MIN_SUPPORTED_VERSION`],
    ),
    requiredReason: process.env[`${prefix}_MIN_VERSION_REASON`],
    storeUrl: process.env[`${prefix}_STORE_URL`],
    message: process.env[`${prefix}_UPDATE_MESSAGE`],
  });
}
