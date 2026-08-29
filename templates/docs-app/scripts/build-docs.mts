/**
 * build-docs — generate the design system's component docs FROM the canonical
 * per-base docs, so they stay in sync and only the CHOSEN base ships.
 *
 * The platform docs cover every base (base/radix/aria). A scaffolded site uses
 * ONE base, so we pull only that base's MDX and rewrite it for this project:
 *   - strip `styleName="…"` (a scaffold has a single base×style),
 *   - replace the shadcn generic `## Installation` block with this DS's own
 *     `shadcn add @<registry>/<name>` command,
 *   - rewrite `/docs/components/<base>/…` links to `/docs/components/…`.
 * Then it regenerates the Components nav from what it produced.
 *
 * Source (like build-style): local canonical dir via DS_DOCS_SRC (monorepo),
 * else fetched per-component from the host registry. Output is committed so the
 * site is self-contained after detaching.
 *
 * Usage: tsx scripts/build-docs.mts
 */
import { promises as fs } from "fs"
import path from "path"

const cwd = process.cwd()

type Config = {
  base?: string
  registries?: Record<string, string>
}

const OUT_DIR = path.join(cwd, "content/docs/components")

// title-case a component filename for nav ("alert-dialog" -> "Alert Dialog").
function titleCase(name: string): string {
  return name.replace(/(^|-)([a-z])/g, (_, sep, c) => (sep ? " " : "") + c.toUpperCase())
}

function stripQuotes(v: string): string {
  return v.trim().replace(/^["']|["']$/g, "")
}

function frontmatter(mdx: string): { data: Record<string, string>; body: string } {
  const m = mdx.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: mdx }
  const data: Record<string, string> = {}
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (kv) data[kv[1]] = stripQuotes(kv[2])
  }
  return { data, body: m[2] }
}

function yamlString(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

// Rewrite one canonical MDX into a scaffold page for this DS.
function transform(mdx: string, base: string, registryKey: string, name: string) {
  const { data, body: rawBody } = frontmatter(mdx)
  let body = rawBody

  // 1. a scaffold has a single base×style — styleName is implicit.
  body = body.replace(/\s+styleName="[^"]*"/g, "")

  // 2. replace the whole `## Installation` section with this DS's install.
  const instIdx = body.indexOf("## Installation")
  if (instIdx !== -1) {
    const next = body.indexOf("\n## ", instIdx + 3)
    const end = next === -1 ? body.length : next + 1
    const install =
      `## Installation\n\n` +
      "```bash\n" +
      `npx shadcn@latest add ${registryKey}/${name}\n` +
      "```\n\n"
    body = body.slice(0, instIdx) + install + body.slice(end)
  }

  // 3. base-scoped internal links -> flat (single base in the scaffold).
  body = body.split(`/docs/components/${base}/`).join("/docs/components/")

  const title = data.title || titleCase(name)
  const description = data.description || ""
  const fm =
    `---\n` +
    `title: ${yamlString(title)}\n` +
    (description ? `description: ${yamlString(description)}\n` : "") +
    `---\n`

  return { out: fm + "\n" + body.trimStart(), title }
}

// Source resolution: local canonical dir (DS_DOCS_SRC or the monorepo), else
// fetch per-component from the host registry's docs path.
async function resolveSource(base: string) {
  const local =
    process.env.DS_DOCS_SRC ||
    path.resolve(cwd, "../../apps/v4/content/docs/components")
  const localBase = path.join(local, base)
  try {
    const files = (await fs.readdir(localBase)).filter((f) => f.endsWith(".mdx"))
    if (files.length)
      return {
        kind: "local" as const,
        list: files.map((f) => f.replace(/\.mdx$/, "")),
        read: (name: string) => fs.readFile(path.join(localBase, `${name}.mdx`), "utf8"),
      }
  } catch {}

  // Remote: component set = the built registry/ui; fetch each page's MDX.
  const config: Config = JSON.parse(await fs.readFile(path.join(cwd, "components.json"), "utf8"))
  const url = Object.values(config.registries ?? {})[0] ?? ""
  const root = url.replace(/\/r\/\{name\}\.json.*$/, "")
  const uiNames = (await fs.readdir(path.join(cwd, "registry/ui")))
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => f.replace(/\.tsx?$/, ""))
  return {
    kind: "remote" as const,
    list: uiNames,
    read: async (name: string) => {
      const res = await fetch(`${root}/docs/${base}/${name}.mdx`)
      if (!res.ok) throw new Error(`fetch ${name}: ${res.status}`)
      return res.text()
    },
  }
}

async function main() {
  const config: Config = JSON.parse(
    await fs.readFile(path.join(cwd, "components.json"), "utf8")
  )
  const base = config.base || "base"
  const registryKey = Object.keys(config.registries ?? {})[0] ?? "@ds"

  const src = await resolveSource(base)
  console.log(`docs: base "${base}", ${src.kind} source, ${src.list.length} pages`)

  await fs.rm(OUT_DIR, { recursive: true, force: true })
  await fs.mkdir(OUT_DIR, { recursive: true })

  const nav: { title: string; name: string }[] = []
  let written = 0
  for (const name of src.list.sort()) {
    let mdx: string
    try {
      mdx = await src.read(name)
    } catch (e) {
      console.warn(`  skip ${name}: ${(e as Error).message}`)
      continue
    }
    const { out, title } = transform(mdx, base, registryKey, name)
    await fs.writeFile(path.join(OUT_DIR, `${name}.mdx`), out)
    nav.push({ title, name })
    written++
  }

  // Regenerate the Components nav group from what we produced.
  await writeNav(nav)

  // The hand-written single-component sample is superseded by generated pages.
  await fs.rm(path.join(cwd, "content/docs/button.mdx"), { force: true })

  console.log(`docs: wrote ${written} pages -> content/docs/components + nav`)
}

async function writeNav(components: { title: string; name: string }[]) {
  const items = components
    .map((c) => `      { title: ${JSON.stringify(c.title)}, href: "/docs/components/${c.name}" },`)
    .join("\n")
  const nav =
    `export type DocsNavGroup = {\n` +
    `  title: string\n` +
    `  items: { title: string; href: string }[]\n` +
    `}\n\n` +
    `// Docs navigation. The Components group is GENERATED by build-docs from the\n` +
    `// canonical per-base docs — edit content, not this list.\n` +
    `export const docsNav: DocsNavGroup[] = [\n` +
    `  {\n` +
    `    title: "Getting Started",\n` +
    `    items: [\n` +
    `      { title: "Introduction", href: "/docs" },\n` +
    `    ],\n` +
    `  },\n` +
    `  {\n` +
    `    title: "Components",\n` +
    `    items: [\n` +
    `${items}\n` +
    `    ],\n` +
    `  },\n` +
    `]\n`
  await fs.writeFile(path.join(cwd, "lib/docs-nav.ts"), nav)
}

main().catch((e) => {
  console.error(e?.message ?? e)
  process.exit(1)
})
