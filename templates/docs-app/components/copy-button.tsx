"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/registry/ui/button"

export function CopyButton({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)

  return (
    <Button
      data-slot="copy-button"
      size="icon-sm"
      variant="ghost"
      className={cn(
        "absolute top-3 right-3 z-10 size-7 bg-background/80 hover:bg-background",
        className
      )}
      onClick={() => {
        navigator.clipboard?.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span className="sr-only">Copy</span>
    </Button>
  )
}
