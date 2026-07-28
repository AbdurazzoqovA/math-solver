import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
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
};

export default nextConfig;
