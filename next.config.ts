import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev-mode "N" indicator + dev-tools toast bar so they
  // don't appear in demo recordings. Has no effect on production builds.
  devIndicators: false,
};

export default nextConfig;
