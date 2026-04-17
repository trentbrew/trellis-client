/**
 * POST /api/workflows/triggers/:id/fire
 *
 * Manually fire a trigger for testing. Bypasses cron matching / webhook token
 * and runs the cached graph with an optional input payload.
 */

import { getTrigger, recordTriggerFire } from '../../../../utils/workflow-triggers'
import { executeWorkflow } from '../../../../utils/workflow-executor'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: '"id" required' })

  const trigger = await getTrigger(id)
  if (!trigger) throw createError({ statusCode: 404, message: `Trigger ${id} not found` })

  const body = (await readBody(event).catch(() => ({}))) as {
    input?: unknown
    agentId?: string
  }

  const agentId = body.agentId || trigger.agentId || `trigger:${trigger.kind}:manual`
  const input = body.input ?? {
    trigger: {
      id: trigger.id,
      kind: trigger.kind,
      manual: true,
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
      ownerId: trigger.ownerId,
      orgId: trigger.orgId,
      notifyOnSuccess: trigger.notifyOnSuccess,
    })
    await recordTriggerFire(trigger.id, {
      runId: run.id,
      error: run.status === 'failed' ? run.error || 'run failed' : undefined,
    })
    return { ok: true, run }
  } catch (err: any) {
    const msg = err?.message || String(err)
    await recordTriggerFire(trigger.id, { error: msg }).catch(() => {})
    throw createError({ statusCode: 500, message: `Trigger fire failed: ${msg}` })
  }
})
