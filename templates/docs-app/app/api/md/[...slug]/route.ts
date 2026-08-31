import { promises as fs } from "fs"
import path from "path"
import { NextResponse } from "next/server"

// Serves a doc page's raw Markdown (frontmatter stripped) at `/docs/<slug>.md`
// via the rewrite in next.config. Used by Copy Page → View as Markdown.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await ctx.params
  const rel = slug.join("/")

  const base = path.resolve(process.cwd(), "content/docs")
  const file = path.resolve(base, `${rel}.mdx`)
  if (!file.startsWith(base + path.sep)) {
    return new NextResponse("Not found", { status: 404 })
  }

  try {
    const src = await fs.readFile(file, "utf8")
    const titleMatch = src.match(/^---[\s\S]*?\btitle:\s*"?([^"\n]+)"?[\s\S]*?---/)
    const title = titleMatch?.[1]?.trim()
    const body = src.replace(/^---\n[\s\S]*?\n---\n?/, "").trimStart()
    const md = title ? `# ${title}\n\n${body}` : body
    return new NextResponse(md, {
      headers: { "content-type": "text/markdown; charset=utf-8" },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
