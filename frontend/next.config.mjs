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
  distDir: ".next_temp",

  // ✅ This automatically exports static files to /out
  output: "export",
};

export default nextConfig;
