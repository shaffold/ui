"use client"

import * as React from "react"

import { SidebarMenuButton } from "@/registry/ui/sidebar"

// React Aria composition: the button is polymorphic — passing `href` renders a
// react-aria Link. For Next client-side routing, wrap the app in a react-aria
// RouterProvider (see the aria/RTL docs) so these hrefs use the Next router.
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
    <SidebarMenuButton isActive={isActive} href={href}>
      {children}
    </SidebarMenuButton>
  )
}
