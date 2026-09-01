import { highlightCode } from "@/lib/highlight-code"
import { readFileFromRoot } from "@/lib/read-file"
import { ComponentPreviewTabs } from "@/components/component-preview-tabs"

// Server component: reads the example's source and highlights it, then hands the
// live demo + highlighted code to the client preview (preview + View Code).
export async function ComponentPreview({
  name,
  className,
  previewClassName,
  align = "center",
  hideCode = false,
}: {
  name: string
  className?: string
  previewClassName?: string
  align?: "center" | "start" | "end"
  hideCode?: boolean
  // Canonical MDX may also pass styleName/direction — ignored in the scaffold.
  styleName?: string
  direction?: "ltr" | "rtl"
}) {
  let code = ""
  try {
    code = await readFileFromRoot(`registry/examples/${name}.tsx`)
  } catch {
    // no source available — preview still renders
  }
  const highlightedCode = code ? await highlightCode(code, "tsx") : ""

  return (
    <ComponentPreviewTabs
      name={name}
      code={code}
      highlightedCode={highlightedCode}
      className={className}
      previewClassName={previewClassName}
      align={align}
      hideCode={hideCode}
    />
  )
}
