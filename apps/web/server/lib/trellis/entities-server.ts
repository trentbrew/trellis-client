import {
  fetchSidecar,
  SIDECAR_UNAVAILABLE,
} from './fetch-sidecar'
import { trellisAuthHeaders, trellisServerConfig } from './trellis-server-config'

function sidecarEntitiesUrl(origin: string, search = ''): string {
  return `${origin}/entities${search}`
}

function emptyListResponse(url: URL): Response {
  const limit = Number.parseInt(url.searchParams.get('limit') ?? '100', 10)
  const offset = Number.parseInt(url.searchParams.get('offset') ?? '0', 10)
  return Response.json({
    data: [],
    total: 0,
    limit: Number.isFinite(limit) ? limit : 100,
    offset: Number.isFinite(offset) ? offset : 0,
  })
}

async function forwardSidecarResponse(res: Response): Promise<Response> {
  const text = await res.text()
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
  })
}

export async function proxyListEntities(request: Request, cwd?: string): Promise<Response> {
  const config = trellisServerConfig(cwd)
  const url = new URL(request.url)
  const search = url.search

  const res = await fetchSidecar(sidecarEntitiesUrl(config.origin, search), {
    headers: trellisAuthHeaders(config.apiKey),
    cache: 'no-store',
  })

  if (!res) return emptyListResponse(url)
  return forwardSidecarResponse(res)
}

export async function proxyCreateEntity(body: unknown, cwd?: string): Promise<Response> {
  const config = trellisServerConfig(cwd)

  const res = await fetchSidecar(`${config.origin}/entities`, {
    method: 'POST',
    headers: trellisAuthHeaders(config.apiKey),
    body: JSON.stringify(body),
  })

  if (!res) {
    return Response.json(SIDECAR_UNAVAILABLE, { status: 503 })
  }

  return forwardSidecarResponse(res)
}

export async function proxyEntityById(
  request: Request,
  id: string,
  cwd?: string,
): Promise<Response> {
  const config = trellisServerConfig(cwd)
  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'DELETE' && method !== 'HEAD'

  let body: string | undefined
  if (hasBody) {
    body = await request.text()
  }

  const res = await fetchSidecar(`${config.origin}/entities/${encodeURIComponent(id)}`, {
    method,
    headers: trellisAuthHeaders(config.apiKey),
    body,
  })

  if (!res) {
    if (method === 'GET') {
      return Response.json({ message: 'Entity not found' }, { status: 404 })
    }
    return Response.json(SIDECAR_UNAVAILABLE, { status: 503 })
  }

  return forwardSidecarResponse(res)
}

export async function proxySidecarPath(request: Request, path: string, cwd?: string): Promise<Response> {
  const config = trellisServerConfig(cwd)
  const reqUrl = new URL(request.url)
  const target = new URL(path.startsWith('/') ? path.slice(1) : path, `${config.origin}/`)
  target.search = reqUrl.search

  const method = request.method.toUpperCase()
  const hasBody = method !== 'GET' && method !== 'DELETE' && method !== 'HEAD'
  const body = hasBody ? await request.text() : undefined

  const res = await fetchSidecar(target.toString(), {
    method,
    headers: trellisAuthHeaders(config.apiKey),
    body,
    cache: 'no-store',
  })

  if (!res) {
    return Response.json(SIDECAR_UNAVAILABLE, { status: 503 })
  }

  return forwardSidecarResponse(res)
}

export async function probeSidecarHealth(cwd?: string): Promise<boolean> {
  const config = trellisServerConfig(cwd)
  const health = await fetchSidecar(`${config.origin}/health`, { cache: 'no-store' })
  if (health?.ok) return true

  const entities = await fetchSidecar(`${config.origin}/entities?limit=1`, {
    cache: 'no-store',
  })
  return entities?.ok ?? false
}
