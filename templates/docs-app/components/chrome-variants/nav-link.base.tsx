"use client"

import * as React from "react"
import Link from "next/link"

import { SidebarMenuButton } from "@/registry/ui/sidebar"

// Base UI composition: pass the target element via the `render` prop.
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
    <SidebarMenuButton isActive={isActive} render={<Link href={href} />}>
      {children}
    </SidebarMenuButton>
  )
}
