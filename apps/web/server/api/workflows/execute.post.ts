/**
 * POST /api/workflows/execute
 *
 * Execute a workflow graph on the server. Persists the run as a
 * `workflow-run` entity unless `skipPersist` is set.
 *
 * Body:
 *   {
 *     workflowId: string          // required — used for entity ID + tracing
 *     workflowName?: string       // human-readable name (shown in run title)
 *     graph: WorkflowGraph        // full compiled graph (nodes + edges)
 *     input?: unknown             // initial input passed to the Start node
 *     agentId?: string            // who triggered this (e.g. 'cron', 'webhook:foo')
 *     skipPersist?: boolean       // dry-run mode
 *     defaultModel?: string       // override default LLM for Agent nodes
 *   }
 *
 * Response:
 *   {
 *     ok: true,
 *     run: WorkflowRunResult      // includes id, status, traces, output, etc.
 *   }
 */

import { executeWorkflow } from '../../utils/workflow-executor'
import type { WorkflowGraph } from '../../utils/workflow-executor'

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as {
    workflowId?: string
    workflowName?: string
    graph?: WorkflowGraph
    input?: unknown
    agentId?: string
    skipPersist?: boolean
    defaultModel?: string
    ownerId?: string
    orgId?: string
    notifyOnSuccess?: boolean
  }

  if (!body?.workflowId || typeof body.workflowId !== 'string') {
    throw createError({ statusCode: 400, message: '"workflowId" is required' })
  }
  if (!body?.graph || !Array.isArray(body.graph.nodes) || !Array.isArray(body.graph.edges)) {
    throw createError({
      statusCode: 400,
      message: '"graph" with { nodes, edges } is required',
    })
  }

  try {
    const run = await executeWorkflow({
      workflowId: body.workflowId,
      workflowName: body.workflowName,
      graph: body.graph,
      input: body.input,
      agentId: body.agentId,
      skipPersist: body.skipPersist,
      defaultModel: body.defaultModel,
      ownerId: body.ownerId,
      orgId: body.orgId,
      notifyOnSuccess: body.notifyOnSuccess,
    })

    return { ok: true, run }
  } catch (err: any) {
    throw createError({
      statusCode: 500,
      message: `executeWorkflow failed: ${err?.message || String(err)}`,
    })
  }
})
