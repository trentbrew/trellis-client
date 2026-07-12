// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { TrellisKernel, createKernelBackend } from 'trellis/core'
import { createNodeApi, type NodeApi } from './node-api'

describe('createNodeApi (entity-write adapter over published kernel)', () => {
  let kernel: TrellisKernel
  let api: NodeApi

  const dump = (id: string): Record<string, unknown> =>
    Object.fromEntries(kernel.getStore().getFactsByEntity(id).map((f) => [f.a, f.v]))

  beforeEach(async () => {
    const backend = await createKernelBackend(':memory:', { backend: 'sqljs' })
    kernel = new TrellisKernel({ backend, agentId: 'default', autoReplay: false })
    kernel.boot()
    api = createNodeApi(kernel)
  })

  afterEach(() => kernel.close?.())

  it('createNode writes all fields', async () => {
    await api.createNode('t1', { title: 'Draft', status: 'open', priority: 3 }, 'task')
    expect(dump('t1')).toEqual({ type: 'task', title: 'Draft', status: 'open', priority: 3 })
  })

  it('updateNode merges — overwrites named, preserves unmentioned', async () => {
    await api.createNode('t1', { title: 'Draft', status: 'open', priority: 3 }, 'task')
    await api.updateNode('t1', { status: 'in_progress', assignee: 'bob' }, 'task')
    expect(dump('t1')).toEqual({
      type: 'task',
      title: 'Draft',
      status: 'in_progress',
      priority: 3,
      assignee: 'bob',
    })
  })

  it('createNode is an idempotent full-replace — drops unmentioned fields', async () => {
    await api.createNode('t1', { title: 'Draft', status: 'open', priority: 3, assignee: 'bob' }, 'task')
    await api.createNode('t1', { title: 'Draft', status: 'done' }, 'task')
    expect(dump('t1')).toEqual({ type: 'task', title: 'Draft', status: 'done' })
  })

  it('deleteNode removes every fact for the entity', async () => {
    await api.createNode('t1', { title: 'Draft' }, 'task')
    await api.deleteNode('t1')
    expect(dump('t1')).toEqual({})
  })

  it('attributes ops to the per-call agentId', async () => {
    await api.createNode('t1', { title: 'A' }, 'task', { agentId: 'alice' })
    await api.updateNode('t1', { title: 'B' }, 'task', { agentId: 'bob' })
    const ops = kernel.readAllOps()
    const agents = ops.map((o: any) => o.agentId ?? o.meta?.agentId)
    expect(agents).toContain('alice')
    expect(agents).toContain('bob')
  })
})
