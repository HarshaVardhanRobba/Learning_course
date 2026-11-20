import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/db", "@workspace/core", "@workspace/auth"],
}

export default nextConfig
