import { promises as fs } from "fs"
import path from "path"
import { type NextRequest, NextResponse } from "next/server"

// Serves the design-system registry with optional authentication.
//
// PUBLIC registry (default): build to public/r (static) and you don't need this
// route. PRIVATE registry: `REGISTRY_OUT=private-registry/r pnpm registry:build`
// (so the JSON is NOT under public/), set REGISTRY_TOKEN, and this route gates
// every fetch — `shadcn add @ds/button` then needs the Authorization header.
//
// components.json (consumer side):
//   "registries": {
//     "@ds": {
//       "url": "https://<host>/r/{name}.json",
//       "headers": { "Authorization": "Bearer ${REGISTRY_TOKEN}" }
//     }
//   }

const REGISTRY_DIR = process.env.REGISTRY_DIR || "private-registry/r"
const TOKEN = process.env.REGISTRY_TOKEN

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ name: string[] }> }
) {
  // Enforce auth only when a token is configured (otherwise the route is open).
  if (TOKEN) {
    const bearer = request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
    const provided = bearer || request.nextUrl.searchParams.get("token")

    if (!provided) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message:
            "Authentication required. Set REGISTRY_TOKEN in your .env.local and send it as `Authorization: Bearer <token>`.",
        },
        { status: 401 }
      )
    }
    if (provided !== TOKEN) {
      return NextResponse.json(
        { error: "Forbidden", message: "Invalid registry token." },
        { status: 403 }
      )
    }
  }

  const { name } = await ctx.params
  const rel = name.join("/")

  // Prevent path traversal.
  const base = path.resolve(process.cwd(), REGISTRY_DIR)
  const file = path.resolve(base, rel)
  if (!file.startsWith(base + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  try {
    const content = await fs.readFile(file, "utf8")
    return new NextResponse(content, {
      headers: { "content-type": "application/json" },
    })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}
