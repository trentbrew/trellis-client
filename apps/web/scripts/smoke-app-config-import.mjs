#!/usr/bin/env node
/**
 * Smoke: kernel ↔ sidecar AppSchema ontology parity (TRL-20c).
 *
 * Prereqs:
 *   - Embedded kernel on TRELLIS_PORT (default :1414)
 *   - Sidecar on TRELLIS_URL (default :8230)
 *   - Import already run: node scripts/import-app-config-to-sidecar.mjs
 *
 * Does NOT run import — fails fast with hint if verify fails.
 */
import { trellisEnv } from './trellis-config.mjs'

const kernelPort = process.env.TRELLIS_PORT ?? '1414'
const kernelBase = (process.env.TRELLIS_KERNEL_URL ?? `http://127.0.0.1:${kernelPort}`).replace(/\/$/, '')
const appPort = process.env.TRELLIS_APP_PORT ?? kernelPort
const appBase = (process.env.TRELLIS_APP_URL ?? `http://127.0.0.1:${appPort}`).replace(/\/$/, '')
const useProxy = process.env.TRELLIS_SIDECAR === '1'
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

const kernelOk = await probe(`${kernelBase}/api/graph/health`)
if (!kernelOk) {
  console.error(`Kernel not reachable at ${kernelBase} — run: just run-kernel`)
  process.exit(1)
}

if (useProxy) {
  const healthRes = await fetch(`${appBase}/api/trellis/health`, { cache: 'no-store' })
  const health = await healthRes.json().catch(() => ({}))
  if (!healthRes.ok || !health.available) {
    console.error('Nuxt /api/trellis/health not available — start with TRELLIS_SIDECAR=1')
    process.exit(1)
  }
}

const verifyArgs = ['--verify-only']
if (useProxy) {
  process.env.TRELLIS_SIDECAR = '1'
}

const { spawn } = await import('node:child_process')
const { fileURLToPath } = await import('node:url')
const { dirname, join } = await import('node:path')

const scriptDir = dirname(fileURLToPath(import.meta.url))
const importScript = join(scriptDir, 'import-app-config-to-sidecar.mjs')

const exitCode = await new Promise((resolve) => {
  const child = spawn(process.execPath, [importScript, ...verifyArgs], {
    stdio: 'inherit',
    env: process.env,
    cwd: join(scriptDir, '..'),
  })
  child.on('close', (code) => resolve(code ?? 1))
})

if (exitCode !== 0) {
  console.error('App config import smoke failed — run: node scripts/import-app-config-to-sidecar.mjs')
  process.exit(exitCode)
}

console.log('App config ontology smoke passed')
process.exit(0)
