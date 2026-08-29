/**
 * build-package — turn the built design system into a PUBLISHABLE npm library
 * (the "locked / runtime-dependency" distribution model), as an alternative to
 * the shadcn copy-in registry.
 *
 * One source of truth: registry/ui (+ lib/utils, hooks). Everything here is
 * DERIVED, so a style swap re-derives the package instead of drifting a copy.
 *
 * Pipeline:
 *   1. copy registry/ui + the internal lib/hooks it uses into packages/ui/src,
 *      rewriting app aliases (@/registry/ui, @/lib, @/hooks) to package-relative.
 *   2. derive package.json (exports map + peer/deps from real imports, versions
 *      pinned from THIS app's package.json) + tsconfig + barrel + README.
 *   3. compile with tsc -> dist (JS + .d.ts), preserving per-file "use client".
 *   4. CSS strategy (author's choice, --css):
 *        precompiled  -> run Tailwind over the components => dist/styles.css
 *                        (self-contained; consumer needs NO Tailwind). DEFAULT.
 *        source       -> ship styles.css with @source + @theme inline; the
 *                        CONSUMER's Tailwind scans the package (lighter).
 *
 * Usage:
 *   tsx scripts/build-package.mts [--css precompiled|source]
 *                                 [--name @scope/ui] [--out packages/ui]
 */
import { spawn } from "child_process"
import { promises as fs } from "fs"
import path from "path"

const cwd = process.cwd()
const argv = process.argv.slice(2)

function flag(name: string, dflt: string): string {
  const eq = argv.find((a) => a.startsWith(`--${name}=`))
  if (eq) return eq.slice(name.length + 3)
  const i = argv.indexOf(`--${name}`)
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1]
  return dflt
}

const CSS = flag("css", "precompiled") as "precompiled" | "source"
const OUT = flag("out", "packages/ui")
const outAbs = path.join(cwd, OUT)

if (CSS !== "precompiled" && CSS !== "source") {
  console.error(`--css must be "precompiled" or "source" (got "${CSS}")`)
  process.exit(1)
}

// --- import scanning (npm packages -> peer/deps) -----------------------------

