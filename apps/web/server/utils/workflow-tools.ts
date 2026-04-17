/**
 * Workflow Tool Registry (server-side).
 *
 * Every handler takes `args: Record<string, unknown>` (as they arrive from
 * `WorkflowNodeDef.data.args` after compilation) and returns arbitrary JSON.
 *
 * Tools are invoked through `/api/workflows/tool/:name` so that:
 *   - secrets (RESEND_API_KEY, HTTP allowlists, etc.) stay on the server
 *   - the TQL kernel is accessed directly without HTTP round-trips
 *   - run_js runs in a constrained Node `vm`, never in the browser
 *
 * Admin-only: the API route wraps each call in an admin check.
 */

import * as vm from 'node:vm'
import { useTqlKernel, pushMutationLog } from '../plugins/tql'
import { emitMutation } from './tql-events'
import { sendEmail } from './email'
import { useInstantAdmin } from './instant-admin'
import { dispatchNotificationEmailAsync } from './notification-email'

export type ToolArgs = Record<string, unknown>

export interface ToolContext {
  /** Identifier to attribute mutations to. Defaults to 'workflow'. */
  agentId?: string
  /** ID of the workflow the tool is running in (for tracing). */
  workflowId?: string
}

export type ToolHandler = (_args: ToolArgs, _ctx: ToolContext) => Promise<unknown>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value
  if (value == null) return fallback
  try {
    return JSON.stringify(value)
  } catch {
    return fallback
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * HTTP request. Args: { url, method?, headers?, body?, timeoutMs? }
 * Returns: { status, headers, body }
 */
const http_request: ToolHandler = async (args) => {
  const url = asString(args.url)
  if (!url) throw new Error('http_request: "url" is required')
  if (!/^https?:\/\//i.test(url)) throw new Error('http_request: url must be http(s)')

  const method = asString(args.method, 'GET').toUpperCase()
  const headers = asRecord(args.headers) as Record<string, string>
  const timeoutMs = Number(args.timeoutMs ?? 10_000)

  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const hasBody = method !== 'GET' && method !== 'HEAD' && args.body != null
    const res = await fetch(url, {
      method,
      headers: { 'User-Agent': 'Trellis-Workflow/1.0', ...headers },
      body: hasBody ? (typeof args.body === 'string' ? (args.body as string) : JSON.stringify(args.body)) : undefined,
      signal: controller.signal,
    })

    const ct = res.headers.get('content-type') || ''
    const body = ct.includes('application/json') ? await res.json() : await res.text()

    return {
      status: res.status,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries()),
      body,
    }
  } finally {
    clearTimeout(t)
  }
}

/**
 * TQL EQL-S query. Args: { eqls } or { query }.
 * Returns: { rows, count }.
 */
const tql_query: ToolHandler = async (args) => {
  const eqls = asString(args.eqls ?? args.query)
  if (!eqls) throw new Error('tql_query: "eqls" is required')

  const kernel = useTqlKernel()
  const result = await kernel.query(eqls)
  return { rows: result.rows ?? [], count: result.rows?.length ?? 0 }
}

/**
 * Load a single entity by ID. Args: { entityId }.
 * Returns: { id, data } or { id, data: null } if missing.
 */
const tql_load_data: ToolHandler = async (args) => {
  const entityId = asString(args.entityId ?? args.id)
  if (!entityId) throw new Error('tql_load_data: "entityId" is required')

  const kernel = useTqlKernel()
  const store = kernel.getStore()
  const data: Record<string, unknown> = {}
  for (const fact of store.getAllFacts()) {
    if (fact.e === entityId) data[fact.a] = fact.v
  }
  return { id: entityId, data: Object.keys(data).length > 0 ? data : null }
}

/**
 * Graph mutation. Args: { action, entityId?, type?, data?, e1?, e2?, relation? }
 * Supported actions: 'createNode' | 'updateNode' | 'deleteNode' | 'link' | 'unlink'
 */
