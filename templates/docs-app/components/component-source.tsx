import { highlightCode } from "@/lib/highlight-code"
import { readFileFromRoot } from "@/lib/read-file"
import { CopyButton } from "@/components/copy-button"

// Server component: shows a design-system component's source (from registry/ui),
// highlighted, with a copy button. Used in docs "manual install" sections.
export async function ComponentSource({
  name,
  src,
  title,
}: {
  name?: string
  src?: string
  title?: string
}) {
  const file = src ?? (name ? `registry/ui/${name}.tsx` : "")
  if (!file) return null

  let code = ""
  try {
    code = await readFileFromRoot(file)
  } catch {
    return null
  }
  const html = await highlightCode(code, "tsx")

  return (
    <figure
      data-slot="component-source"
      className="my-6 overflow-hidden rounded-xl border"
    >
      {title ? (
        <figcaption className="border-b px-4 py-2 text-sm text-muted-foreground">
          {title}
        </figcaption>
      ) : null}
      <div className="relative [&>pre]:!m-0 [&>pre]:max-h-96 [&>pre]:rounded-none">
        <CopyButton value={code} />
        <div data-not-typeset dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </figure>
  )
}
