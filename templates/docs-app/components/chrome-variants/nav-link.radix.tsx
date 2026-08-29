"use client"

import * as React from "react"
import Link from "next/link"

import { SidebarMenuButton } from "@/registry/ui/sidebar"

// Radix composition: `asChild` merges props onto the single child.
export function NavLink({
  href,
  isActive,
  children,
}: {
  href: string
  isActive?: boolean
  children: React.ReactNode
}) {
  return (
    <SidebarMenuButton isActive={isActive} asChild>
      <Link href={href}>{children}</Link>
    </SidebarMenuButton>
  )
}
