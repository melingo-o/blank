import { createRequire } from "module"
import type { NextRequest } from "next/server"
import { runNetlifyHandler, type NetlifyHandler } from "@/lib/vercel/netlify-route"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const require = createRequire(import.meta.url)
const { handler } = require("../../../netlify/functions/workspace-config.js") as {
  handler: NetlifyHandler
}

export async function GET(request: NextRequest) {
  return runNetlifyHandler(request, handler)
}

export async function POST(request: NextRequest) {
  return runNetlifyHandler(request, handler)
}
