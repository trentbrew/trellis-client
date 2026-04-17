import type { ToolFn } from '@turtle.tech/tql/graph'

/**
 * Workflow tool registry (client-side factory).
 *
 * Returns a `Record<string, ToolFn>` that the TQL engine can invoke from
 * within a workflow. Each tool is a thin proxy that POSTs to
 * `/api/workflows/tool/:name` so that:
 *
 *   - Secrets (RESEND_API_KEY, etc.) stay on the server.
 *   - The TQL kernel is accessed directly without a second HTTP hop.
 *   - `run_js` runs in a constrained Node `vm`, never the browser.
 *
 * The canonical list of tool names must match `server/utils/workflow-tools.ts`.
 */

export const WORKFLOW_TOOL_NAMES = [
  'http_request',
  'tql_query',
  'tql_load_data',
  'tql_mutate',
  'send_email',
  'send_notification',
  'run_js',
] as const

export type WorkflowToolName = (typeof WORKFLOW_TOOL_NAMES)[number]

export interface CreateWorkflowToolsOptions {
  /** Agent ID to attribute mutations to. Defaults to 'workflow'. */
  agentId?: string
  /** Workflow ID for tracing. */
  workflowId?: string
  /** Override the endpoint base (useful for tests). */
  endpointBase?: string
  /** Optional fetch impl override. */
  fetchImpl?: typeof fetch
}

export function createWorkflowTools(options: CreateWorkflowToolsOptions = {}): Record<string, ToolFn> {
  const base = options.endpointBase ?? '/api/workflows/tool'
  const fetchImpl = options.fetchImpl ?? fetch

  const tools: Record<string, ToolFn> = {}

  for (const name of WORKFLOW_TOOL_NAMES) {
    tools[name] = async (args) => {
      const res = await fetchImpl(`${base}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          args,
          agentId: options.agentId,
          workflowId: options.workflowId,
        }),
      })

      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText)
        throw new Error(`Tool ${name} request failed (${res.status}): ${detail}`)
      }

      const data = (await res.json()) as { ok: boolean; result?: unknown; error?: string }
      if (!data.ok) {
        throw new Error(`Tool ${name} failed: ${data.error || 'unknown error'}`)
      }
      return data.result
    }
  }

  return tools
}

/** Convenience preset for the default agent ID. */
export function createDefaultWorkflowTools(): Record<string, ToolFn> {
  return createWorkflowTools({ agentId: 'workflow' })
}
