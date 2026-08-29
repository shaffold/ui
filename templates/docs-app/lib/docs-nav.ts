export type DocsNavGroup = {
  title: string
  items: { title: string; href: string }[]
}

// Docs navigation. Replace/extend for your design system's pages.
export const docsNav: DocsNavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/" },
      { title: "Installation", href: "/docs/installation" },
    ],
  },
  {
    title: "Components",
    items: [
      { title: "Button", href: "/docs/button" },
      { title: "Tabs", href: "/docs/tabs" },
      { title: "Dialog", href: "/docs/dialog" },
    ],
  },
]
