// @vitest-environment node
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  probeSidecarHealth,
  proxyCreateEntity,
  proxyListEntities,
} from './entities-server'

function connectionRefused(): never {
  const cause = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
  throw new TypeError('fetch failed', { cause })
}

describe('entities-server sidecar degradation', () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(join(tmpdir(), 'entities-server-'))
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
    vi.unstubAllGlobals()
  })

  it('proxyListEntities returns empty list with 200 when sidecar is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(connectionRefused))

    const res = await proxyListEntities(
      new Request('http://localhost/api/trellis/entities?type=CollectionMeta&limit=500'),
      cwd,
    )

    expect(res.status).toBe(200)
    const json = (await res.json()) as { data: unknown[]; total: number }
    expect(json.data).toEqual([])
    expect(json.total).toBe(0)
  })

  it('proxyCreateEntity returns 503 when sidecar is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(connectionRefused))

    const res = await proxyCreateEntity({ type: 'CollectionMeta', attributes: {} }, cwd)
    expect(res.status).toBe(503)
  })

  it('probeSidecarHealth returns false when sidecar is down', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(connectionRefused))
    await expect(probeSidecarHealth(cwd)).resolves.toBe(false)
  })

  it('probeSidecarHealth falls back to entities when health errors but reads work', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((input: string) => {
        const url = String(input)
        if (url.endsWith('/health')) {
          return Promise.resolve(new Response('error', { status: 500 }))
        }
        if (url.includes('/entities?')) {
          return Promise.resolve(new Response(JSON.stringify({ data: [] }), { status: 200 }))
        }
        return connectionRefused()
      }),
    )

    await expect(probeSidecarHealth(cwd)).resolves.toBe(true)
  })
})
