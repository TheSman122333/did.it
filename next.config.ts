import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Without this, Turbopack finds the stray package-lock.json in the user's
  // home directory and treats it as the workspace root, watching (and
  // burning CPU on) the entire home folder instead of just this project.
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    // Default 1MB is too small for camera photos uploaded via Server Actions.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
