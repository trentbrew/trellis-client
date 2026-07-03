import { FetchError } from 'trellis/browser'
import { installKernelBridgeSseRealtime, type KernelBridgePatchedDb } from './sse-realtime'

const KERNEL_BRIDGE_HTTP_PROXY = '/api/graph/kernel-bridge'

type FetchableTrellisDb = {
  opts: { apiKey?: string }
  _fetch: (method: string, path: string, body?: unknown) => Promise<unknown>
}

export function installKernelBridgeHttpProxy(db: FetchableTrellisDb): void {
  db._fetch = async (method: string, path: string, body?: unknown) => {
    const hasBody = body !== undefined
    const res = await fetch(`${KERNEL_BRIDGE_HTTP_PROXY}${path}`, {
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
      throw new FetchError(
        res.status,
        (data as { message?: string })?.message ?? res.statusText,
        data,
      )
    }
    return data
  }

  installKernelBridgeSseRealtime(db as unknown as KernelBridgePatchedDb)
}
