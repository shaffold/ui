"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { docsNav } from "@/lib/docs-nav"
import { NavLink } from "@/components/nav-link"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/registry/ui/sidebar"

// Base-agnostic: the only per-base difference (render / asChild / href) lives in
// NavLink, which build-style selects for the components.json `base`.
export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="h-14 justify-center px-4">
        <span className="text-sm font-semibold">Design System</span>
      </SidebarHeader>
      <SidebarContent>
        {docsNav.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <NavLink href={item.href} isActive={pathname === item.href}>
                    {item.title}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
