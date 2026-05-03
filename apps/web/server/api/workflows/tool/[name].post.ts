/**
 * POST /api/workflows/tool/:name
 *
 * Invoke a workflow tool by name with a JSON args payload.
 *
 * Body:  { args?: Record<string, unknown>, agentId?: string, workflowId?: string }
 * Reply: { ok: true, name, result } on success
 *        { ok: false, name, error } on error (200 if tool ran + threw, 4xx for bad request)
 *
 * Admin-gating is a future concern — right now any caller inside the workspace
 * can invoke tools. When auth middleware is wired for workflows, restrict here.
 */

import { invokeWorkflowTool, listWorkflowTools } from '../../../utils/workflow-tools'
import { parseApiBody, parseApiRouterParams } from '../../../utils/api-validation'
import { WorkflowToolInvokeBodySchema, WorkflowToolNameParamsSchema } from '../../../utils/workflow-api-schemas'

export default defineEventHandler(async (event) => {
  const { name } = parseApiRouterParams(event, WorkflowToolNameParamsSchema)

  const available = listWorkflowTools()
  if (!available.includes(name)) {
    throw createError({
      statusCode: 404,
      message: `Unknown tool: ${name}. Available: ${available.join(', ')}`,
    })
  }

  const body = await parseApiBody(event, WorkflowToolInvokeBodySchema)

  try {
    const result = await invokeWorkflowTool(name, body.args ?? {}, {
      agentId: body.agentId,
      workflowId: body.workflowId,
    })
    return { ok: true, name, result }
  } catch (err: any) {
    return { ok: false, name, error: err?.message || String(err) }
  }
})
