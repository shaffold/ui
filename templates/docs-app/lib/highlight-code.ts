import { codeToHtml } from "shiki"

// Small in-process cache — highlighting is deterministic + CPU-heavy.
const cache = new Map<string, string>()

export async function highlightCode(code: string, language = "tsx") {
  const key = `${language}:${code}`
  const cached = cache.get(key)
  if (cached) return cached

  const html = await codeToHtml(code, {
    lang: language,
    themes: { dark: "github-dark", light: "github-light" },
    transformers: [
      {
        pre(node) {
          node.properties["class"] =
            `${node.properties["class"] ?? ""} no-scrollbar overflow-x-auto px-4 py-3.5 text-sm`.trim()
        },
      },
    ],
  })

  cache.set(key, html)
  return html
}
