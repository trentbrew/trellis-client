#!/usr/bin/env node
/**
 * Import embedded-kernel app config into the trellis sidecar DB.
 *
 * Reads GET /api/graph/config from the embedded kernel and upserts typed
 * AppRoute / AppSchema / AppProjection / AppProjectionView entities.
 *
 * Usage:
 *   node scripts/import-app-config-to-sidecar.mjs
 *   TRELLIS_SIDECAR=1 node scripts/import-app-config-to-sidecar.mjs
 */
import { authHeaders, trellisEnv } from './trellis-config.mjs'

const kernelPort = process.env.TRELLIS_PORT ?? '1414'
const kernelBase = (process.env.TRELLIS_KERNEL_URL ?? `http://127.0.0.1:${kernelPort}`).replace(/\/$/, '')
const appPort = process.env.TRELLIS_APP_PORT ?? kernelPort
const appBase = (process.env.TRELLIS_APP_URL ?? `http://127.0.0.1:${appPort}`).replace(/\/$/, '')
const useProxy = process.env.TRELLIS_SIDECAR === '1'
const { base: sidecarBase, apiKey } = trellisEnv()
const targetBase = useProxy ? `${appBase}/api/trellis` : sidecarBase
const headers = authHeaders(apiKey)

async function fetchKernelConfig() {
  const res = await fetch(`${kernelBase}/api/graph/config`)
  if (!res.ok) {
    throw new Error(`Kernel config failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

async function upsertEntity(type, id, attributes) {
  const body = { type, attributes: { id, ...attributes } }
  const url = `${targetBase}/entities/${encodeURIComponent(id)}`

  let res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })

  if (res.status === 404 || res.status === 405) {
    res = await fetch(`${targetBase}/entities`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${type} ${id}: ${res.status} ${text}`)
  }

  return res.json()
}

const config = await fetchKernelConfig()
let ok = 0
let failed = 0

const tasks = []

for (const [routeId, route] of Object.entries(config.routes ?? {})) {
  tasks.push({
    type: 'AppRoute',
    id: routeId,
    attributes: {
      title: route.label ?? routeId,
      configJson: JSON.stringify(route),
    },
  })
}

for (const [schemaId, schema] of Object.entries(config.ontologies ?? {})) {
  const slug = schemaId.replace(/^trellis:schema\//, '').replace(/[:/]/g, '-')
  tasks.push({
    type: 'AppSchema',
    id: `ontology:${slug}`,
    attributes: {
      title: schema.label ?? schemaId,
      schemaId,
      configJson: JSON.stringify(schema),
    },
  })
}

for (const [projectionId, projection] of Object.entries(config.projections ?? {})) {
  const slug = projectionId.replace(/^trellis:projection\//, '').replace(/\//g, '-')
  tasks.push({
    type: 'AppProjection',
    id: `projection:${slug}`,
    attributes: {
      title: projection.name ?? projectionId,
      projectionId,
      configJson: JSON.stringify(projection),
    },
  })
}

for (const [viewId, view] of Object.entries(config.projectionViews ?? {})) {
  const projectionType = view.projectionType ?? viewId.replace(/^projection-view:/, '')
  tasks.push({
    type: 'AppProjectionView',
    id: viewId.startsWith('projection-view:') ? viewId : `projection-view:${projectionType}`,
    attributes: {
      title: view.label ?? projectionType,
      projectionType,
      configJson: JSON.stringify(view),
    },
  })
}

if (tasks.length === 0) {
  console.log('No app config rows to import from kernel.')
  process.exit(0)
}

console.log(`Importing ${tasks.length} app config entity(ies) to ${targetBase} …`)

for (const task of tasks) {
  try {
    await upsertEntity(task.type, task.id, task.attributes)
    ok++
    console.log('  ✓', task.id)
  } catch (err) {
    failed++
    console.error('  ✗', task.id, err.message)
  }
}

console.log(`Done — imported ${ok}, failed ${failed}`)
process.exit(failed > 0 ? 1 : 0)
