/**
 * build-style — populate registry/ui with the design system's components for
 * the base + style declared in components.json. Run by predev / prebuild.
 *
 * NOTHING is bundled: registry/ui is always regenerated as a function of
 * (base, style), so switching base/style — or picking a community style — never
 * leaves a stale combo behind.
 *
 *   rm -rf registry/ui
 *   style == "nova"  -> fetch the prebuilt <base>-nova combo   (download, no build)
 *   else             -> fetch authored <base> source + style-<style>.css,
 *                       then transformStyle locally             (community styles too)
 *
 * Source = the @ds / community registry. Until it is hosted, set
 * DS_REGISTRY_SRC to a checkout laid out like the host:
 *   <root>/registry/bases/<base>/ui/*.tsx      authored source (cn-* intact)
 *   <root>/registry/styles/style-<style>.css   style css (official + community)
 *   <root>/styles/<base>-nova/ui/*.tsx         prebuilt nova combos
 */
import { promises as fs } from "fs"
import path from "path"
import { decodePreset } from "shadcn/preset"
import { createStyleMap, transformStyle } from "shadcn/utils"
import prettier from "prettier"

// Radius scale (mirrors shadcn's RADII); "" = keep the base color's own radius.
const RADII: Record<string, string> = {
  default: "",
  none: "0rem",
  small: "0.45rem",
  medium: "0.625rem",
  large: "0.875rem",
}

const cwd = process.cwd()
const UI_OUT = path.join(cwd, "registry/ui")
const META = path.join(UI_OUT, ".meta.json")

type Config = {
  base?: string
  style?: string
  radius?: string
  preset?: string // optional shadcn preset code (shorthand for the fields below)
  tailwind?: { baseColor?: string }
  aliases?: { ui?: string }
  registries?: Record<string, string>
}

type Resolved = {
  base: string
  style: string
  baseColor: string
  radius: string
  uiAlias: string
}

// Resolve config from components.json, filling gaps from an optional preset
// code (shadcn/preset). `base` is never in a preset code — always explicit.
function resolvePreset(config: Config): Resolved {
  const decoded = config.preset ? decodePreset(config.preset) : null
  return {
    base: config.base ?? "base",
    style: config.style ?? decoded?.style ?? "nova",
    baseColor: config.tailwind?.baseColor ?? decoded?.baseColor ?? "neutral",
    radius: config.radius ?? decoded?.radius ?? "default",
    uiAlias: config.aliases?.ui ?? "@/registry/ui",
  }
}

async function readConfig(): Promise<Config> {
  return JSON.parse(await fs.readFile(path.join(cwd, "components.json"), "utf8"))
}

// ---- Host: where the design-system registry lives --------------------------
type Host = { mode: "local"; root: string } | { mode: "remote"; baseUrl: string }

function resolveHost(config: Config): Host {
  const local = process.env.DS_REGISTRY_SRC
  if (local) return { mode: "local", root: path.resolve(cwd, local) }
  const url = config.registries?.["@ds"]
  if (url) return { mode: "remote", baseUrl: url }
  throw new Error(
    "No design-system registry available. Set DS_REGISTRY_SRC (local mock) or " +
      "components.json registries['@ds'] (hosted)."
  )
}

async function readFile(host: Host, rel: string): Promise<string> {
  if (host.mode === "local") return fs.readFile(path.join(host.root, rel), "utf8")
  // TODO(hosting): the platform serves css + source files; confirm the URL
  // layout and auth (components.json registries headers/${TOKEN}) when live.
  const res = await fetch(new URL(rel, host.baseUrl))
  if (!res.ok) throw new Error(`GET ${rel} -> ${res.status}`)
  return res.text()
}

