import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Playwright is a local-only, Node-native dep (Facebook adapter). Keep it out
  // of the bundle so it loads from node_modules at runtime.
  serverExternalPackages: ["playwright", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/markets": ["./data/markets.json"],
    "/api/search": ["./data/markets.json"],
    "/zips/[zip]": ["./data/markets.json"],
  },
};

export default nextConfig;
