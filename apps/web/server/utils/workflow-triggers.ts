/**
 * Workflow Trigger Registry (server-side).
 *
 * Triggers are stored as `workflow-trigger` entities in the TQL graph. This
 * gives us:
 *   - A single source of truth (both client + server see the same data)
 *   - Persistence across server restarts
 *   - Realtime UI updates via SSE when triggers change
 *
 * Three kinds are supported:
 *   - `schedule`      — cron expression, ticked by the scheduler plugin
 *   - `webhook`       — URL token, fired by POST /api/workflows/webhook/:token
 *   - `entity-change` — matches TQL mutations against a filter
 *
 * Each trigger caches a snapshot of the workflow graph (`graphJson`) so the
 * server can execute it without touching InstantDB. The snapshot is refreshed
 * whenever the trigger is updated.
 */

import { randomUUID } from 'node:crypto'
import { useTqlKernel, pushMutationLog } from '../plugins/tql'
import { emitMutation } from './tql-events'
import type { WorkflowGraph } from './workflow-executor'

// ─── Types ───────────────────────────────────────────────────────────────────

export type TriggerKind = 'schedule' | 'webhook' | 'entity-change'

export type EntityChangeAction = 'createNode' | 'updateNode' | 'deleteNode' | 'any'

export interface TriggerEntity {
  /** Entity ID (e.g. `entity:trigger-abc123`). */
  id: string
  /** Display title. */
  title: string
  /** InstantDB workflow ID this trigger fires. */
  workflowId: string
  /** Cached workflow name (for UI/logs — kept fresh on updates). */
  workflowName?: string
  /** Cached workflow graph snapshot. Server uses this to run without InstantDB. */
  graph: WorkflowGraph
  /** Trigger kind. */
  kind: TriggerKind
  /** Whether this trigger is enabled. */
  active: boolean
  /** Agent ID used when the trigger fires (defaults to `trigger:<kind>`). */
  agentId?: string

  // Schedule kind
  cron?: string
  timezone?: string

  // Webhook kind
  token?: string

  // Entity-change kind
  watchType?: string
  watchAction?: EntityChangeAction
  watchAttribute?: string

  // Tracking
  lastFiredAt?: string
  lastRunId?: string
  fireCount?: number
  lastError?: string

  // Timestamps (ms since epoch)
  createdAt: number
  updatedAt: number
}

export type TriggerCreateInput = Omit<
  TriggerEntity,
  'id' | 'createdAt' | 'updatedAt' | 'lastFiredAt' | 'lastRunId' | 'fireCount' | 'lastError'
> & {
  /** Optional explicit ID — otherwise auto-generated. */
  id?: string
}

export type TriggerUpdateInput = Partial<Omit<TriggerEntity, 'id' | 'createdAt' | 'updatedAt'>>

// ─── Serialization ───────────────────────────────────────────────────────────

const GRAPH_FIELD = 'graphJson'

function serializeTrigger(trigger: TriggerEntity): Record<string, unknown> {
  const stored: Record<string, unknown> = {
    type: 'workflow-trigger',
    title: trigger.title,
    workflowId: trigger.workflowId,
    kind: trigger.kind,
    active: trigger.active,
    createdAt: trigger.createdAt,
    updatedAt: trigger.updatedAt,
    [GRAPH_FIELD]: JSON.stringify(trigger.graph),
  }
  if (trigger.workflowName) stored.workflowName = trigger.workflowName
  if (trigger.agentId) stored.agentId = trigger.agentId

  if (trigger.cron) stored.cron = trigger.cron
  if (trigger.timezone) stored.timezone = trigger.timezone
  if (trigger.token) stored.token = trigger.token
  if (trigger.watchType) stored.watchType = trigger.watchType
  if (trigger.watchAction) stored.watchAction = trigger.watchAction
  if (trigger.watchAttribute) stored.watchAttribute = trigger.watchAttribute

  if (trigger.lastFiredAt) stored.lastFiredAt = trigger.lastFiredAt
  if (trigger.lastRunId) stored.lastRunId = trigger.lastRunId
  if (typeof trigger.fireCount === 'number') stored.fireCount = trigger.fireCount
  if (trigger.lastError) stored.lastError = trigger.lastError

  return stored
}

