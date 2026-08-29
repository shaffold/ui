import Link from "next/link"

import { ModeSwitcher } from "@/components/mode-switcher"
import { Separator } from "@/registry/ui/separator"
import { SidebarTrigger } from "@/registry/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <Link href="/" className="text-sm font-semibold">
        Design System
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <ModeSwitcher />
      </div>
    </header>
  )
}
