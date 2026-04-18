/**
 * Graph Notifier
 *
 * Subscribes to TQL mutation events and emits in-app notifications for
 * interesting graph activity. First-pass signals:
 *
 *   1. Task completion        → success  "Task completed: {title}"
 *   2. Bulk ops (update/delete) → ops     "Bulk update affected N entities"
 *   3. Agent-created entities → info    "{agent} created {type}: {title}"
 *
 * Anti-patterns handled:
 *   - Skips mutations whose type is `notification` (prevents self-notify loops).
 *   - Skips mutations originating from `*-notifier` agents (other plugins).
 *   - Debounces per (agent, type) so a Gmail/Calendar sync that creates 20
 *     entities in a burst emits one grouped notification instead of 20.
 */

import { onMutation, type MutationEvent } from '../utils/tql-events'
import { createNotification } from '../utils/notification-service'
import { NOTIFICATION_NAMESPACE } from '../utils/tql-ontologies'
import { useTqlKernel } from './tql'
import { ENTITY_NAMESPACE } from '../../app/lib/tql-namespace'

const COMPLETED_STATUSES = new Set(['done', 'completed', 'complete', 'closed'])
const AGENT_BURST_WINDOW_MS = 10_000
const AGENT_BURST_FLUSH_MS = 4_000

// Agents whose mutations should NEVER fire user-facing notifications
// (system/automation internals — already surface through their own channels).
const SILENT_AGENTS = new Set<string>([
  'system',
  'graph-notifier',
  'gmail-notifier',
  'calendar-notifier',
  'job-notifier',
  'ops-notifier',
  'workflow-server', // workflow completions emit their own richer notification
])

// ─── Helpers ───────────────────────────────────────────────────────────────

function isEntityType(type: string | undefined): boolean {
  return !!type && type === ENTITY_NAMESPACE
}

function getEntityTitle(entityId: string): string | null {
  try {
    const kernel = useTqlKernel()
    const facts = kernel.getStore().getFactsByEntity(entityId)
    const title = facts.find((f: any) => f.a === 'title')?.v as string | undefined
    return title && typeof title === 'string' ? title : null
  } catch {
    return null
  }
}

function getEntityField(entityId: string, attr: string): any {
  try {
    const kernel = useTqlKernel()
    const facts = kernel.getStore().getFactsByEntity(entityId)
    return facts.find((f: any) => f.a === attr)?.v
  } catch {
    return undefined
  }
}

// ─── Handlers ──────────────────────────────────────────────────────────────

async function handleTaskCompletion(ev: MutationEvent): Promise<void> {
  if (ev.action !== 'updateNode') return
  if (!isEntityType(ev.type)) return
  const patch = ev.data || {}
  if (!('taskStatus' in patch)) return
  const nextStatus = String(patch.taskStatus || '').toLowerCase()
  if (!COMPLETED_STATUSES.has(nextStatus)) return

  const entityId = ev.entityId
  if (!entityId) return

  // Only notify for real tasks (defensive — the patch doesn't tell us the type).
  const entityType = getEntityField(entityId, 'type')
  if (entityType && entityType !== 'task') return

  const title = getEntityTitle(entityId) || 'Task'
  await createNotification(
    {
      title: 'Task completed',
      body: title,
      kind: 'success',
      source: 'graph',
      sourceId: `task-done:${entityId}:${ev.id}`,
      priority: 'low',
      entityId,
      entityType: 'task',
      url: `#${entityId}`,
      actions: [
        { id: 'open', kind: 'link', label: 'Open', icon: 'lucide:external-link', target: `#${entityId}` },
        { id: 'dismiss', kind: 'dismiss', label: 'Dismiss', icon: 'lucide:x' },
      ],
      metadata: { agentId: ev.agentId, entityId },
      groupKey: `task-done:${entityId}`,
    },
    { agentId: 'graph-notifier' },
  )
}

async function handleBulkOp(ev: MutationEvent): Promise<void> {
  if (ev.action !== 'bulkUpdate' && ev.action !== 'bulkDelete') return
  const isDelete = ev.action === 'bulkDelete'
  const count = Number(ev.data?.updated ?? ev.data?.deleted ?? 0)
  if (!count) return

  await createNotification(
    {
      title: isDelete ? 'Bulk delete' : 'Bulk update',
      body: `${count} ${count === 1 ? 'entity' : 'entities'} ${isDelete ? 'deleted' : 'updated'}`,
      kind: isDelete ? 'warning' : 'ops',
      source: 'ops',
      sourceId: `${ev.action}:${ev.id}`,
      priority: isDelete ? 'high' : 'normal',
      actions: [{ id: 'dismiss', kind: 'dismiss', label: 'Dismiss', icon: 'lucide:x' }],
      metadata: { agentId: ev.agentId, count, query: ev.data?.query },
    },
    { agentId: 'graph-notifier' },
  )
}

