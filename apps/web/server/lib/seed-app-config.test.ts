// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { JsonlKernelBackend } from '@turtle.tech/trellis-kernel/persist/jsonl'
import { TrellisKernel } from '@turtle.tech/trellis-kernel'
import { getRouteDefinitions } from '../utils/trellis-shell-routes'
import { seedAppConfigFromModules } from './seed-app-config'

describe('seedAppConfigFromModules', () => {
  let tmpDir: string
  let kernel: TrellisKernel

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'seed-app-config-'))
    const backend = new JsonlKernelBackend({ filename: join(tmpDir, 'ops.jsonl') })
    kernel = new TrellisKernel({ backend, autoReplay: true })
    await kernel.boot({ workspace: { name: 'test' } })
  })

  afterEach(() => {
    kernel.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('seeds at least as many routes as getRouteDefinitions()', async () => {
    const stats = await seedAppConfigFromModules(kernel)
    expect(stats.routes).toBeGreaterThanOrEqual(Object.keys(getRouteDefinitions()).length)
  })

  it('is idempotent — second seed does not multiply app_route entities', async () => {
    await seedAppConfigFromModules(kernel)
    const firstCount = [...kernel.getStore().getAllFacts()].filter(
      (f) => f.a === 'type' && f.v === 'app_route',
    ).length

    await seedAppConfigFromModules(kernel)
    const secondCount = [...kernel.getStore().getAllFacts()].filter(
      (f) => f.a === 'type' && f.v === 'app_route',
    ).length

    expect(secondCount).toBe(firstCount)
  })
})
