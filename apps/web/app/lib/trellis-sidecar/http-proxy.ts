import { FetchError } from 'trellis/browser'
import { installSidecarGuard, type RealtimePatchedDb } from './offline-realtime'

const TRELLIS_HTTP_PROXY = '/api/trellis'

type FetchableTrellisDb = {
  opts: { apiKey?: string }
  _fetch: (method: string, path: string, body?: unknown) => Promise<unknown>
}

export function installHttpProxy(db: FetchableTrellisDb): void {
  db._fetch = async (method: string, path: string, body?: unknown) => {
    const hasBody = body !== undefined
    const res = await fetch(`${TRELLIS_HTTP_PROXY}${path}`, {
      method,
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(db.opts.apiKey ? { Authorization: `Bearer ${db.opts.apiKey}` } : {}),
      },
      body: hasBody ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let data: unknown = {}
    if (text.trim()) {
      try {
        data = JSON.parse(text)
      } catch {
        throw new FetchError(res.status, 'Invalid JSON response', text)
      }
    }
    if (!res.ok) {
      // 404 on GET is a normal "entity not found" — return null instead of
      // throwing so callers (e.g. SDK read()) get a clean null without
      // triggering console error noise from error propagation chains.
      if (res.status === 404 && method === 'GET') return null
      throw new FetchError(res.status, (data as { message?: string })?.message ?? res.statusText, data)
    }
    return data
  }

  installSidecarGuard(db as unknown as RealtimePatchedDb)
}
