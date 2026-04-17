/**
 * POST /api/workflows/triggers
 *
 * Create a workflow trigger. Request body mirrors `TriggerCreateInput`.
 *
 * Webhook triggers: `token` is auto-generated if omitted.
 */

import { createTrigger } from '../../../utils/workflow-triggers'
import type { TriggerCreateInput } from '../../../utils/workflow-triggers'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as Partial<TriggerCreateInput> & {
    agentId?: string
  }

  if (!body.workflowId) {
    throw createError({ statusCode: 400, message: '"workflowId" is required' })
  }
  if (!body.graph) {
    throw createError({ statusCode: 400, message: '"graph" snapshot is required' })
  }
  if (!body.kind) {
    throw createError({ statusCode: 400, message: '"kind" is required' })
  }

  try {
    const trigger = await createTrigger(body as TriggerCreateInput, { agentId: body.agentId })
    return { ok: true, trigger }
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      message: err?.message || 'createTrigger failed',
    })
  }
})
