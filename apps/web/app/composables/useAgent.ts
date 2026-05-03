import type { AgentMessage, AgentConversation } from '~/types/agent'

interface ThreadStore {
  activeThreadId: string | null
  threads: Record<string, { meta: AgentConversation; messages: AgentMessage[] }>
}

const STORAGE_KEY = 'agent-threads'

function loadStore(): ThreadStore {
  if (typeof window === 'undefined') return { activeThreadId: null, threads: {} }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as ThreadStore
  } catch (e) {
    console.warn('[useAgent] Failed to load threads:', e)
  }
  return { activeThreadId: null, threads: {} }
}

function saveStore(store: ThreadStore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch (e) {
    console.warn('[useAgent] Failed to save threads:', e)
  }
}

function generateId(): string {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function useAgent() {
  const { user } = useInstantAuth()
  const messages = useState<AgentMessage[]>('agent:messages', () => [])
  const isStreaming = useState<boolean>('agent:isStreaming', () => false)
  const error = useState<string | null>('agent:error', () => null)
  const activeThreadId = useState<string | null>('agent:activeThreadId', () => null)
  const threads = useState<AgentConversation[]>('agent:threads', () => [])

  function syncFromStore() {
    const store = loadStore()
    threads.value = Object.values(store.threads)
      .map((t) => t.meta)
      .sort((a, b) => b.updatedAt - a.updatedAt)
    activeThreadId.value = store.activeThreadId
    if (store.activeThreadId && store.threads[store.activeThreadId]) {
      messages.value = store.threads[store.activeThreadId]!.messages
    } else {
      messages.value = []
    }
  }

  function saveActiveThread() {
    const store = loadStore()
    const id = activeThreadId.value
    if (!id) return
    const existing = store.threads[id]
    if (!existing) return
    existing.messages = messages.value as AgentMessage[]
    existing.meta.updatedAt = Date.now()
    if (!existing.meta.title && messages.value.length > 0) {
      const firstUser = messages.value.find((m) => m.role === 'user')
      if (firstUser) existing.meta.title = firstUser.content.slice(0, 60)
    }
    saveStore(store)
    threads.value = Object.values(store.threads)
      .map((t) => t.meta)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  function createThread() {
    const id = generateId()
    const now = Date.now()
    const meta: AgentConversation = {
      id,
      userId: user.value?.id || 'guest',
      title: undefined,
      createdAt: now,
      updatedAt: now,
    }
    const store = loadStore()
    store.threads[id] = { meta, messages: [] }
    store.activeThreadId = id
    saveStore(store)
    activeThreadId.value = id
    messages.value = []
    error.value = null
    threads.value = Object.values(store.threads)
      .map((t) => t.meta)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  function switchThread(id: string) {
    const store = loadStore()
    if (!store.threads[id]) return
    store.activeThreadId = id
    saveStore(store)
    activeThreadId.value = id
    messages.value = store.threads[id]!.messages
    error.value = null
  }

  function clearConversation() {
    messages.value = []
    error.value = null
    const store = loadStore()
    const id = activeThreadId.value
    if (id && store.threads[id]) {
      store.threads[id]!.messages = []
      saveStore(store)
    }
  }

  async function sendMessage(content: string) {
    const userId = user.value?.id || 'guest'

    // Ensure there's an active thread
    if (!activeThreadId.value) {
      createThread()
    }

    const threadId = activeThreadId.value!

    const userMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      conversationId: threadId,
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    messages.value.push(userMessage)

    const assistantMessage: AgentMessage = {
      id: `msg-${Date.now() + 1}`,
      conversationId: threadId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    messages.value.push(assistantMessage)
    const assistantMessageIndex = messages.value.length - 1

    isStreaming.value = true
    error.value = null

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: threadId,
          userId,
          path: useRoute().path,
        }),
      })

      if (!response.ok) throw new Error(`API error: ${response.statusText}`)
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamDone = false

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        // Keep trailing partial line (boundary may bisect JSON payload).
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (!payload) continue

          let data: any
          try {
            data = JSON.parse(payload)
          } catch {
            console.warn('[useAgent] malformed SSE payload, skipping:', payload.slice(0, 120))
            continue
          }

          if (data.type === 'text') {
            const msg = messages.value[assistantMessageIndex]
            if (msg) msg.content += data.content
          } else if (data.type === 'tool') {
            const msg = messages.value[assistantMessageIndex]
            if (msg) {
              const newToolCall = {
                id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                name: data.tool,
                args: data.args || {},
                result: data.result,
              }
              msg.toolCalls = [...(msg.toolCalls || []), newToolCall]
            }
          } else if (data.type === 'meta') {
            const msg = messages.value[assistantMessageIndex]
            if (msg) {
              const next = { ...(msg.routing || {}) }
              if (data.model) next.model = data.model
              if (data.router) next.router = data.router
              if (data.provider) next.provider = data.provider
              if (data.taskClass) next.taskClass = data.taskClass
              if (data.rationale) next.rationale = data.rationale
              if (data.baseURL) next.baseURL = data.baseURL
              msg.routing = next
            }
          } else if (data.type === 'error') {
            error.value = data.message
          } else if (data.type === 'done') {
            streamDone = true
            break
          }
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to send message'
      console.error('[useAgent] sendMessage error:', err)
    } finally {
      isStreaming.value = false
      saveActiveThread()
    }
  }

  // Load on mount — only once per session (state is shared via useState)
  const hydrated = useState<boolean>('agent:hydrated', () => false)
  if (typeof window !== 'undefined' && !hydrated.value) {
    hydrated.value = true
    syncFromStore()
    // Auto-create an initial thread if none exist
    if (Object.keys(loadStore().threads).length === 0) {
      createThread()
    }
  }

  return {
    messages: readonly(messages),
    threads: readonly(threads),
    activeThreadId: readonly(activeThreadId),
    isStreaming: readonly(isStreaming),
    error: readonly(error),
    sendMessage,
    createThread,
    switchThread,
    clearConversation,
  }
}