const IMPORT_RE = /import\s+(?:type\s+)?[^"']*?from\s+["']([^"']+)["']/g

// Exported identifier names from a module (for the flat barrel). Handles
// `export { a, b as c, type d }`, and `export function|const|class|type|… NAME`.
function extractExports(src: string): string[] {
  const names = new Set<string>()
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (let part of m[1].split(",")) {
      part = part.trim()
      if (!part) continue
      part = part.replace(/^type\s+/, "")
      const asMatch = part.match(/\bas\s+([A-Za-z0-9_$]+)/)
      names.add(asMatch ? asMatch[1] : part.split(/\s+/)[0])
    }
  }
  for (const m of src.matchAll(
    /export\s+(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g
  ))
    names.add(m[1])
  return [...names].filter(Boolean)
}

function pkgOf(spec: string): string | null {
  if (spec.startsWith("@/") || spec.startsWith(".")) return null
  if (["react", "react-dom", "react/jsx-runtime"].some((p) => spec === p || spec.startsWith(`${p}/`)))
    return "react" // handled explicitly as a peer
  if (spec.startsWith("@")) return spec.split("/").slice(0, 2).join("/")
  return spec.split("/")[0]
}

// Rewrite app aliases to package-relative. Components land at src/<name>, so
// @/registry/ui/x -> ./x, @/lib/x -> ./lib/x, @/hooks/x -> ./hooks/x.
function rewrite(src: string): string {
  return src
    .replace(/@\/registry\/ui\//g, "./")
    .replace(/@\/lib\//g, "./lib/")
    .replace(/@\/hooks\//g, "./hooks/")
}

async function rm(p: string) {
  await fs.rm(p, { recursive: true, force: true })
}

async function readJSON(p: string): Promise<any> {
  return JSON.parse(await fs.readFile(p, "utf8"))
}

// Utility libs are safe to BUNDLE as normal deps (no React context / singleton
// concern). Everything else discovered becomes a peerDependency so the consumer
// provides ONE copy (critical for React-context libs like @base-ui/react).
const BUNDLE_AS_DEP = new Set([
  "class-variance-authority",
  "clsx",
  "tailwind-merge",
])

async function main() {
  const appPkg = await readJSON(path.join(cwd, "package.json"))
  const appVersions: Record<string, string> = {
    ...(appPkg.dependencies ?? {}),
    ...(appPkg.devDependencies ?? {}),
  }

  // Library identity: components.json `library` block, else defaults.
  let lib: { name?: string; version?: string; description?: string } = {}
  try {
    lib = (await readJSON(path.join(cwd, "components.json"))).library ?? {}
  } catch {}
  const NAME = flag("name", lib.name ?? "@your-ds/ui")
  const VERSION = lib.version ?? "0.1.0"

  // 1. collect source files: registry/ui/* + the internal lib/hooks they use.
  await rm(path.join(outAbs, "src"))
  await rm(path.join(outAbs, "dist"))
  await fs.mkdir(path.join(outAbs, "src"), { recursive: true })

  const components: string[] = []
  const externals = new Set<string>()
  const internalLib = new Set<string>() // e.g. "utils"
  const internalHooks = new Set<string>() // e.g. "use-mobile"

  const uiFiles = (await fs.readdir(path.join(cwd, "registry/ui")))
    .filter((f) => /\.tsx?$/.test(f) && !f.startsWith("."))
    .sort()

  for (const file of uiFiles) {
    const raw = await fs.readFile(path.join(cwd, "registry/ui", file), "utf8")
    for (const m of raw.matchAll(IMPORT_RE)) {
      const spec = m[1]
      if (spec.startsWith("@/lib/")) internalLib.add(spec.replace("@/lib/", ""))
      else if (spec.startsWith("@/hooks/")) internalHooks.add(spec.replace("@/hooks/", ""))
      else {
        const p = pkgOf(spec)
        if (p) externals.add(p)
      }
    }
    await fs.writeFile(path.join(outAbs, "src", file), rewrite(raw))
    components.push(file.replace(/\.tsx?$/, ""))
  }

  // Copy the internal lib/hooks the components actually import (+ scan them too).
  async function copyInternal(kind: "lib" | "hooks", names: Set<string>) {
    if (!names.size) return
    await fs.mkdir(path.join(outAbs, "src", kind), { recursive: true })
    for (const name of names) {
      // resolve .ts or .tsx
      let file = `${name}.ts`
      try {
        await fs.access(path.join(cwd, kind, file))
      } catch {
        file = `${name}.tsx`
      }
      const raw = await fs.readFile(path.join(cwd, kind, file), "utf8")
      for (const m of raw.matchAll(IMPORT_RE)) {
        const p = pkgOf(m[1])
        if (p) externals.add(p)
      }
      await fs.writeFile(path.join(outAbs, "src", kind, file), rewrite(raw))
    }
  }
  await copyInternal("lib", internalLib)
  await copyInternal("hooks", internalHooks)

  // 2a. barrel — collision-aware. Two components can export the same name
  // (e.g. sonner + toast both export `Toaster`); a flat `export *` would be
  // ambiguous. First component wins the flat name; the loser stays reachable
  // via its own subpath (e.g. `@your-ds/ui/toast`).
  const owner = new Map<string, string>()
  const collisions: string[] = []
  const barrelLines: string[] = []
  for (const c of components) {
    const src = await fs.readFile(path.join(outAbs, "src", `${c}.tsx`), "utf8").catch(
      () => fs.readFile(path.join(outAbs, "src", `${c}.ts`), "utf8")
    )
    const own: string[] = []
    for (const n of extractExports(src)) {
      if (n === "default") continue
      if (owner.has(n)) {
        collisions.push(`${n}: ./${c} shadowed by ./${owner.get(n)}`)
        continue
      }
      owner.set(n, c)
      own.push(n)
    }
    if (own.length) barrelLines.push(`export { ${own.join(", ")} } from "./${c}"`)
  }
  await fs.writeFile(path.join(outAbs, "src", "index.ts"), barrelLines.join("\n") + "\n")
  if (collisions.length)
    console.log(
      `barrel: ${collisions.length} name collision(s) kept subpath-only:\n  ` +
        collisions.join("\n  ")
    )

  // 2b. exports map + dependency split
  const peerDependencies: Record<string, string> = {
    react: appVersions.react ?? ">=18",
    "react-dom": appVersions["react-dom"] ?? ">=18",
  }
  const dependencies: Record<string, string> = {}
  for (const pkg of [...externals].sort()) {
    if (pkg === "react") continue
    const ver = appVersions[pkg] ?? "*"
    if (BUNDLE_AS_DEP.has(pkg)) dependencies[pkg] = ver
    else peerDependencies[pkg] = ver
  }

  const stylesExport =
    CSS === "precompiled" ? "./dist/styles.css" : "./styles.css"
  const exportsMap: Record<string, any> = {
    ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    "./styles.css": stylesExport,
  }
  for (const c of components)
    exportsMap[`./${c}`] = {
      types: `./dist/${c}.d.ts`,
      import: `./dist/${c}.js`,
    }
  for (const l of internalLib)
    exportsMap[`./lib/${l}`] = {
      types: `./dist/lib/${l}.d.ts`,
      import: `./dist/lib/${l}.js`,
    }
  for (const h of internalHooks)
    exportsMap[`./hooks/${h}`] = {
      types: `./dist/hooks/${h}.d.ts`,
      import: `./dist/hooks/${h}.js`,
    }

  const files = ["dist"]
  if (CSS === "source") files.push("styles.css", "theme.css")

  const pkg = {
    name: NAME,
    version: VERSION,
    description:
      lib.description ?? "Design system component library (generated).",
    type: "module",
    sideEffects: ["**/*.css"],
    files,
    exports: exportsMap,
    peerDependencies,
    ...(Object.keys(dependencies).length ? { dependencies } : {}),
    publishConfig: { access: "public" },
  }
  await fs.writeFile(
    path.join(outAbs, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n"
  )

  // 2c. tsconfig for the isolated build (emit despite type noise from the app).
  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      moduleResolution: "Bundler",
      jsx: "react-jsx",
      declaration: true,
      outDir: "dist",
      rootDir: "src",
      strict: false,
      skipLibCheck: true,
      noEmitOnError: false,
      esModuleInterop: true,
    },
    include: ["src"],
  }
  await fs.writeFile(
    path.join(outAbs, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2) + "\n"
  )

  // 3. compile with tsc (preserves per-file "use client").
  console.log(`tsc: compiling ${components.length} components -> dist`)
  await run("pnpm", [
    "exec",
    "tsc",
    "-p",
    path.join(OUT, "tsconfig.json"),
  ])

  // 4. CSS. Reuse the app's @theme inline + @layer base tail verbatim.
  const globals = await fs.readFile(path.join(cwd, "app/globals.css"), "utf8")
  const themeIdx = globals.indexOf("@theme inline")
  const themeTail = themeIdx !== -1 ? globals.slice(themeIdx) : ""
  const themeCss = await fs.readFile(path.join(cwd, "app/styles/theme.css"), "utf8")

  if (CSS === "source") {
    // Consumer imports this AFTER `@import "tailwindcss"`; their Tailwind scans
    // our compiled components (className strings survive in dist JS).
    await fs.writeFile(path.join(outAbs, "theme.css"), themeCss)
    const styles =
      `/* ${NAME} — design tokens + Tailwind mapping.\n` +
      `   Add \`@import "${NAME}/styles.css";\` after \`@import "tailwindcss";\`\n` +
      `   in your Tailwind entry. Requires Tailwind v4 on the consumer. */\n\n` +
      `@import "./theme.css";\n` +
      `@source "./dist";\n\n` +
      themeTail
    await fs.writeFile(path.join(outAbs, "styles.css"), styles)
    console.log(`css: source strategy -> ${OUT}/styles.css (consumer Tailwind)`)
  } else {
    // Precompile a self-contained stylesheet. Scan the JSX SOURCE (full class
    // strings). Mirrors app/globals.css so utilities + tokens all resolve.
    const entry =
      `@import "tailwindcss";\n` +
      `@import "tw-animate-css";\n` +
      `@import "shadcn/tailwind.css";\n` +
      `@import "./theme.css";\n\n` +
      `@source "./src";\n\n` +
      themeTail
    await fs.writeFile(path.join(outAbs, "theme.css"), themeCss)
    await fs.writeFile(path.join(outAbs, ".tw-entry.css"), entry)
    await fs.mkdir(path.join(outAbs, "dist"), { recursive: true })
    console.log(`css: precompiled strategy -> Tailwind over ${OUT}/src`)
    await run("pnpm", [
      "exec",
      "tailwindcss",
      "-i",
      path.join(OUT, ".tw-entry.css"),
      "-o",
      path.join(OUT, "dist", "styles.css"),
      "--minify",
    ])
    await rm(path.join(outAbs, ".tw-entry.css"))
    await rm(path.join(outAbs, "theme.css")) // inlined into dist/styles.css
  }

  // README
  const importCss =
    CSS === "precompiled"
      ? `import "${NAME}/styles.css"      // self-contained; no Tailwind needed`
      : `@import "${NAME}/styles.css";    // in your Tailwind entry, after tailwindcss`
  await fs.writeFile(
    path.join(outAbs, "README.md"),
    `# ${NAME}\n\n` +
      `Design system component library — the locked/versioned distribution of this design system.\n\n` +
      `## Install\n\n\`\`\`bash\nnpm install ${NAME}\n\`\`\`\n\n` +
      `## Use\n\n\`\`\`tsx\nimport { Button } from "${NAME}"\n${importCss}\n\`\`\`\n\n` +
      `Generated by \`scripts/build-package.mts\` (css strategy: **${CSS}**). Do not edit by hand.\n`
  )

  console.log(
    `\npackage: ${NAME}@${VERSION} -> ${OUT}` +
      `\n  ${components.length} components, ${Object.keys(peerDependencies).length} peers, ${Object.keys(dependencies).length} bundled deps` +
      `\n  publish:  cd ${OUT} && npm publish`
  )
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    })
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))
    )
    proc.on("error", reject)
  })
}

main().catch((e) => {
  console.error(e?.message ?? e)
  process.exit(1)
})
