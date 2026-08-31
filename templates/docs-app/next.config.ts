import { createMDX } from "fumadocs-mdx/next"
import type { NextConfig } from "next"

const withMDX = createMDX()

const nextConfig: NextConfig = {
  // Hosts used by component demo images (avatars, sample photos).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "avatar.vercel.sh" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "github.com" },
    ],
  },
}

export default withMDX(nextConfig)