async function listTsx(host: Host, rel: string): Promise<string[]> {
  if (host.mode === "local") {
    return (await fs.readdir(path.join(host.root, rel))).filter((f) =>
      f.endsWith(".tsx")
    )
  }
  // TODO(hosting): the host must serve a manifest of files under `rel`.
  const res = await fetch(new URL(`${rel}/_manifest.json`, host.baseUrl))
  if (!res.ok) throw new Error(`GET ${rel}/_manifest.json -> ${res.status}`)
  return (await res.json()) as string[]
}

// ---- Import rewriting: registry-source aliases -> this app's aliases --------
function rewriteImports(code: string, from: string, uiAlias: string) {
  return code
    .replaceAll(`${from}/ui/`, `${uiAlias}/`)
    .replaceAll(`${from}/lib/utils`, "@/lib/utils")
    .replaceAll(`${from}/hooks/`, "@/hooks/")
    .replaceAll(`${from}/lib/`, "@/lib/")
}

// ---- Populate strategies ----------------------------------------------------
async function fetchPrebuiltNova(host: Host, base: string, uiAlias: string) {
  const rel = `styles/${base}-nova/ui`
  const files = await listTsx(host, rel)
  for (const file of files) {
    const src = await readFile(host, `${rel}/${file}`)
    const out = rewriteImports(src, `@/styles/${base}-nova`, uiAlias)
    await fs.writeFile(path.join(UI_OUT, file), out)
  }
  return files.length
}

async function buildStyleLocally(
  host: Host,
  base: string,
  style: string,
  uiAlias: string
) {
  const css = await readFile(host, `registry/styles/style-${style}.css`)
  const styleMap = createStyleMap(css)
  const prettierConfig =
    (await prettier.resolveConfig(path.join(cwd, ".prettierrc"))) ?? {}
  const rel = `registry/bases/${base}/ui`
  const files = await listTsx(host, rel)
  for (const file of files) {
    const src = await readFile(host, `${rel}/${file}`)
    let out = await transformStyle(src, { styleMap })
    out = rewriteImports(out, `@/registry/bases/${base}`, uiAlias)
    out = await prettier.format(out, { ...prettierConfig, filepath: file })
    await fs.writeFile(path.join(UI_OUT, file), out)
  }
  return { count: files.length, rules: Object.keys(styleMap).length }
}

// ---- Blocks + examples: consumers of the ui (import-rewrite only) -----------
// Blocks (login/signup/sidebar/dashboard) become registry:block items; examples
// (button-demo…) are the demos the docs MDX showcases. Both import the ui, so we
// only rewrite their imports to the DS aliases — no style transform needed.
const EXCLUDE_BLOCK_DIRS = new Set(["preview", "preview-02", "preview-03"])
const EXCLUDE_FILES = new Set([
  "_registry.ts",
  "__index__.tsx",
  "__components__.tsx",
  "README.md",
])

function rewriteExtras(code: string, base: string, uiAlias: string) {
  return code
    .replaceAll(`@/registry/bases/${base}/ui/`, `${uiAlias}/`)
    .replaceAll(`@/registry/bases/${base}/lib/utils`, "@/lib/utils")
    .replaceAll(`@/registry/bases/${base}/hooks/`, "@/hooks/")
    .replaceAll(`@/registry/bases/${base}/lib/`, "@/lib/")
    .replace(/@\/styles\/[a-z-]+\/ui\//g, `${uiAlias}/`)
}

// Portable = imports only resolve in this template: @/registry/ui/*,
// @/lib/utils, @/hooks/use-mobile, and installed npm packages. (Check AFTER
// rewriting, so @/registry/bases/... and @/styles/... are already normalized.)
function isPortable(src: string, allowedPkgs: Set<string>): boolean {
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
    const spec = m[1]
    if (spec.startsWith(".")) continue
    if (spec.startsWith("@/")) {
      if (
        !spec.startsWith("@/registry/ui/") &&
        spec !== "@/lib/utils" &&
        spec !== "@/hooks/use-mobile"
      )
        return false
    } else {
      const pkg = spec.startsWith("@")
        ? spec.split("/").slice(0, 2).join("/")
        : spec.split("/")[0]
      if (!allowedPkgs.has(pkg)) return false
    }
  }
  return true
}

