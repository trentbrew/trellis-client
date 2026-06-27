#!/usr/bin/env node
/**
 * Import kernel pages into the trellis sidecar DB.
 *
 * Requires:
 * - Embedded kernel on TRELLIS_PORT (default 1414)
 * - Sidecar on TRELLIS_URL (default 8230) OR Nuxt proxy with TRELLIS_SIDECAR=1
 *
 * Usage:
 *   node scripts/import-pages-to-sidecar.mjs
 *   LIMIT=20 node scripts/import-pages-to-sidecar.mjs
 *   TRELLIS_SIDECAR=1 node scripts/import-pages-to-sidecar.mjs  # via /api/trellis
 */
import { trellisEnv } from './trellis-config.mjs'

const kernelPort = process.env.TRELLIS_PORT ?? '1414'
const kernelBase = (process.env.TRELLIS_KERNEL_URL ?? `http://127.0.0.1:${kernelPort}`).replace(/\/$/, '')
const appPort = process.env.TRELLIS_APP_PORT ?? kernelPort
const appBase = (process.env.TRELLIS_APP_URL ?? `http://127.0.0.1:${appPort}`).replace(/\/$/, '')
const useProxy = process.env.TRELLIS_SIDECAR === '1'
const { base: sidecarBase } = trellisEnv()
const targetBase = useProxy ? `${appBase}/api/trellis` : sidecarBase
const limit = Number.parseInt(process.env.LIMIT ?? '100', 10)

async function kernelQuery(query) {
  const res = await fetch(`${kernelBase}/api/graph/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    throw new Error(`Kernel query failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

async function createOnSidecar(page) {
  const id = page.id ?? page['?e.id']
  const title = page.title ?? page['?e.title'] ?? 'Untitled'
  const content = page.content ?? page['?e.content'] ?? ''
  const sortOrder = page.sortOrder ?? page['?e.sortOrder']

  const body = {
    type: 'Page',
    attributes: {
      id,
      title: String(title).trim() || 'Untitled',
      body: typeof content === 'string' ? content : '',
      ...(sortOrder != null ? { sortOrder } : {}),
    },
  }

  const res = await fetch(`${targetBase}/entities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sidecar create failed for ${id}: ${res.status} ${text}`)
  }

  return res.json()
}

const query = `FIND entity AS ?e WHERE ?e.type = "page" RETURN ?e.id, ?e.title, ?e.content, ?e.sortOrder LIMIT ${limit}`
const result = await kernelQuery(query)
const rows = Array.isArray(result?.results)
  ? result.results
  : Array.isArray(result?.data)
    ? result.data
    : Array.isArray(result)
      ? result
      : []

if (rows.length === 0) {
  console.log('No kernel pages found to import.')
  process.exit(0)
}

console.log(`Importing ${rows.length} page(s) to ${targetBase} …`)

let ok = 0
let failed = 0

for (const row of rows) {
  const page =
    typeof row === 'object' && row !== null
      ? {
          id: row['?e.id'] ?? row.id,
          title: row['?e.title'] ?? row.title,
          content: row['?e.content'] ?? row.content,
          sortOrder: row['?e.sortOrder'] ?? row.sortOrder,
        }
      : row

  try {
    await createOnSidecar(page)
    ok++
    console.log('  ✓', page.id)
  } catch (err) {
    failed++
    console.error('  ✗', page.id, err.message)
  }
}

console.log(`Done — imported ${ok}, failed ${failed}`)
process.exit(failed > 0 ? 1 : 0)
