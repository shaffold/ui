import { promises as fs } from "fs"
import path from "path"

export async function readFileFromRoot(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf-8")
}
