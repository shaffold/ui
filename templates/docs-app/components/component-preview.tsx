import { highlightCode } from "@/lib/highlight-code"
import { readFileFromRoot } from "@/lib/read-file"
import { ComponentPreviewTabs } from "@/components/component-preview-tabs"

// Server component: reads the example's source and highlights it, then hands the
// live demo + highlighted code to the client tabs (Preview | Code).
export async function ComponentPreview({
  name,
  className,
}: {
  name: string
  className?: string
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
    />
  )
}
