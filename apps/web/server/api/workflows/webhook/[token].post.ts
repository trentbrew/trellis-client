/**
 * POST /api/workflows/webhook/:token
 *
 * Fire a webhook trigger identified by its URL-safe token. The request body
 * is passed to the workflow as input (wrapped under `trigger.payload`).
 *
 * Tokens are generated at trigger creation. Anyone with the token can fire
 * the workflow, so treat them like secrets.
 */

import { findWebhookTrigger, recordTriggerFire } from '../../../utils/workflow-triggers'
import { executeWorkflow } from '../../../utils/workflow-executor'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, message: '"token" required' })

  const trigger = await findWebhookTrigger(token)
  if (!trigger) {
    throw createError({ statusCode: 404, message: 'Webhook trigger not found or disabled' })
  }

  const payload = await readBody(event).catch(() => null)
  const headers = getRequestHeaders(event)
  const method = event.method

  const agentId = trigger.agentId || 'trigger:webhook'
  const input = {
    trigger: {
      id: trigger.id,
      kind: 'webhook' as const,
      token,
      method,
      headers,
      payload,
      firedAt: new Date().toISOString(),
    },
  }

  try {
    const run = await executeWorkflow({
      workflowId: trigger.workflowId,
      workflowName: trigger.workflowName,
      graph: trigger.graph,
      input,
      agentId,
    })
    await recordTriggerFire(trigger.id, {
      runId: run.id,
      error: run.status === 'failed' ? run.error || 'run failed' : undefined,
    })
    return { ok: true, runId: run.id, status: run.status, stepCount: run.stepCount }
  } catch (err: any) {
    const msg = err?.message || String(err)
    await recordTriggerFire(trigger.id, { error: msg }).catch(() => {})
    throw createError({ statusCode: 500, message: `Webhook execution failed: ${msg}` })
  }
})
