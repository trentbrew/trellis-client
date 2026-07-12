// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { TrellisKernel, createKernelBackend } from 'trellis/core'
import { transpileFind } from './find-to-select'
import { queryFind } from './query'

describe('transpileFind (AST)', () => {
  it('anchors an exact type and projects the entity var by default', () => {
    const q = transpileFind('FIND task AS ?t')
    expect(q.select).toEqual(['t'])
    expect(q.where).toContainEqual({
      kind: 'fact',
      entity: { kind: 'variable', name: 't' },
      attribute: { kind: 'literal', value: 'type' },
      value: { kind: 'literal', value: 'task' },
    })
    expect(q.limit).toBe(0)
  })

  it('maps `entity` to a generic match-all type binding', () => {
    const q = transpileFind('FIND entity AS ?e')
    const typePat = q.where.find((p: any) => p.attribute?.value === 'type')
    expect(typePat).toMatchObject({ value: { kind: 'variable' } })
  })

  it('turns equality WHERE clauses into fact patterns', () => {
    const q = transpileFind('FIND task AS ?t WHERE ?t.status = "open" AND ?t.owner = "alice"')
    expect(q.where).toContainEqual({
      kind: 'fact',
      entity: { kind: 'variable', name: 't' },
      attribute: { kind: 'literal', value: 'status' },
      value: { kind: 'literal', value: 'open' },
    })
    expect(q.filters).toHaveLength(0)
  })

  it('turns inequality WHERE clauses into a bound var + filter', () => {
    const q = transpileFind('FIND task AS ?t WHERE ?t.priority >= 3')
    expect(q.filters).toContainEqual({
      kind: 'filter',
      left: { kind: 'variable', name: 't_priority' },
      op: '>=',
      right: { kind: 'literal', value: 3 },
    })
    expect(q.where).toContainEqual({
      kind: 'fact',
      entity: { kind: 'variable', name: 't' },
      attribute: { kind: 'literal', value: 'priority' },
      value: { kind: 'variable', name: 't_priority' },
    })
  })

  it('binds RETURN projections and ORDER BY, honoring LIMIT', () => {
    const q = transpileFind(
      'FIND notification AS ?n RETURN ?n.status, ?n.sourceId ORDER BY ?n.createdAt DESC LIMIT 5',
    )
    expect(q.select).toEqual(['n_status', 'n_sourceId'])
    expect(q.orderBy).toEqual([{ variable: 'n_createdAt', direction: 'desc' }])
    expect(q.limit).toBe(5)
  })

  it('reuses one binding when an attribute is both filtered and returned', () => {
    const q = transpileFind('FIND task AS ?t WHERE ?t.priority > 1 RETURN ?t.priority')
    const bound = q.where.filter(
      (p: any) => p.attribute?.value === 'priority' && p.value?.kind === 'variable',
    )
    expect(bound).toHaveLength(1)
    expect(q.select).toEqual(['t_priority'])
  })

  it('throws on unsupported input', () => {
    expect(() => transpileFind('SELECT * FROM tasks')).toThrow(/unsupported/)
  })
})

describe('queryFind (round-trip on published kernel)', () => {
  let kernel: TrellisKernel

  beforeEach(async () => {
    const backend = await createKernelBackend(':memory:', { backend: 'sqljs' })
    kernel = new TrellisKernel({ backend, agentId: 'test', autoReplay: false })
    kernel.boot()
    const add = (id: string, facts: Record<string, string | number>) =>
      kernel.mutate('addFacts', {
        facts: Object.entries(facts).map(([a, v]) => ({ e: id, a, v })),
      })
    await add('n1', { type: 'notification', status: 'unread', sourceId: 'src-A', createdAt: '2026-07-01' })
    await add('n2', { type: 'notification', status: 'read', sourceId: 'src-B', createdAt: '2026-07-02' })
    await add('n3', { type: 'notification', status: 'unread', sourceId: 'src-A', createdAt: '2026-07-03' })
    await add('t1', { type: 'task', priority: 5 })
  })

  afterEach(() => kernel.close?.())

  it('returns rows for a conjunctive WHERE + RETURN + LIMIT', async () => {
    const { rows, count } = await queryFind(
      kernel,
      'FIND notification AS ?n WHERE ?n.sourceId = "src-A" AND ?n.status = "unread" RETURN ?n.sourceId LIMIT 1',
    )
    expect(count).toBe(1)
    expect(rows[0]).toEqual({ n_sourceId: 'src-A' })
  })

  it('orders results by a projected attribute (DESC)', async () => {
    const { rows } = await queryFind(
      kernel,
      'FIND notification AS ?n RETURN ?n.createdAt ORDER BY ?n.createdAt DESC',
    )
    expect(rows.map((r) => r.n_createdAt)).toEqual(['2026-07-03', '2026-07-02', '2026-07-01'])
  })

  it('resolves the generic `entity` namespace with a type filter', async () => {
    const { count } = await queryFind(kernel, 'FIND entity AS ?e WHERE ?e.type = "notification"')
    expect(count).toBe(3)
  })

  it('applies numeric inequality filters', async () => {
    const { rows } = await queryFind(kernel, 'FIND task AS ?t WHERE ?t.priority >= 5 RETURN ?t')
    expect(rows).toEqual([{ t: 't1' }])
  })
})
