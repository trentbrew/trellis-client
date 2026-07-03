#!/usr/bin/env node
/**
 * Import embedded-kernel app config into the trellis sidecar DB.
 *
 * Reads GET /api/graph/config from the embedded kernel and upserts typed
 * AppRoute / AppSchema / AppProjection / AppProjectionView entities.
 *
 * Usage:
 *   node scripts/import-app-config-to-sidecar.mjs
 *   node scripts/import-app-config-to-sidecar.mjs --verify-only
 *   node scripts/import-app-config-to-sidecar.mjs --import-and-verify
 *   TRELLIS_SIDECAR=1 node scripts/import-app-config-to-sidecar.mjs --verify-only
 */
import { authHeaders, trellisEnv } from './trellis-config.mjs'
import { buildAppConfigImportTasks, compareOntologyParity } from './lib/app-config-import-tasks.mjs'
import { fetchSidecarSchemas } from './lib/fetch-sidecar-schemas.mjs'

const args = process.argv.slice(2)
const verifyOnly = args.includes('--verify-only')
const importAndVerify = args.includes('--import-and-verify')

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

async function runImport(config) {
  const tasks = buildAppConfigImportTasks(config)

  if (tasks.length === 0) {
    console.log('No app config rows to import from kernel.')
    return { ok: 0, failed: 0 }
  }

  console.log(`Importing ${tasks.length} app config entity(ies) to ${targetBase} …`)

  let ok = 0
  let failed = 0

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
  return { ok, failed }
}

async function runVerify(config) {
  const schemas = await fetchSidecarSchemas(targetBase, headers)
  const parity = compareOntologyParity(config, schemas)

  if (parity.expectedCount === 0) {
    console.warn('[verify] Kernel config has zero ontologies — check seedAppConfigFromModules')
  }

  if (parity.ok) {
    console.log(
      `Ontology parity OK — ${parity.actualCount} AppSchema row(s) match kernel config`,
    )
    return 0
  }

  console.error('Ontology parity FAILED')
  console.error(`  kernel ontologies: ${parity.expectedCount}`)
  console.error(`  sidecar AppSchema:  ${parity.actualCount}`)
  if (parity.missing.length > 0) {
    console.error('  missing on sidecar:', parity.missing.join(', '))
  }
  if (parity.extra.length > 0) {
    console.error('  extra on sidecar:', parity.extra.join(', '))
  }
  console.error('  hint: node scripts/import-app-config-to-sidecar.mjs')
  return 1
}

async function main() {
  const config = await fetchKernelConfig()

  if (verifyOnly) {
    process.exit(await runVerify(config))
  }

  const { failed } = await runImport(config)
  if (failed > 0) {
    process.exit(1)
  }

  if (importAndVerify) {
    process.exit(await runVerify(config))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
