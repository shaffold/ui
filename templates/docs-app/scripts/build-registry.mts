/**
 * build-registry — turn the design system's components into a shadcn-compatible
 * registry so the OFFICIAL shadcn CLI + MCP work against it:
 *   - generate registry.json (manifest) from registry/ui + lib + hooks,
 *     deriving registryDependencies (internal) and dependencies (npm) from the
 *     actual imports in each file,
 *   - run `shadcn build` to emit public/r/<item>.json + public/r/registry.json
 *     (the registry INDEX that MCP requires).
 *
 * Consumers then: components.json registries { "@ds": ".../r/{name}.json" }
 *   -> `npx shadcn add @ds/button`  and  `npx shadcn mcp` both work.
 */
import { spawn } from "child_process"
import { promises as fs } from "fs"
import path from "path"

const cwd = process.cwd()

type Config = {
  registries?: Record<string, string>
  homepage?: string
}

// npm package name from an import specifier (null = internal/peer).
function pkgOf(spec: string): string | null {
  if (spec.startsWith("@/") || spec.startsWith(".")) return null
  if (["react", "react-dom", "next"].some((p) => spec === p || spec.startsWith(`${p}/`)))
    return null
  if (spec.startsWith("@")) return spec.split("/").slice(0, 2).join("/")
  return spec.split("/")[0]
}

const IMPORT_RE = /import\s+(?:type\s+)?[^"']*?from\s+["']([^"']+)["']/g

function analyze(src: string) {
  const registryDeps = new Set<string>()
  const deps = new Set<string>()
  for (const m of src.matchAll(IMPORT_RE)) {
    const spec = m[1]
    if (spec.startsWith("@/registry/ui/")) registryDeps.add(spec.replace("@/registry/ui/", ""))
    else if (spec === "@/lib/utils") registryDeps.add("utils")
    else if (spec.startsWith("@/hooks/")) registryDeps.add(spec.replace("@/hooks/", ""))
    else {
      const pkg = pkgOf(spec)
      if (pkg) deps.add(pkg)
    }
  }
  return { registryDeps: [...registryDeps].sort(), deps: [...deps].sort() }
}

async function itemsFrom(dir: string, type: string, targetPrefix: string) {
  const items: any[] = []
  let files: string[]
  try {
    files = await fs.readdir(path.join(cwd, dir))
  } catch {
    return items
  }
  for (const file of files.sort()) {
    if (!/\.tsx?$/.test(file) || file.startsWith(".")) continue
    const name = file.replace(/\.tsx?$/, "")
    const src = await fs.readFile(path.join(cwd, dir, file), "utf8")
    const { registryDeps, deps } = analyze(src)
    items.push({
      name,
      type,
      ...(registryDeps.length ? { registryDependencies: registryDeps } : {}),
      ...(deps.length ? { dependencies: deps } : {}),
      files: [{ path: `${targetPrefix}/${file}`, type }],
    })
  }
  return items
}

// Provenance for VENDORED (re-hosted) community components — attribution +
// license, kept in a committed sidecar since registry.json is regenerated.
// Shape: { "<item-name>": { author, source, license } }
async function readProvenance(): Promise<Record<string, any>> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(cwd, "registry.provenance.json"), "utf8")
    )
  } catch {
    return {}
  }
}

// Recursively list files (relative) under a dir.
async function collectFiles(dir: string, rootDir = dir): Promise<string[]> {
  let entries: import("fs").Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const out: string[] = []
  for (const e of entries) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await collectFiles(p, rootDir)))
    else if (/\.tsx?$|\.json$/.test(e.name))
      out.push(path.relative(rootDir, p).split(path.sep).join("/"))
  }
  return out
}

// Blocks = one registry:block per subdir of registry/blocks/<name>/.
async function blockItems() {
  const root = path.join(cwd, "registry/blocks")
  let dirs: import("fs").Dirent[]
  try {
    dirs = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return []
  }
  const items: any[] = []
  for (const d of dirs.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!d.isDirectory()) continue
    const files = await collectFiles(path.join(root, d.name))
    const registryDeps = new Set<string>()
    const deps = new Set<string>()
    for (const f of files) {
      if (!/\.tsx?$/.test(f)) continue
      const a = analyze(await fs.readFile(path.join(root, d.name, f), "utf8"))
      a.registryDeps.forEach((x) => registryDeps.add(x))
      a.deps.forEach((x) => deps.add(x))
    }
    items.push({
      name: d.name,
      type: "registry:block",
      ...(registryDeps.size
        ? { registryDependencies: [...registryDeps].sort() }
        : {}),
      ...(deps.size ? { dependencies: [...deps].sort() } : {}),
      files: files.map((f) => {
        const isPage = f.endsWith("page.tsx")
        return {
          path: `registry/blocks/${d.name}/${f}`,
          type: isPage ? "registry:page" : "registry:component",
          // registry:page requires a target (where it lands in the app).
          ...(isPage ? { target: `app/${d.name}/${f}` } : {}),
        }
      }),
    })
  }
  return items
}

async function main() {
  const config: Config = JSON.parse(
    await fs.readFile(path.join(cwd, "components.json"), "utf8")
  )
  const provenance = await readProvenance()
  const registryKey = Object.keys(config.registries ?? {})[0] ?? "@ds"
  const url = config.registries?.[registryKey] ?? ""
  const homepage = config.homepage ?? url.replace(/\/r\/\{name\}\.json.*$/, "")

  const items = [
    ...(await itemsFrom("lib", "registry:lib", "lib")),
    ...(await itemsFrom("hooks", "registry:hook", "hooks")),
    ...(await itemsFrom("registry/ui", "registry:ui", "registry/ui")),
    ...(await blockItems()),
    ...(await itemsFrom("registry/examples", "registry:example", "registry/examples")),
  ]

  // Attach attribution/license to any vendored items.
  let vendored = 0
  for (const item of items) {
    if (provenance[item.name]) {
      item.meta = { ...(item.meta ?? {}), ...provenance[item.name] }
      vendored++
    }
  }

  const registry = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: registryKey.replace(/^@/, ""),
    homepage,
    items,
  }

  await fs.writeFile(
    path.join(cwd, "registry.json"),
    JSON.stringify(registry, null, 2) + "\n"
  )
  console.log(
    `registry.json: ${items.length} items (registry ${registryKey})` +
      (vendored ? `, ${vendored} vendored w/ provenance` : "")
  )

  // Output dir: public/r (static, public) by default. `--private` (or
  // REGISTRY_OUT) builds to a NON-public dir served by app/r/[...name]/route.ts
  // with token auth.
  const outDir =
    process.env.REGISTRY_OUT ||
    (process.argv.includes("--private") ? "private-registry/r" : "public/r")

  // Emit installable JSON + the registry index via the official CLI.
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      "pnpm",
      ["exec", "shadcn", "build", "registry.json", "--output", outDir],
      { cwd, stdio: "inherit", shell: process.platform === "win32" }
    )
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`shadcn build exited ${code}`))
    )
    proc.on("error", reject)
  })
}

main().catch((e) => {
  console.error(e?.message ?? e)
  process.exit(1)
})