// ─── Agent-burst debouncer ────────────────────────────────────────────────
// Groups rapid-fire createNode events from a single agent so we emit one
// summary notification instead of flooding the bell.

interface BurstState {
  firstEventAt: number
  lastEventAt: number
  entityIds: string[]
  entityTypes: Map<string, number>
  flushTimer: ReturnType<typeof setTimeout> | null
}

const _bursts = new Map<string, BurstState>()

function recordAgentCreate(ev: MutationEvent): void {
  if (ev.action !== 'createNode') return
  if (!isEntityType(ev.type)) return
  if (!ev.agentId || SILENT_AGENTS.has(ev.agentId)) return
  if (ev.agentId === 'browser') return // User-initiated creates — don't notify self
  const entityId = ev.entityId
  if (!entityId) return

  const key = ev.agentId
  const now = Date.now()
  let state = _bursts.get(key)
  if (!state || now - state.lastEventAt > AGENT_BURST_WINDOW_MS) {
    if (state?.flushTimer) clearTimeout(state.flushTimer)
    state = {
      firstEventAt: now,
      lastEventAt: now,
      entityIds: [],
      entityTypes: new Map(),
      flushTimer: null,
    }
    _bursts.set(key, state)
  }

  state.lastEventAt = now
  state.entityIds.push(entityId)
  const typeValue = (ev.data?.type as string | undefined) || 'entity'
  state.entityTypes.set(typeValue, (state.entityTypes.get(typeValue) || 0) + 1)

  if (state.flushTimer) clearTimeout(state.flushTimer)
  state.flushTimer = setTimeout(() => {
    flushAgentBurst(key).catch((err) => console.error('[graph-notifier] flush burst failed:', err))
  }, AGENT_BURST_FLUSH_MS)
}

async function flushAgentBurst(agent: string): Promise<void> {
  const state = _bursts.get(agent)
  if (!state) return
  _bursts.delete(agent)
  if (state.flushTimer) clearTimeout(state.flushTimer)

  const count = state.entityIds.length
  if (count === 0) return

  // Build a friendly summary
  const typeSummary = [...state.entityTypes.entries()]
    .map(([type, n]) => `${n} ${type}${n === 1 ? '' : 's'}`)
    .join(', ')

  const firstId = state.entityIds[0]!
  const firstTitle = count === 1 ? getEntityTitle(firstId) : null

  await createNotification(
    {
      title: count === 1 ? `${agent} created ${firstTitle || 'an entity'}` : `${agent} created ${count} entities`,
      body: count === 1 && firstTitle ? undefined : typeSummary,
      kind: 'info',
      source: agent.includes('sync') || agent.includes('notifier') ? 'job' : 'ai',
      sourceId: `agent-burst:${agent}:${state.firstEventAt}`,
      priority: 'low',
      entityId: count === 1 ? firstId : undefined,
      url: count === 1 ? `#${firstId}` : undefined,
      actions:
        count === 1
          ? [
              { id: 'open', kind: 'link', label: 'Open', icon: 'lucide:external-link', target: `#${firstId}` },
              { id: 'dismiss', kind: 'dismiss', label: 'Dismiss', icon: 'lucide:x' },
            ]
          : [{ id: 'dismiss', kind: 'dismiss', label: 'Dismiss', icon: 'lucide:x' }],
      metadata: { agentId: agent, count, entityIds: state.entityIds.slice(0, 10) },
      groupKey: `agent:${agent}`,
    },
    { agentId: 'graph-notifier' },
  )
}

// ─── Master dispatcher ────────────────────────────────────────────────────

function shouldIgnore(ev: MutationEvent): boolean {
  // Skip notification-namespace mutations (prevents self-loops)
  if (ev.type === NOTIFICATION_NAMESPACE) return true
  // Skip internal notifier agents
  if (ev.agentId && SILENT_AGENTS.has(ev.agentId)) return true
  return false
}

async function onEvent(ev: MutationEvent): Promise<void> {
  if (shouldIgnore(ev)) return

  try {
    await handleTaskCompletion(ev)
  } catch (err) {
    console.error('[graph-notifier] task-completion handler failed:', err)
  }

  try {
    await handleBulkOp(ev)
  } catch (err) {
    console.error('[graph-notifier] bulk-op handler failed:', err)
  }

  try {
    recordAgentCreate(ev)
  } catch (err) {
    console.error('[graph-notifier] agent-create handler failed:', err)
  }
}

// ─── Plugin ────────────────────────────────────────────────────────────────

export default defineNitroPlugin((nitroApp) => {
  const unsubscribe = onMutation((ev) => {
    void onEvent(ev)
  })

  nitroApp.hooks.hook('close', () => {
    unsubscribe()
    for (const [, state] of _bursts) {
      if (state.flushTimer) clearTimeout(state.flushTimer)
    }
    _bursts.clear()
  })

  console.log('[graph-notifier] subscribed to mutation stream')
})
