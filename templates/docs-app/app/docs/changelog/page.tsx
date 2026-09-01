import Link from "next/link"

import { getChangelogPages } from "@/lib/changelog"
import { mdxComponents } from "@/mdx-components"

export const dynamic = "force-static"

const NUMBER_OF_LATEST_PAGES = 5

export function generateMetadata() {
  return {
    title: "Changelog",
    description: "Latest updates and announcements.",
  }
}

export default function ChangelogPage() {
  const pages = getChangelogPages()
  const latestPages = pages.slice(0, NUMBER_OF_LATEST_PAGES)
  const olderPages = pages.slice(NUMBER_OF_LATEST_PAGES)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Changelog</h1>
      <p className="mt-2 text-muted-foreground">
        Latest updates and announcements.
      </p>

      <div className="mt-10">
        {latestPages.map((page) => {
          const MDX = page.data.body
          return (
            <article key={page.url} className="mb-12 border-b pb-12">
              <h2 className="text-xl font-semibold tracking-tight">
                {page.data.title}
              </h2>
              <div className="typeset mt-6 *:first:mt-0">
                <MDX components={mdxComponents} />
              </div>
            </article>
          )
        })}

        {olderPages.length > 0 && (
          <div id="more-updates" className="mb-16 scroll-mt-24">
            <h2 className="mb-6 text-xl font-semibold tracking-tight">
              More Updates
            </h2>
            <div className="grid auto-rows-fr gap-3 sm:grid-cols-2">
              {olderPages.map((page) => {
                const [date, ...titleParts] = page.data.title.split(" - ")
                const title = titleParts.join(" - ")
                return (
                  <Link
                    key={page.url}
                    href={page.url}
                    className="flex w-full flex-col rounded-2xl border px-4 py-3 no-underline transition-colors hover:bg-muted"
                  >
                    <span className="text-xs text-muted-foreground">
                      {title ? date : ""}
                    </span>
                    <span className="text-sm font-medium">{title || date}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {pages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No changelog entries yet. Add one at{" "}
            <code>content/docs/changelog/&lt;date&gt;-&lt;slug&gt;.mdx</code>.
          </p>
        )}
      </div>
    </div>
  )
}
