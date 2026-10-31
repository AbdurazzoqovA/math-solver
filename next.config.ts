import type { NextConfig } from "next";
import { englishRouteRewrites, englishRouteRedirects } from "./src/lib/i18n/paths.ts";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  async redirects() { return englishRouteRedirects(); },
  async rewrites() { return { beforeFiles: englishRouteRewrites(), afterFiles: [], fallback: [] }; },
  serverExternalPackages: ["@google-cloud/tasks", "firebase-admin"],
  outputFileTracingIncludes: {
    "/api/video/jobs": [
      "./node_modules/@google-cloud/tasks/build/protos/protos.json",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "developers.google.com",
        pathname:
          "/static/identity/gsi/web/images/standard-button-white.png",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
