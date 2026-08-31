import { promises as fs } from "fs"
import path from "path"
import Link from "next/link"
import { notFound } from "next/navigation"
import { findNeighbour } from "fumadocs-core/page-tree"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { source } from "@/lib/source"
import { DocsCopyPage } from "@/components/docs-copy-page"
import { DocsToc } from "@/components/docs-toc"
import { Button } from "@/registry/ui/button"
import { mdxComponents } from "@/mdx-components"

export function generateStaticParams() {
  return source.generateParams()
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()
  return { title: page.data.title, description: page.data.description }
}

// The page's raw Markdown (frontmatter stripped) for the Copy Page control.
async function readRaw(slug: string[] | undefined, title: string) {
  const rel = slug?.length ? `${slug.join("/")}.mdx` : "index.mdx"
  try {
    const file = await fs.readFile(
      path.join(process.cwd(), "content/docs", rel),
      "utf8"
    )
    const body = file.replace(/^---\n[\s\S]*?\n---\n?/, "").trimStart()
    return `# ${title}\n\n${body}`
  } catch {
    return `# ${title}\n`
  }
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()

  const MDX = page.data.body
  const neighbours = findNeighbour(source.pageTree, page.url)
  const raw = await readRaw(slug, page.data.title)

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10">
      <article className="w-full min-w-0 max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            {page.data.title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block">
              <DocsCopyPage page={raw} url={page.url} />
            </div>
            {neighbours.previous ? (
              <Button
                variant="secondary"
                size="icon"
                className="size-8 shadow-none"
                aria-label="Previous"
                nativeButton={false}
                render={<Link href={neighbours.previous.url} />}
              >
                <ArrowLeft />
              </Button>
            ) : null}
            {neighbours.next ? (
              <Button
                variant="secondary"
                size="icon"
                className="size-8 shadow-none"
                aria-label="Next"
                nativeButton={false}
                render={<Link href={neighbours.next.url} />}
              >
                <ArrowRight />
              </Button>
            ) : null}
          </div>
        </div>
        {page.data.description ? (
          <p className="mt-2 text-muted-foreground">{page.data.description}</p>
        ) : null}
        <div className="typeset mt-6">
          <MDX components={mdxComponents} />
        </div>

        {neighbours.previous || neighbours.next ? (
          <div className="mt-12 flex items-center justify-between border-t pt-6">
            {neighbours.previous ? (
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href={neighbours.previous.url} />}
              >
                <ArrowLeft /> {neighbours.previous.name}
              </Button>
            ) : (
              <span />
            )}
            {neighbours.next ? (
              <Button
                variant="ghost"
                nativeButton={false}
                render={<Link href={neighbours.next.url} />}
              >
                {neighbours.next.name} <ArrowRight />
              </Button>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </article>
      <aside className="hidden w-56 shrink-0 xl:block">
        <DocsToc toc={page.data.toc} />
      </aside>
    </div>
  )
}
