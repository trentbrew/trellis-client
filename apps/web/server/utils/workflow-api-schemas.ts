import { z } from 'zod'

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const OptionalQueryStringSchema = z.preprocess(emptyToUndefined, z.string().optional())
const QueryBooleanSchema = z.preprocess((value) => String(value || '').toLowerCase() === 'true', z.boolean())
const StringRecordSchema = z.record(z.string(), z.unknown())

export const WorkflowNodeKindSchema = z.enum([
  'start',
  'agent',
  'tool',
  'router',
  'guard',
  'memory-read',
  'memory-write',
  'end',
  'note',
])

export const WorkflowPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const WorkflowNodeSchema = z
  .object({
    id: z.string().min(1),
    kind: WorkflowNodeKindSchema,
    position: WorkflowPositionSchema.optional(),
    label: z.string().optional(),
    data: StringRecordSchema.optional(),
  })
  .passthrough()

export const WorkflowEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    label: z.string().optional(),
    condition: z.string().optional(),
  })
  .passthrough()

export const WorkflowGraphSchema = z
  .object({
    nodes: z.array(WorkflowNodeSchema),
    edges: z.array(WorkflowEdgeSchema),
  })
  .passthrough()

export const WorkflowTriggerKindSchema = z.enum(['schedule', 'webhook', 'entity-change'])
export const WorkflowEntityChangeActionSchema = z.enum(['createNode', 'updateNode', 'deleteNode', 'any'])

export const WorkflowTriggerIdParamsSchema = z.object({
  id: z.string().trim().min(1, '"id" required'),
})

export const WorkflowWebhookTokenParamsSchema = z.object({
  token: z.string().trim().min(1, '"token" required'),
})

export const WorkflowToolNameParamsSchema = z.object({
  name: z.string().trim().min(1, 'tool name is required'),
})

export const WorkflowTriggerListQuerySchema = z.object({
  workflowId: OptionalQueryStringSchema,
  kind: z.preprocess(emptyToUndefined, WorkflowTriggerKindSchema.optional()),
  activeOnly: QueryBooleanSchema,
})

export const WorkflowTriggerDeleteQuerySchema = z.object({
  agentId: OptionalQueryStringSchema,
})

export const WorkflowTriggerCreateBodySchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    workflowId: z.string().min(1, '"workflowId" is required'),
    workflowName: z.string().optional(),
    graph: WorkflowGraphSchema,
    kind: WorkflowTriggerKindSchema,
    active: z.boolean().optional(),
    agentId: z.string().optional(),
    ownerId: z.string().optional(),
    orgId: z.string().optional(),
    notifyOnSuccess: z.boolean().optional(),
    cron: z.string().optional(),
    timezone: z.string().optional(),
    token: z.string().optional(),
    watchType: z.string().optional(),
    watchAction: WorkflowEntityChangeActionSchema.optional(),
    watchAttribute: z.string().optional(),
  })
  .passthrough()
  .superRefine((input, ctx) => {
    if (input.kind === 'schedule' && !input.cron) {
      ctx.addIssue({ code: 'custom', path: ['cron'], message: 'schedule triggers require "cron"' })
    }
    if (input.kind === 'entity-change' && !input.watchType) {
      ctx.addIssue({ code: 'custom', path: ['watchType'], message: 'entity-change triggers require "watchType"' })
    }
  })

export const WorkflowTriggerUpdateBodySchema = z
  .object({
    title: z.string().optional(),
    workflowId: z.string().optional(),
    workflowName: z.string().optional(),
    graph: WorkflowGraphSchema.optional(),
    kind: WorkflowTriggerKindSchema.optional(),
    active: z.boolean().optional(),
    agentId: z.string().optional(),
    ownerId: z.string().optional(),
    orgId: z.string().optional(),
    notifyOnSuccess: z.boolean().optional(),
    cron: z.string().optional(),
    timezone: z.string().optional(),
    token: z.string().optional(),
    watchType: z.string().optional(),
    watchAction: WorkflowEntityChangeActionSchema.optional(),
    watchAttribute: z.string().optional(),
    lastFiredAt: z.string().optional(),
    lastRunId: z.string().optional(),
    fireCount: z.number().optional(),
    lastError: z.string().optional(),
  })
  .passthrough()
  .default({})

export const WorkflowTriggerFireBodySchema = z
  .object({
    input: z.unknown().optional(),
    agentId: z.string().optional(),
  })
  .passthrough()
  .default({})

export const WorkflowToolInvokeBodySchema = z
  .object({
    args: StringRecordSchema.optional(),
    agentId: z.string().optional(),
    workflowId: z.string().optional(),
  })
  .passthrough()
  .default({})

export const WorkflowExecuteBodySchema = z
  .object({
    workflowId: z.string().min(1, '"workflowId" is required'),
    workflowName: z.string().optional(),
    graph: WorkflowGraphSchema,
    input: z.unknown().optional(),
    agentId: z.string().optional(),
    skipPersist: z.boolean().optional(),
    defaultModel: z.string().optional(),
    ownerId: z.string().optional(),
    orgId: z.string().optional(),
    notifyOnSuccess: z.boolean().optional(),
  })
  .passthrough()

export const WorkflowWebhookPayloadSchema = z.unknown()
