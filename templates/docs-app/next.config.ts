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
  // Serve each doc page's raw Markdown at `<page>.md` (Copy Page → View as
  // Markdown, and for LLMs/tools).
  async rewrites() {
    return [{ source: "/docs/:path*.md", destination: "/api/md/:path*" }]
  },
}

export default withMDX(nextConfig)
