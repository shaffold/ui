import fs from "fs"
import path from "path"

import { source } from "@/lib/source"

export type ChangelogPage = ReturnType<typeof source.getPages>[number] & {
  date: Date | null
}

// Read the `date` from a changelog entry's frontmatter (the default fumadocs
// schema doesn't surface it, so read the file directly).
function getDateFromFile(slugs: string[]): Date | null {
  const filePath = path.join(
    process.cwd(),
    "content/docs",
    ...slugs.slice(0, -1),
    `${slugs[slugs.length - 1]}.mdx`
  )
  try {
    const content = fs.readFileSync(filePath, "utf-8")
    const m = content.match(/^---\n[\s\S]*?\bdate:\s*([^\n]+)\n[\s\S]*?\n---/)
    if (m) {
      const d = new Date(m[1].trim().replace(/^["']|["']$/g, ""))
      if (!Number.isNaN(d.getTime())) return d
    }
  } catch {
    // not found / parse error
  }
  return null
}

// All changelog entries (content/docs/changelog/*.mdx), newest first.
export function getChangelogPages(): ChangelogPage[] {
  return source
    .getPages()
    .filter((page) => page.slugs[0] === "changelog" && page.slugs.length > 1)
    .map((page) => ({ ...page, date: getDateFromFile(page.slugs) }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
}