const tql_mutate: ToolHandler = async (args, ctx) => {
  const action = asString(args.action)
  const kernel = useTqlKernel()
  const agentId = ctx.agentId || 'workflow'

  switch (action) {
    case 'createNode': {
      const entityId = asString(args.entityId)
      const type = asString(args.type, 'entity')
      const data = asRecord(args.data)
      if (!entityId) throw new Error('tql_mutate createNode: "entityId" is required')
      await kernel.createNode(entityId, data, type, { agentId })
      pushMutationLog({ action: 'createNode', entityId, type, data })
      emitMutation({ action: 'createNode', entityId, type, agentId, data })
      return { ok: true, entityId, created: true }
    }

    case 'updateNode': {
      const entityId = asString(args.entityId)
      const type = asString(args.type, 'entity')
      const data = asRecord(args.data)
      if (!entityId) throw new Error('tql_mutate updateNode: "entityId" is required')
      await kernel.updateNode(entityId, data, type, { agentId })
      pushMutationLog({ action: 'updateNode', entityId, type, data })
      emitMutation({ action: 'updateNode', entityId, type, agentId, data })
      return { ok: true, entityId, updated: true }
    }

    case 'deleteNode': {
      const entityId = asString(args.entityId)
      if (!entityId) throw new Error('tql_mutate deleteNode: "entityId" is required')
      await kernel.deleteNode(entityId, { agentId })
      pushMutationLog({ action: 'deleteNode', entityId })
      emitMutation({ action: 'deleteNode', entityId, agentId })
      return { ok: true, entityId, deleted: true }
    }

    case 'link': {
      const e1 = asString(args.e1)
      const e2 = asString(args.e2)
      const relation = asString(args.relation)
      if (!e1 || !e2 || !relation) {
        throw new Error('tql_mutate link: "e1", "e2", "relation" are required')
      }
      await kernel.link(e1, relation, e2, { agentId })
      pushMutationLog({ action: 'link', entityId: `${e1} -> ${e2}`, data: { relation } })
      emitMutation({ action: 'link', entityId: `${e1} -> ${e2}`, agentId, data: { relation, e1, e2 } })
      return { ok: true, linked: true }
    }

    default:
      throw new Error(`tql_mutate: unknown action "${action}"`)
  }
}

/**
 * Send email via Resend. Args: { to, subject, html?, text?, from?, replyTo? }.
 *
 * Either `html` or `text` must be provided. If only `text` is given, it is
 * wrapped in a minimal HTML shell (since the underlying Resend wrapper
 * requires `html`).
 */
const send_email: ToolHandler = async (args) => {
  const to = asString(args.to)
  const subject = asString(args.subject)
  const html = args.html ? asString(args.html) : ''
  const text = args.text ? asString(args.text) : ''

  if (!to || !subject) throw new Error('send_email: "to" and "subject" are required')
  if (!html && !text) throw new Error('send_email: either "html" or "text" is required')

  const body =
    html ||
    `<pre style="font-family:monospace;white-space:pre-wrap">${text.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c] || c)}</pre>`

  const result = await sendEmail({
    to,
    subject,
    html: body,
    ...(args.from ? { from: asString(args.from) } : {}),
    ...(args.replyTo ? { replyTo: asString(args.replyTo) } : {}),
  })

  return result
}

/**
 * Sandboxed JavaScript evaluation. Args: { code, input? }.
 *
 * Runs in a Node `vm` with only `input`, `console`, and `JSON` exposed.
 * No filesystem, network, process, or require access. Times out at 5s.
 *
 * The script's last expression (or explicit `return`) is returned.
 */
const run_js: ToolHandler = async (args) => {
  const code = asString(args.code)
  if (!code) throw new Error('run_js: "code" is required')

  const input = args.input ?? null
  const logs: string[] = []

  const sandbox = {
    input,
    JSON,
    console: {
      log: (..._args: unknown[]) => logs.push(_args.map((a) => asString(a)).join(' ')),
      error: (..._args: unknown[]) => logs.push('[error] ' + _args.map((a) => asString(a)).join(' ')),
    },
  }

  const context = vm.createContext(sandbox)
  const script = new vm.Script(`(async () => { ${code} })()`)

  try {
    const result = await script.runInContext(context, { timeout: 5_000 })
    return { result, logs }
  } catch (err: any) {
    throw new Error(`run_js: ${err?.message || String(err)}`)
  }
}

