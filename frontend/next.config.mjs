import os from "os";
import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  distDir: ".next",

  // ✅ Required for Render (uses Node server)
  output: "standalone",
};

export default nextConfig;
