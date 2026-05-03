// @vitest-environment node

import { describe, it, expect } from 'vitest'
import {
  WorkflowExecuteBodySchema,
  WorkflowToolInvokeBodySchema,
  WorkflowTriggerCreateBodySchema,
  WorkflowTriggerListQuerySchema,
} from './workflow-api-schemas'

const graph = {
  nodes: [{ id: 'start', kind: 'start' }],
  edges: [],
}

describe('workflow-api-schemas', () => {
  it('accepts a minimal executable workflow graph body', () => {
    const result = WorkflowExecuteBodySchema.parse({
      workflowId: 'workflow-1',
      graph,
    })

    expect(result.workflowId).toBe('workflow-1')
    expect(result.graph.nodes).toHaveLength(1)
  })

  it('rejects execute requests without a graph', () => {
    const result = WorkflowExecuteBodySchema.safeParse({ workflowId: 'workflow-1' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0]?.path).toEqual(['graph'])
  })

  it('normalizes trigger list query filters', () => {
    expect(
      WorkflowTriggerListQuerySchema.parse({
        workflowId: ' workflow-1 ',
        kind: 'webhook',
        activeOnly: 'TRUE',
      }),
    ).toEqual({
      workflowId: 'workflow-1',
      kind: 'webhook',
      activeOnly: true,
    })
  })

  it('enforces kind-specific trigger requirements', () => {
    const schedule = WorkflowTriggerCreateBodySchema.safeParse({
      workflowId: 'workflow-1',
      kind: 'schedule',
      graph,
    })
    const entityChange = WorkflowTriggerCreateBodySchema.safeParse({
      workflowId: 'workflow-1',
      kind: 'entity-change',
      graph,
    })

    expect(schedule.success).toBe(false)
    expect(entityChange.success).toBe(false)
    if (!schedule.success) expect(schedule.error.issues[0]?.path).toEqual(['cron'])
    if (!entityChange.success) expect(entityChange.error.issues[0]?.path).toEqual(['watchType'])
  })

  it('defaults empty workflow tool bodies to an empty object', () => {
    expect(WorkflowToolInvokeBodySchema.parse(undefined)).toEqual({})
  })
})