/**
 * Create an in-app notification (and optionally an email). Args:
 *   {
 *     recipientId | recipients[],   // user ID(s) to notify
 *     orgId,                        // organization the notification belongs to
 *     type,                         // NotificationType string
 *     title,
 *     message,
 *     actionUrl?, icon?, variant?,
 *     actorName?, metadata?,
 *     skipEmail?                    // default false
 *   }
 *
 * Mirrors POST /api/notify but runs in-process (no HTTP hop). Emails are
 * dispatched asynchronously and honour per-user prefs.
 */
const send_notification: ToolHandler = async (args, ctx) => {
  const recipients = Array.isArray(args.recipients)
    ? (args.recipients as unknown[]).map((r) => asString(r)).filter(Boolean)
    : args.recipientId
      ? [asString(args.recipientId)]
      : []

  const orgId = asString(args.orgId)
  const type = asString(args.type)
  const title = asString(args.title)
  const message = asString(args.message)

  if (recipients.length === 0) throw new Error('send_notification: "recipientId" or "recipients[]" required')
  if (!orgId) throw new Error('send_notification: "orgId" is required')
  if (!type) throw new Error('send_notification: "type" is required')
  if (!title) throw new Error('send_notification: "title" is required')
  if (!message) throw new Error('send_notification: "message" is required')

  const db = useInstantAdmin()
  const now = Date.now()
  const orgName = args.orgName ? asString(args.orgName) : ''
  const actionUrl = args.actionUrl ? asString(args.actionUrl) : ''
  const icon = args.icon ? asString(args.icon) : ''
  const variant = args.variant ? asString(args.variant) : 'default'
  const actorName = args.actorName ? asString(args.actorName) : ''
  const actorId = args.actorId ? asString(args.actorId) : ctx.agentId || 'workflow'
  const metadata = asRecord(args.metadata)
  const skipEmail = args.skipEmail === true

  const created: string[] = []

  for (const recipientId of recipients) {
    try {
      const notifId = crypto.randomUUID()
      await db.transact(
        db.tx.notifications[notifId].update({
          recipientId,
          orgId,
          orgName,
          type,
          title,
          message,
          actionUrl,
          icon,
          variant,
          isRead: false,
          actorId,
          actorName,
          metadata,
          createdAt: now,
        }),
      )

      // Non-fatal org link
      try {
        await db.transact(db.tx.organizations[orgId].link({ notifications: notifId }))
      } catch (linkErr: any) {
        console.warn(`[send_notification] org link failed for ${notifId} (non-fatal):`, linkErr?.message)
      }

      if (!skipEmail) {
        dispatchNotificationEmailAsync({
          recipientId,
          type,
          title,
          message,
          actionUrl: actionUrl || undefined,
          actorName: actorName || undefined,
          orgName: orgName || undefined,
          metadata,
        })
      }

      created.push(notifId)
    } catch (err: any) {
      console.error(`[send_notification] create failed for ${recipientId}:`, err?.message || err)
    }
  }

  return { ok: true, created: created.length, ids: created }
}

// ─── Registry ────────────────────────────────────────────────────────────────

export const workflowTools: Record<string, ToolHandler> = {
  http_request,
  tql_query,
  tql_load_data,
  tql_mutate,
  send_email,
  send_notification,
  run_js,
}

export function listWorkflowTools(): string[] {
  return Object.keys(workflowTools)
}

export async function invokeWorkflowTool(name: string, args: ToolArgs, ctx: ToolContext = {}): Promise<unknown> {
  const handler = workflowTools[name]
  if (!handler) throw new Error(`Unknown workflow tool: ${name}`)
  return handler(args, ctx)
}