function deserializeTrigger(id: string, raw: Record<string, unknown>): TriggerEntity | null {
  if (!raw || raw.type !== 'workflow-trigger') return null

  let graph: WorkflowGraph = { nodes: [], edges: [] }
  const graphJson = raw[GRAPH_FIELD]
  if (typeof graphJson === 'string') {
    try {
      const parsed = JSON.parse(graphJson)
      if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
        graph = parsed
      }
    } catch {
      // leave default empty graph
    }
  }

  return {
    id,
    title: (raw.title as string) || 'Untitled Trigger',
    workflowId: (raw.workflowId as string) || '',
    workflowName: (raw.workflowName as string) || undefined,
    graph,
    kind: ((raw.kind as TriggerKind) || 'schedule') as TriggerKind,
    active: Boolean(raw.active),
    agentId: (raw.agentId as string) || undefined,
    cron: (raw.cron as string) || undefined,
    timezone: (raw.timezone as string) || undefined,
    token: (raw.token as string) || undefined,
    watchType: (raw.watchType as string) || undefined,
    watchAction: (raw.watchAction as EntityChangeAction) || undefined,
    watchAttribute: (raw.watchAttribute as string) || undefined,
    lastFiredAt: (raw.lastFiredAt as string) || undefined,
    lastRunId: (raw.lastRunId as string) || undefined,
    fireCount: typeof raw.fireCount === 'number' ? (raw.fireCount as number) : undefined,
    lastError: (raw.lastError as string) || undefined,
    createdAt: typeof raw.createdAt === 'number' ? (raw.createdAt as number) : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? (raw.updatedAt as number) : Date.now(),
  }
}

// ─── Listeners (for scheduler / webhook / entity-change integrations) ────────

type TriggerEventKind = 'create' | 'update' | 'delete'
type TriggerListener = (_event: { kind: TriggerEventKind; trigger: TriggerEntity | null; id: string }) => void

const _listeners: Set<TriggerListener> = new Set()

