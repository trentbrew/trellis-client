// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { JsonlKernelBackend } from '@turtle.tech/trellis-kernel/persist/jsonl'
import { TrellisKernel } from '@turtle.tech/trellis-kernel'
import { getRouteDefinitions } from '../utils/trellis-shell-routes'
import { seedAppConfigFromModules } from './seed-app-config'
import { buildAppConfigSnapshot } from './app-config-snapshot'

describe('buildAppConfigSnapshot', () => {
  let tmpDir: string
  let kernel: TrellisKernel

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'app-config-snapshot-'))
    const backend = new JsonlKernelBackend({ filename: join(tmpDir, 'ops.jsonl') })
    kernel = new TrellisKernel({ backend, autoReplay: true })
    await kernel.boot({ workspace: { name: 'test' } })
  })

  afterEach(() => {
    kernel.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns graph-seeded routes keyed by route:*', async () => {
    await seedAppConfigFromModules(kernel)
    const snapshot = buildAppConfigSnapshot(kernel)

    expect(Object.keys(snapshot.routes).some((id) => id.startsWith('route:'))).toBe(true)
    expect(snapshot.routes['route:home']?.routePath).toBe('/home')
  })

  it('falls back to module routes when graph has no app_route entities', () => {
    const snapshot = buildAppConfigSnapshot(kernel)
    const moduleRoutes = getRouteDefinitions()
    expect(Object.keys(snapshot.routes).length).toBeGreaterThanOrEqual(Object.keys(moduleRoutes).length)
    expect(snapshot.routes['route:home']?.routePath).toBe('/home')
  })
})
