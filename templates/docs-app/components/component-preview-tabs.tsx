"use client"

import * as React from "react"

import { examples } from "@/registry/examples/__index__"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy-button"
import { Button } from "@/registry/ui/button"

// Mirrors the platform docs ComponentPreview layout: the live demo on top, then
// the source below — collapsed behind a "View Code" gradient, expandable.
export function ComponentPreviewTabs({
  name,
  code,
  highlightedCode,
  className,
  previewClassName,
  align = "center",
  hideCode = false,
}: {
  name: string
  code: string
  highlightedCode: string
  className?: string
  previewClassName?: string
  align?: "center" | "start" | "end"
  hideCode?: boolean
}) {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)
  const Demo = examples[name]

  const codeBlock = highlightedCode ? (
    <div data-not-typeset dangerouslySetInnerHTML={{ __html: highlightedCode }} />
  ) : (
    <pre className="overflow-x-auto p-4 text-sm">{code}</pre>
  )

  return (
    <div
      data-slot="component-preview"
      data-not-typeset
      className={cn(
        "group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-2xl border",
        className
      )}
    >
      <div
        data-slot="preview"
        data-align={align}
        className={cn(
          "preview relative flex h-72 w-full justify-center p-10 data-[align=center]:items-center data-[align=end]:items-end data-[align=start]:items-start",
          previewClassName
        )}
      >
        <React.Suspense
          fallback={
            <div className="text-sm text-muted-foreground">Loading…</div>
          }
        >
          {Demo ? (
            <Demo />
          ) : (
            <p className="text-sm text-muted-foreground">
              Example &quot;{name}&quot; not found.
            </p>
          )}
        </React.Suspense>
      </div>

      {!hideCode && (
        <div
          data-slot="code"
          className="relative border-t bg-[var(--color-code)] [&_pre]:!m-0 [&_.shiki]:px-4 [&_.shiki]:py-3.5"
        >
          {isCodeVisible ? (
            <div className="relative [&_pre]:max-h-96 [&_pre]:overflow-auto">
              <CopyButton value={code} />
              {codeBlock}
            </div>
          ) : (
            <div className="relative">
              <div className="max-h-32 overflow-hidden">{codeBlock}</div>
              <div className="absolute inset-0 flex items-center justify-center pb-4">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, var(--color-code), color-mix(in oklab, var(--color-code) 60%, transparent), transparent)",
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="relative z-10 rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted"
                  onClick={() => setIsCodeVisible(true)}
                >
                  View Code
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
