import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Badge } from "@/registry/ui/badge"

export function Announcement() {
  return (
    <Badge
      variant="secondary"
      className="bg-muted"
      render={<Link href="/docs/changelog" />}
    >
      React Aria is now available <ArrowRightIcon />
    </Badge>
  )
}
