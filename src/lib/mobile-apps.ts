export const MOBILE_APP_STORES = {
  ios: {
    platform: "ios",
    name: "App Store",
    url: "https://apps.apple.com/us/app/ai-math-solver-mathsolver/id6799652720",
  },
  android: {
    platform: "android",
    name: "Google Play",
    url: "https://play.google.com/store/apps/details?id=io.mathsolver.app",
  },
} as const;

export type MobileAppPlatform = keyof typeof MOBILE_APP_STORES;
