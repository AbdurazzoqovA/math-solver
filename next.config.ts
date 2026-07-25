import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
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
