"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useBreadcrumb } from "fumadocs-core/breadcrumb"
import type { Root } from "fumadocs-core/page-tree"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/ui/breadcrumb"

export function DocsBreadcrumb({
  tree,
  className,
}: {
  tree: Root
  className?: string
}) {
  const pathname = usePathname()
  const items = useBreadcrumb(pathname, tree)

  if (items.length === 0) return null

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            render={
              <Link href="/docs" className="hover:text-accent-foreground" />
            }
          >
            Docs
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {items.map((item, i) => (
          <Fragment key={i}>
            {i !== 0 && <BreadcrumbSeparator />}
            {item.url ? (
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <Link
                      href={item.url}
                      className="truncate hover:text-accent-foreground"
                    />
                  }
                >
                  {item.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>{item.name}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
