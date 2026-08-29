import type { MDXComponents } from "mdx/types"
import * as React from "react"
import { Callout } from "fumadocs-ui/components/callout"

import { Button } from "@/registry/ui/button"
import { Kbd } from "@/registry/ui/kbd"
import { ComponentPreview } from "@/components/component-preview"
import { ComponentSource } from "@/components/component-source"
import { Step, Steps } from "@/components/steps"

// Components used as live MDX in content/docs/** (generated component pages).
const map: MDXComponents = {
  ComponentPreview,
  ComponentSource,
  Steps,
  Step,
  Callout,
  Button,
  Kbd,
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  Image: (props: React.ComponentProps<"img">) => <img {...props} />,
}

// Passthrough fallback so a page never crashes on a rare unmapped tag (e.g. a
// one-off doc icon): render its children, drop the wrapper.
const Fallback = ({ children }: { children?: React.ReactNode }) => (
  <>{children ?? null}</>
)

export const mdxComponents: MDXComponents = new Proxy(map, {
  get(target, prop) {
    if (prop in target) return target[prop as keyof MDXComponents]
    if (typeof prop === "string" && /^[A-Z]/.test(prop)) return Fallback
    return undefined
  },
}) as MDXComponents
