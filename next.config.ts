import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // This folder is the project root. Without this, a package-lock.json in a
  // parent folder makes Next.js pick that folder as the root, which can load
  // two copies of Next and React and break the build.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