async function copyTree(
  fromDir: string,
  toDir: string,
  base: string,
  uiAlias: string,
  allowedPkgs: Set<string>,
  opts: { excludeDirs?: Set<string> } = {}
) {
  let entries: import("fs").Dirent[]
  try {
    entries = await fs.readdir(fromDir, { withFileTypes: true })
  } catch {
    return 0
  }
  let count = 0
  for (const entry of entries) {
    const from = path.join(fromDir, entry.name)
    const to = path.join(toDir, entry.name)
    if (entry.isDirectory()) {
      if (opts.excludeDirs?.has(entry.name)) continue
      count += await copyTree(from, to, base, uiAlias, allowedPkgs, opts)
    } else if (/\.tsx?$|\.json$/.test(entry.name) && !EXCLUDE_FILES.has(entry.name)) {
      let src = await fs.readFile(from, "utf8")
      if (entry.name.endsWith(".json")) {
        // data files pass through untouched
      } else {
        src = rewriteExtras(src, base, uiAlias)
        // Skip demos/blocks that import things this template doesn't have.
        if (!isPortable(src, allowedPkgs)) continue
      }
      await fs.mkdir(path.dirname(to), { recursive: true })
      await fs.writeFile(to, src)
      count++
    }
  }
  return count
}

async function copyExtras(host: Host, base: string, uiAlias: string) {
  if (host.mode !== "local") {
    // TODO(hosting): fetch blocks/ + examples/ manifests + files from @ds.
    return { blocks: 0, examples: 0 }
  }
  const root = host.root
  const pkg = JSON.parse(
    await fs.readFile(path.join(cwd, "package.json"), "utf8")
  )
  const allowedPkgs = new Set<string>([
    ...Object.keys(pkg.dependencies ?? {}),
    "react",
    "react-dom",
  ])
  const blocks = await copyTree(
    path.join(root, `registry/bases/${base}/blocks`),
    path.join(cwd, "registry/blocks"),
    base,
    uiAlias,
    allowedPkgs,
    { excludeDirs: EXCLUDE_BLOCK_DIRS }
  )
  const examples = await copyTree(
    path.join(root, `examples/${base}`),
    path.join(cwd, "registry/examples"),
    base,
    uiAlias,
    allowedPkgs
  )
  return { blocks, examples }
}

// Generate an index mapping example name -> lazy component, so ComponentPreview
// can render <ComponentPreview name="button-demo" /> in the docs MDX.
async function writeExamplesIndex() {
  const dir = path.join(cwd, "registry/examples")
  await fs.mkdir(dir, { recursive: true })
  const files = (await fs.readdir(dir).catch(() => []))
    .filter((f) => f.endsWith(".tsx") && !f.startsWith("__"))
    .sort()
  const entries = files
    .map((f) => {
      const name = f.replace(/\.tsx$/, "")
      return (
        `  ${JSON.stringify(name)}: React.lazy(async () => {\n` +
        `    const m = await import("@/registry/examples/${name}")\n` +
        `    return { default: m.default ?? Object.values(m).find((v) => typeof v === "function") }\n` +
        `  }),`
      )
    })
    .join("\n")
  const content =
    `// @ts-nocheck\n// Generated by build-style — maps example name -> lazy component.\n` +
    `import * as React from "react"\n\n` +
    `export const examples: Record<string, React.LazyExoticComponent<React.ComponentType>> = {\n${entries}\n}\n`
  await fs.writeFile(path.join(dir, "__index__.tsx"), content)
  return files.length
}

