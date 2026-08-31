import { notFound } from "next/navigation"

import { source } from "@/lib/source"
import { DocsToc } from "@/components/docs-toc"
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

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>
}) {
  const { slug } = await props.params
  const page = source.getPage(slug)
  if (!page) notFound()

  const MDX = page.data.body

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-10">
      <article className="w-full min-w-0 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          {page.data.title}
        </h1>
        {page.data.description ? (
          <p className="mt-2 text-muted-foreground">{page.data.description}</p>
        ) : null}
        <div className="typeset mt-6">
          <MDX components={mdxComponents} />
        </div>
      </article>
      <aside className="hidden w-56 shrink-0 xl:block">
        <DocsToc toc={page.data.toc} />
      </aside>
    </div>
  )
}
