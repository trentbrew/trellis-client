#!/usr/bin/env node
/**
 * HTTP smoke for Nuxt /api/trellis proxy (requires TRELLIS_SIDECAR=1 on dev server).
 * Sidecar must be running on TRELLIS_URL (default :8230).
 */
import { trellisEnv } from './trellis-config.mjs'

const port = process.env.TRELLIS_PORT ?? '1414'
const appBase = (process.env.TRELLIS_APP_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, '')
const { base: sidecarBase } = trellisEnv()

async function probe(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

const sidecarOk = await probe(`${sidecarBase}/health`) || await probe(`${sidecarBase}/entities?limit=1`)
if (!sidecarOk) {
  console.error(`Sidecar not reachable at ${sidecarBase} — run: just sidecar-serve`)
  process.exit(1)
}

const healthRes = await fetch(`${appBase}/api/trellis/health`, { cache: 'no-store' })
const health = await healthRes.json()
if (!healthRes.ok || !health.available) {
  console.error('Nuxt /api/trellis/health not available:', health)
  console.error('Start Nuxt with TRELLIS_SIDECAR=1 (e.g. TRELLIS_SIDECAR=1 pnpm dev)')
  process.exit(1)
}

const testId = `smoke-${Date.now()}`
const createRes = await fetch(`${appBase}/api/trellis/entities`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'task',
    attributes: { title: 'Sidecar smoke task', id: testId },
  }),
})
if (!createRes.ok) {
  console.error('POST /api/trellis/entities failed:', createRes.status, await createRes.text())
  process.exit(1)
}

const created = await createRes.json()
const entityId = created?.id ?? created?.data?.id ?? testId

const listRes = await fetch(`${appBase}/api/trellis/entities?limit=5`, { cache: 'no-store' })
if (!listRes.ok) {
  console.error('GET /api/trellis/entities failed:', listRes.status)
  process.exit(1)
}

const list = await listRes.json()
const rows = Array.isArray(list) ? list : (list.data ?? [])
console.log('Sidecar HTTP smoke OK — listed', rows.length, 'entities; created', entityId)

if (entityId) {
  await fetch(`${appBase}/api/trellis/entities/${encodeURIComponent(entityId)}`, {
    method: 'DELETE',
  }).catch(() => {})
}

console.log('HTTP smoke passed')
