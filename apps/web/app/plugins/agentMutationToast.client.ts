/**
 * Surfaces lightweight toasts when external agents (MCP, CLI, etc.)
 * mutate the graph — distinct from browser-initiated edits (agentId: browser).
 */
import { toast } from 'vue-sonner'
import { useSSESubscribe } from '~/composables/useTrellisSSE'
import {
  formatMutationToast,
  shouldToastMutation,
  type MutationToastPayload,
} from '~/lib/agent-mutation-toast'

const FLUSH_MS = 900

interface BurstState {
  agentId: string
  events: MutationToastPayload[]
  timer: ReturnType<typeof setTimeout> | null
}

const bursts = new Map<string, BurstState>()

function flushBurst(agentId: string) {
  const state = bursts.get(agentId)
  if (!state) return
  bursts.delete(agentId)
  if (state.timer) clearTimeout(state.timer)

  const events = state.events
  if (events.length === 0) return

  if (events.length === 1) {
    const { title, description, kind } = formatMutationToast(events[0]!)
    if (kind === 'success') toast.success(title, { description })
    else if (kind === 'warning') toast.warning(title, { description })
    else toast.info(title, { description })
    return
  }

  const agent = formatMutationToast(events[0]!).title.split(' ')[0] || 'Agent'
  toast.info(`${agent} made ${events.length} graph changes`, {
    description: 'Open Activity or the affected browse view to review.',
  })
}

function queueMutation(payload: MutationToastPayload) {
  const agentId = payload.agentId!
  let state = bursts.get(agentId)
  if (!state) {
    state = { agentId, events: [], timer: null }
    bursts.set(agentId, state)
  }

  state.events.push(payload)
  if (state.timer) clearTimeout(state.timer)
  state.timer = setTimeout(() => flushBurst(agentId), FLUSH_MS)
}

export default defineNuxtPlugin(() => {
  useSSESubscribe('mutation', (event) => {
    try {
      const payload = JSON.parse(event.data || '{}') as MutationToastPayload
      if (!shouldToastMutation(payload)) return
      queueMutation(payload)
    } catch {
      // ignore malformed SSE payloads
    }
  })
})
