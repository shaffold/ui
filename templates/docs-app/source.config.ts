import { defineConfig, defineDocs } from "fumadocs-mdx/config"
import rehypePrettyCode from "rehype-pretty-code"

export const docs = defineDocs({
  dir: "content/docs",
})

// Syntax-highlight prose code fences with rehype-pretty-code (dual theme,
// matching the component Code tab). Drop fumadocs' default highlighter first.
export default defineConfig({
  mdxOptions: {
    rehypePlugins: (plugins) => {
      plugins.shift()
      plugins.push([
        rehypePrettyCode,
        {
          theme: { dark: "github-dark", light: "github-light" },
        },
      ])
      return plugins
    },
  },
})
