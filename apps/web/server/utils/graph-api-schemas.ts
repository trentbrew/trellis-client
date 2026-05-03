import { z } from 'zod'

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
