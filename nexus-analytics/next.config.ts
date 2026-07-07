import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Pre-existing `no-explicit-any` debt across dashboard components;
    // don't block production builds on it. Run `npm run lint` separately.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
