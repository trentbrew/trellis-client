import { z } from 'zod'

const StringRecordSchema = z.record(z.string(), z.unknown())

const queryLimit = (value: unknown) => {
  const parsed = parseInt(String(value || '10'), 10)
  return Number.isNaN(parsed) || parsed < 0 ? 10 : parsed
}

export const GraphSummaryQuerySchema = z.object({
  limit: z.preprocess(queryLimit, z.number().int().min(0)),
})

export const GraphNodeParamsSchema = z.object({
  entityId: z.string().trim().min(1, 'Missing entity ID'),
})

export const GraphNodesBodySchema = z
  .object({
    ids: z.array(z.string().trim().min(1)).min(1, 'Request body must include "ids" (string[])'),
  })
  .passthrough()

export const GraphQueryBodySchema = z
  .object({
    query: z.string().trim().min(1).optional(),
    projection: z.string().trim().min(1).optional(),
  })
  .passthrough()
  .superRefine((input, ctx) => {
    if (!input.query && !input.projection) {
      ctx.addIssue({
        code: 'custom',
        path: ['query'],
        message: 'Request body must include "query" (EQL-S string) or "projection" (projection ID)',
      })
    }
  })

export const GraphMutateActionSchema = z.enum(['createNode', 'updateNode', 'deleteNode', 'link', 'unlink'])

const GraphMutationStringSchema = z.string().trim().min(1)

const GraphMutateBaseSchema = z
  .object({
    agentId: GraphMutationStringSchema.optional(),
    captureDecision: z.boolean().optional(),
  })
  .passthrough()

export const GraphMutateBodySchema = z.discriminatedUnion('action', [
  GraphMutateBaseSchema.extend({
    action: z.literal('createNode'),
    entityId: GraphMutationStringSchema,
    data: StringRecordSchema.optional(),
    type: GraphMutationStringSchema,
  }),
  GraphMutateBaseSchema.extend({
    action: z.literal('updateNode'),
    entityId: GraphMutationStringSchema,
    data: StringRecordSchema.optional(),
    type: GraphMutationStringSchema,
  }),
  GraphMutateBaseSchema.extend({
    action: z.literal('deleteNode'),
    entityId: GraphMutationStringSchema,
  }),
  GraphMutateBaseSchema.extend({
    action: z.literal('link'),
    e1: GraphMutationStringSchema,
    relation: GraphMutationStringSchema,
    e2: GraphMutationStringSchema,
  }),
  GraphMutateBaseSchema.extend({
    action: z.literal('unlink'),
    e1: GraphMutationStringSchema,
    relation: GraphMutationStringSchema,
    e2: GraphMutationStringSchema,
  }),
])

export const GraphOntologyParamsSchema = z.object({
  ontologyId: z.string().trim().min(1, 'Missing ontology ID'),
})

const GraphOntologyFieldSchema = z
  .object({
    name: z.string().optional(),
  })
  .passthrough()

const GraphOntologySchemaBase = z
  .object({
    '@id': z.string().trim().min(1).optional(),
    '@type': z.string().optional(),
    version: z.string().trim().min(1),
    fields: z.array(GraphOntologyFieldSchema),
  })
  .passthrough()

export const GraphOntologyCreateBodySchema = z
  .object({
    schema: GraphOntologySchemaBase.extend({
      '@id': z.string().trim().min(1),
    }),
    agentId: z.string().trim().min(1).optional(),
  })
  .passthrough()

export const GraphOntologyUpdateBodySchema = z
  .object({
    schema: GraphOntologySchemaBase,
    agentId: z.string().trim().min(1).optional(),
  })
  .passthrough()

export const GraphOntologyDeleteBodySchema = z
  .object({
    agentId: z.string().trim().min(1).optional(),
  })
  .passthrough()
  .default({})