// ---- Per-base chrome: pick the NavLink variant matching the base ------------
// The chrome is base-agnostic except the composition idiom (render / asChild /
// href), isolated in NavLink. Select the variant for components.json `base`.
async function selectChrome(base: string) {
  const from = path.join(cwd, `components/chrome-variants/nav-link.${base}.tsx`)
  const to = path.join(cwd, "components/nav-link.tsx")
  try {
    await fs.copyFile(from, to)
  } catch {
    throw new Error(
      `No chrome variant for base "${base}" ` +
        `(expected components/chrome-variants/nav-link.${base}.tsx).`
    )
  }
}

// ---- theme.css: color tokens for the base color (+ radius), from the host ----
async function readJson(host: Host, rel: string) {
  return JSON.parse(await readFile(host, rel))
}

function emitVars(vars: Record<string, string>) {
  return Object.entries(vars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n")
}

async function generateTheme(host: Host, baseColor: string, radius: string) {
  const color = await readJson(host, `public/r/colors/${baseColor}.json`)
  const light: Record<string, string> = { ...color.cssVars.light }
  const dark: Record<string, string> = { ...color.cssVars.dark }
  const radiusValue = RADII[radius]
  if (radiusValue) light.radius = radiusValue
  const css =
    `/* Generated by build-style for baseColor "${baseColor}" (radius: ${radius}).\n` +
    `   Do not edit — set base color / radius via components.json or a preset code. */\n\n` +
    `:root {\n${emitVars(light)}\n}\n\n.dark {\n${emitVars(dark)}\n}\n`
  await fs.writeFile(path.join(cwd, "app/styles/theme.css"), css)
}

// ---- Idempotency: skip only when everything already matches --------------
async function isUpToDate(r: Resolved) {
  try {
    const meta = JSON.parse(await fs.readFile(META, "utf8"))
    const hasUi = (await fs.readdir(UI_OUT)).some((f) => f.endsWith(".tsx"))
    const hasBlocks = (
      await fs.readdir(path.join(cwd, "registry/blocks")).catch(() => [])
    ).length > 0
    return (
      hasUi &&
      hasBlocks &&
      meta.base === r.base &&
      meta.style === r.style &&
      meta.baseColor === r.baseColor &&
      meta.radius === r.radius
    )
  } catch {
    return false
  }
}

async function main() {
  const config = await readConfig()
  const r = resolvePreset(config)
  const { base, style, baseColor, radius, uiAlias } = r

  // Always ensure the chrome matches the base + the examples index exists
  // (both read committed files — no host needed).
  await selectChrome(base)
  await writeExamplesIndex()

  if (await isUpToDate(r)) {
    console.log(`up to date: ${base}-${style} · ${baseColor}/${radius}.`)
    return
  }

  const host = resolveHost(config)

  // Color theme (base color + radius) -> app/styles/theme.css.
  await generateTheme(host, baseColor, radius)

  // Components for the base + style -> registry/ui.
  await fs.rm(UI_OUT, { recursive: true, force: true })
  await fs.mkdir(UI_OUT, { recursive: true })

  let summary: string
  if (style === "nova") {
    const n = await fetchPrebuiltNova(host, base, uiAlias)
    summary = `fetched prebuilt ${base}-nova (${n} components)`
  } else {
    const { count, rules } = await buildStyleLocally(host, base, style, uiAlias)
    summary = `built ${base}-${style} (${count} components, ${rules} style rules)`
  }

  // Blocks + examples (base-scoped consumers of the ui).
  await fs.rm(path.join(cwd, "registry/blocks"), { recursive: true, force: true })
  await fs.rm(path.join(cwd, "registry/examples"), { recursive: true, force: true })
  const extras = await copyExtras(host, base, uiAlias)
  await writeExamplesIndex()

  await fs.writeFile(META, JSON.stringify({ base, style, baseColor, radius }, null, 2))
  console.log(
    `${summary} · theme=${baseColor}/${radius} · ` +
      `${extras.blocks} block files, ${extras.examples} examples [${host.mode}]`
  )
}

main().catch((err) => {
  console.error(err?.message ?? err)
  process.exit(1)
})
