// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { JsonlKernelBackend } from '@turtle.tech/trellis-kernel/persist/jsonl'
import { TrellisKernel } from '@turtle.tech/trellis-kernel'
import { createWorkspaceConfig } from '../../utils/trellis-ontologies'
import { seedAppConfigFromModules, upsertTrellisSchemaEntity } from '../seed-app-config'
import {
  getSchemaFromGraph,
  listSchemasFromGraph,
  schemaEntityIdFromSchemaId,
  schemasToRecord,
} from './graph-schema-registry'

describe('listSchemasFromGraph', () => {
  let tmpDir: string
  let kernel: TrellisKernel

  beforeEach(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ontology-registry-'))
    const backend = new JsonlKernelBackend({ filename: join(tmpDir, 'ops.jsonl') })
    kernel = new TrellisKernel({ backend, autoReplay: true })
    await kernel.boot({ workspace: { name: 'test' } })
  })

  afterEach(() => {
    kernel.close()
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns graph-seeded schemas after seedAppConfigFromModules', async () => {
    await seedAppConfigFromModules(kernel)
    const schemas = listSchemasFromGraph(kernel)
    const record = schemasToRecord(schemas)

    expect(schemas.length).toBeGreaterThan(0)
    expect(record['trellis:schema/task']).toBeDefined()
    expect(record['trellis:schema/task']?.label).toBe('Task')
  })

  it('falls back to module ontologies when graph has no trellis_schema entities', () => {
    const schemas = listSchemasFromGraph(kernel)
    const moduleCount = Object.keys(createWorkspaceConfig().workspace.ontologies ?? {}).length

    expect(schemas.length).toBe(moduleCount)
    expect(schemas.some((s) => s['@id'] === 'trellis:schema/task')).toBe(true)
  })

  it('getSchemaFromGraph resolves by schema @id', async () => {
    await seedAppConfigFromModules(kernel)
    const task = getSchemaFromGraph(kernel, 'trellis:schema/task')
    expect(task?.['@id']).toBe('trellis:schema/task')
    expect(schemaEntityIdFromSchemaId('trellis:schema/task')).toBe('ontology:task')
  })

  it('upsertTrellisSchemaEntity makes custom schema visible in list', async () => {
    const customId = 'trellis:schema/trl20-test-registry'
    await upsertTrellisSchemaEntity(kernel, {
      '@id': customId,
      '@type': 'trellis:Schema',
      version: '1.0.0',
      tier: 'user',
      label: 'TRL-20 Test',
      fields: [{ name: 'title', valueType: 'title', required: true }],
    })

    const hit = getSchemaFromGraph(kernel, customId)
    expect(hit?.label).toBe('TRL-20 Test')
    expect(listSchemasFromGraph(kernel).some((s) => s['@id'] === customId)).toBe(true)
  })
})
