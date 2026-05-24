import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a self-contained server bundle for Docker.
  // /app/.next/standalone will be the runtime artifact.
  output: "standalone",
  // Silence the workspace-root warning by anchoring turbopack to the app dir.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
