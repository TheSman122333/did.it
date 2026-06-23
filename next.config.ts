import type { NextConfig } from "next";
import path from "path";

// avatars and completion photos are both served from this project's Supabase storage
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/**" }]
      : [],
  },
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
