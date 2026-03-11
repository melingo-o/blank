import { NextRequest, NextResponse } from "next/server"

export type NetlifyEvent = {
  body: string | null
  headers: Record<string, string>
  httpMethod: string
  isBase64Encoded: boolean
  path: string
  queryStringParameters: Record<string, string>
  rawUrl: string
}

export type NetlifyHandlerResponse = {
  body?: string
  headers?: Record<string, string>
  statusCode?: number
}

export type NetlifyHandler = (
  event: NetlifyEvent
) => Promise<NetlifyHandlerResponse> | NetlifyHandlerResponse

function buildQueryStringParameters(request: NextRequest) {
  const params: Record<string, string> = {}

  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

async function buildNetlifyEvent(request: NextRequest): Promise<NetlifyEvent> {
  const shouldReadBody = request.method !== "GET" && request.method !== "HEAD"
  const rawBody = shouldReadBody ? await request.text() : ""

  return {
    body: rawBody || null,
    headers: Object.fromEntries(request.headers.entries()),
    httpMethod: request.method,
    isBase64Encoded: false,
    path: request.nextUrl.pathname,
    queryStringParameters: buildQueryStringParameters(request),
    rawUrl: request.url
  }
}

export async function runNetlifyHandler(
  request: NextRequest,
  handler: NetlifyHandler
) {
  const event = await buildNetlifyEvent(request)
  const result = await handler(event)

  return new NextResponse(result?.body ?? "", {
    headers: result?.headers,
    status: result?.statusCode ?? 200
  })
}
