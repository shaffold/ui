import { Badge } from "@/registry/ui/badge"
import { Button } from "@/registry/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/ui/tabs"

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Badge variant="secondary" className="w-fit">
          base-nova
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Design System Docs
        </h1>
        <p className="text-muted-foreground">
          The sidebar, header, and the examples below all render from your design
          system&apos;s own components via{" "}
          <code className="rounded bg-muted px-1.5 py-0.5">@/registry/ui/*</code>.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border p-6">
        <h2 className="text-sm font-medium text-muted-foreground">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border p-6">
        <h2 className="text-sm font-medium text-muted-foreground">Tabs</h2>
        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="text-sm text-muted-foreground">
            A themed preview surface.
          </TabsContent>
          <TabsContent value="code" className="text-sm text-muted-foreground">
            <code>{`<Button>Default</Button>`}</code>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}
