"use client"

import * as React from "react"
import { Check, ChevronDown, Copy, ExternalLink, FileText } from "lucide-react"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Button } from "@/registry/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/ui/dropdown-menu"

// Copy the current page's Markdown, view it raw, or open it in an assistant —
// the docs "Copy Page" control (mirrors the platform docs).
export function DocsCopyPage({ page }: { page: string }) {
  const { copyToClipboard, isCopied } = useCopyToClipboard()

  function viewAsMarkdown() {
    const blob = new Blob([page], { type: "text/markdown" })
    window.open(URL.createObjectURL(blob), "_blank")
  }

  function promptUrl(base: string) {
    const url = typeof window !== "undefined" ? window.location.href : ""
    const q = `I'm reading this documentation page: ${url}. Help me understand and use it — explain concepts, give examples, or help debug.`
    return `${base}?q=${encodeURIComponent(q)}`
  }

  return (
    <div className="flex items-center rounded-lg bg-secondary">
      <Button
        variant="secondary"
        size="sm"
        className="h-8 shadow-none md:h-7"
        onClick={() => copyToClipboard(page)}
      >
        {isCopied ? <Check /> : <Copy />}
        Copy Page
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="secondary"
              size="icon"
              className="size-8 shadow-none md:size-7"
              aria-label="More options"
            >
              <ChevronDown />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="rounded-lg">
          <DropdownMenuItem onClick={viewAsMarkdown}>
            <FileText /> View as Markdown
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a
                href={promptUrl("https://chatgpt.com")}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <ExternalLink /> Open in ChatGPT
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a
                href={promptUrl("https://claude.ai/new")}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <ExternalLink /> Open in Claude
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
