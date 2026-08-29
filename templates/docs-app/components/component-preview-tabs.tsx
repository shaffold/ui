"use client"

import * as React from "react"

import { examples } from "@/registry/examples/__index__"
import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/registry/ui/tabs"

export function ComponentPreviewTabs({
  name,
  code,
  highlightedCode,
  className,
}: {
  name: string
  code: string
  highlightedCode: string
  className?: string
}) {
  const Demo = examples[name]

  return (
    <div
      data-slot="component-preview"
      className={cn("my-6 overflow-hidden rounded-xl border", className)}
    >
      <Tabs defaultValue="preview" className="gap-0">
        <div className="flex items-center border-b px-4 py-2">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="mt-0">
          <div className="flex min-h-72 w-full items-center justify-center p-10">
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
        </TabsContent>

        <TabsContent value="code" className="mt-0">
          <div className="relative [&>pre]:!m-0 [&>pre]:max-h-96 [&>pre]:rounded-none">
            {highlightedCode ? (
              <>
                <CopyButton value={code} />
                <div
                  data-not-typeset
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                />
              </>
            ) : (
              <pre className="overflow-x-auto p-4 text-sm">{code}</pre>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
