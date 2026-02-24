import type { AgentMessage } from '~/types/agent'

export function useAgent() {
  const { user } = useInstantAuth()
  const messages = ref<AgentMessage[]>([])
  const isStreaming = ref(false)
  const conversationId = ref<string | null>(null)
  const error = ref<string | null>(null)

  // Load conversation history from localStorage for now
  // TODO: Persist to InstantDB
  const STORAGE_KEY = 'agent-conversation'

  function loadMessages() {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        messages.value = parsed.messages || []
        conversationId.value = parsed.conversationId || null
      }
    } catch (e) {
      console.warn('[useAgent] Failed to load conversation:', e)
    }
  }

  function saveMessages() {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          conversationId: conversationId.value,
          messages: messages.value,
        })
      )
    } catch (e) {
      console.warn('[useAgent] Failed to save conversation:', e)
    }
  }

  async function sendMessage(content: string) {
    const userId = user.value?.id || 'guest'

    // Add user message locally
    const userMessage: AgentMessage = {
      id: `msg-${Date.now()}`,
      conversationId: conversationId.value || 'default',
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    messages.value.push(userMessage)

    // Initialize assistant message
    const assistantMessage: AgentMessage = {
      id: `msg-${Date.now() + 1}`,
      conversationId: conversationId.value || 'default',
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    messages.value.push(assistantMessage)
    const assistantMessageIndex = messages.value.length - 1

    isStreaming.value = true
    error.value = null

    try {
      // Call streaming API
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          conversationId: conversationId.value,
          userId,
          path: useRoute().path,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      // Parse SSE stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'text') {
              // Append text to assistant message (reactive update)
              const msg = messages.value[assistantMessageIndex]
              if (msg) msg.content += data.content
            } else if (data.type === 'tool') {
              // Store tool execution
              const msg = messages.value[assistantMessageIndex]
              if (msg) {
                const newToolCall = {
                  id: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                  name: data.tool,
                  args: {}, // We don't have args from the stream yet, but we could add them
                  result: data.result
                }
                msg.toolCalls = [...(msg.toolCalls || []), newToolCall]
              }
            } else if (data.type === 'error') {
              error.value = data.message
            } else if (data.type === 'done') {
              // Stream complete
              break
            }
          }
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to send message'
      console.error('[useAgent] sendMessage error:', err)
    } finally {
      isStreaming.value = false
      saveMessages()
    }
  }

  function clearConversation() {
    messages.value = []
    conversationId.value = null
    error.value = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Load on mount
  if (typeof window !== 'undefined') {
    loadMessages()
  }

  return {
    messages: readonly(messages),
    isStreaming: readonly(isStreaming),
    error: readonly(error),
    sendMessage,
    clearConversation,
  }
}