export function onTriggerChange(listener: TriggerListener): () => void {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

function notifyListeners(kind: TriggerEventKind, id: string, trigger: TriggerEntity | null) {
  for (const listener of _listeners) {
    try {
      listener({ kind, id, trigger })
    } catch (err) {
      console.error('[workflow-triggers] listener error:', err)
    }
  }
}

// ─── Kernel helpers ──────────────────────────────────────────────────────────

function loadEntityFacts(entityId: string): Record<string, unknown> | null {
  const kernel = useTqlKernel()
  const store = kernel.getStore()
  const data: Record<string, unknown> = {}
  for (const fact of store.getAllFacts()) {
    if (fact.e === entityId) data[fact.a] = fact.v
  }
  return Object.keys(data).length > 0 ? data : null
}

function generateTriggerId(): string {
  return `entity:trigger-${randomUUID().replace(/-/g, '').slice(0, 16)}`
}

function generateWebhookToken(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 16)
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function listTriggers(filter?: {
  workflowId?: string
  kind?: TriggerKind
  activeOnly?: boolean
}): Promise<TriggerEntity[]> {
  const kernel = useTqlKernel()
  const store = kernel.getStore()

  const triggersById = new Map<string, Record<string, unknown>>()
  for (const fact of store.getAllFacts()) {
    if (!fact.e.startsWith('entity:trigger-')) continue
    let bag = triggersById.get(fact.e)
    if (!bag) {
      bag = {}
      triggersById.set(fact.e, bag)
    }
    bag[fact.a] = fact.v
  }

  const out: TriggerEntity[] = []
  for (const [id, raw] of triggersById.entries()) {
    const trigger = deserializeTrigger(id, raw)
    if (!trigger) continue
    if (filter?.workflowId && trigger.workflowId !== filter.workflowId) continue
    if (filter?.kind && trigger.kind !== filter.kind) continue
    if (filter?.activeOnly && !trigger.active) continue
    out.push(trigger)
  }
  out.sort((a, b) => b.createdAt - a.createdAt)
  return out
}

export async function getTrigger(id: string): Promise<TriggerEntity | null> {
  const raw = loadEntityFacts(id)
  if (!raw) return null
  return deserializeTrigger(id, raw)
}

export async function createTrigger(
  input: TriggerCreateInput,
  opts: { agentId?: string } = {},
): Promise<TriggerEntity> {
  if (!input.workflowId) throw new Error('createTrigger: "workflowId" is required')
  if (!input.graph || !Array.isArray(input.graph.nodes) || !Array.isArray(input.graph.edges)) {
    throw new Error('createTrigger: "graph" must include nodes[] and edges[]')
  }
  if (!['schedule', 'webhook', 'entity-change'].includes(input.kind)) {
    throw new Error(`createTrigger: unknown kind "${input.kind}"`)
  }

  if (input.kind === 'schedule' && !input.cron) {
    throw new Error('createTrigger: schedule triggers require "cron"')
  }
  if (input.kind === 'entity-change' && !input.watchType) {
    throw new Error('createTrigger: entity-change triggers require "watchType"')
  }

  const now = Date.now()
  const id = input.id || generateTriggerId()

  const trigger: TriggerEntity = {
    id,
    title: input.title || `${input.kind} trigger`,
    workflowId: input.workflowId,
    workflowName: input.workflowName,
    graph: input.graph,
    kind: input.kind,
    active: input.active ?? true,
    agentId: input.agentId,
    cron: input.cron,
    timezone: input.timezone,
    token: input.kind === 'webhook' ? input.token || generateWebhookToken() : input.token,
    watchType: input.watchType,
    watchAction: input.watchAction,
    watchAttribute: input.watchAttribute,
    createdAt: now,
    updatedAt: now,
    fireCount: 0,
  }

  const kernel = useTqlKernel()
  const stored = serializeTrigger(trigger)
  const agentId = opts.agentId || 'workflow-trigger'
  await kernel.createNode(id, stored, 'entity', { agentId })
  pushMutationLog({ action: 'createNode', entityId: id, type: 'entity', data: stored })
  emitMutation({ action: 'createNode', entityId: id, type: 'entity', agentId, data: stored })

  notifyListeners('create', id, trigger)
  return trigger
}

export async function updateTrigger(
  id: string,
  patch: TriggerUpdateInput,
  opts: { agentId?: string } = {},
): Promise<TriggerEntity> {
  const existing = await getTrigger(id)
  if (!existing) throw new Error(`updateTrigger: "${id}" not found`)

  const next: TriggerEntity = {
    ...existing,
    ...patch,
    id,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  }

  const kernel = useTqlKernel()
  const stored = serializeTrigger(next)
  const agentId = opts.agentId || 'workflow-trigger'
  await kernel.updateNode(id, stored, 'entity', { agentId })
  pushMutationLog({ action: 'updateNode', entityId: id, type: 'entity', data: stored })
  emitMutation({ action: 'updateNode', entityId: id, type: 'entity', agentId, data: stored })

  notifyListeners('update', id, next)
  return next
}

export async function deleteTrigger(id: string, opts: { agentId?: string } = {}): Promise<void> {
  const existing = await getTrigger(id)
  if (!existing) return

  const kernel = useTqlKernel()
  const agentId = opts.agentId || 'workflow-trigger'
  await kernel.deleteNode(id, { agentId })
  pushMutationLog({ action: 'deleteNode', entityId: id })
  emitMutation({ action: 'deleteNode', entityId: id, agentId })

  notifyListeners('delete', id, existing)
}

/** Update only the tracking fields after a trigger fires (non-announcing). */
export async function recordTriggerFire(id: string, result: { runId?: string; error?: string }): Promise<void> {
  const existing = await getTrigger(id)
  if (!existing) return
  await updateTrigger(
    id,
    {
      lastFiredAt: new Date().toISOString(),
      lastRunId: result.runId,
      fireCount: (existing.fireCount || 0) + 1,
      lastError: result.error,
    },
    { agentId: 'workflow-trigger' },
  )
}

// ─── Lookups specific to kinds ───────────────────────────────────────────────

export async function findWebhookTrigger(token: string): Promise<TriggerEntity | null> {
  if (!token) return null
  const all = await listTriggers({ kind: 'webhook', activeOnly: true })
  return all.find((t) => t.token === token) || null
}
