"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type TocItem = { title: React.ReactNode; url: string; depth: number }

// "On This Page" table of contents with scroll-spy, driven by fumadocs'
// page.data.toc. Anchors match the rehype-slug heading ids.
export function DocsToc({ toc }: { toc: TocItem[] }) {
  const [active, setActive] = React.useState<string>("")

  React.useEffect(() => {
    const ids = toc.map((i) => i.url.replace(/^#/, "")).filter(Boolean)
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive("#" + visible[0].target.id)
      },
      { rootMargin: "0% 0% -80% 0%", threshold: 0 }
    )
    for (const id of ids) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [toc])

  if (!toc?.length) return null

  return (
    <nav aria-label="On this page" className="sticky top-20">
      <p className="mb-3 text-sm font-medium">On This Page</p>
      <ul className="m-0 list-none space-y-2 p-0 text-sm">
        {toc.map((item) => (
          <li
            key={item.url}
            style={{ paddingLeft: `${Math.max(0, item.depth - 2) * 12}px` }}
          >
            <a
              href={item.url}
              className={cn(
                "block text-muted-foreground no-underline transition-colors hover:text-foreground",
                active === item.url && "font-medium text-foreground"
              )}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
