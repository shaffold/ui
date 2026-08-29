import path from "path"
import { resolveConfigPaths } from "@/src/utils/get-config"
import deepmerge from "deepmerge"
import fs from "fs-extra"

import { createTemplate } from "./create-template"

const BASES = ["base", "radix", "aria"]

// A design-system documentation site. Unlike the app templates, docs owns its
// entire init: it writes components.json from the resolved preset/base and then
// lets the scaffolded app's own `build-style` (predev) build registry/ui + the
// theme locally. Because this template defines `init`, runInit returns early and
// the CLI does NOT run `addComponents` — the docs app is self-building.
export const docs = createTemplate({
  name: "docs",
  title: "Docs",
  description: "A design-system documentation site.",
  defaultProjectName: "docs-app",
  templateDir: "docs-app",
  // Chosen explicitly via `--template docs`, not auto-detected from a framework.
  frameworks: [],
  create: async () => {
    // Empty — the scaffolded folder already carries everything.
  },
  init: async (options) => {
    const configPath = path.resolve(options.projectPath, "components.json")
    const config = await fs.readJson(configPath)

    // registryBaseConfig carries the resolved preset (style, baseColor, icon…).
    const merged = options.registryBaseConfig
      ? deepmerge(config, options.registryBaseConfig as object)
      : config

    // shadcn's registry:base uses a combined style "<base>-<style>"; split it
    // back into our components.json { base, style } that build-style expects.
    if (typeof merged.style === "string" && merged.style.includes("-")) {
      const [maybeBase, ...rest] = merged.style.split("-")
      if (BASES.includes(maybeBase)) {
        merged.base = maybeBase
        merged.style = rest.join("-")
      }
    }

    if (options.iconLibrary) merged.iconLibrary = options.iconLibrary
    if (options.rtl) merged.rtl = options.rtl

    await fs.writeJson(configPath, merged, { spaces: 2 })

    return resolveConfigPaths(options.projectPath, merged)
  },
})
