import os from 'os'
import path from 'path'

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
  // Place Next's build output in the system temp directory to avoid OneDrive file locks.
  // Use a project-local alternate dist directory to avoid OneDrive lock on the
  // default `.next` folder while preserving Node's module resolution (so the
  // dev server can require packages from the project's `node_modules`). This
  // keeps build output inside the project root where module resolution works.
  distDir: '.next_temp',

   output: 'export',
   
}


export default nextConfig
