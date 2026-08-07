import type {
  ChatCompletionChunk,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions'

export interface AccumulatedToolCall {
  id: string
  name: string
  arguments: string
}

/** Merge streamed tool-call deltas; fall back to the final message snapshot. */
export function accumulateStreamedToolCalls(
  chunks: AsyncIterable<ChatCompletionChunk>,
): Promise<{ content: string; toolCalls: AccumulatedToolCall[] }> {
  return (async () => {
    let content = ''
    const byIndex: Record<number, AccumulatedToolCall> = {}
    let finalToolCalls: ChatCompletionMessageToolCall[] | undefined

    for await (const chunk of chunks) {
      const choice = chunk.choices?.[0]
      if (!choice) continue

      const delta = choice.delta
      if (delta?.content) content += delta.content

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0
          if (!byIndex[idx]) byIndex[idx] = { id: '', name: '', arguments: '' }
          if (tc.id) byIndex[idx]!.id = tc.id
          if (tc.function?.name) byIndex[idx]!.name = tc.function.name
          if (tc.function?.arguments) byIndex[idx]!.arguments += tc.function.arguments
        }
      }

      if (choice.message?.tool_calls?.length) {
        finalToolCalls = choice.message.tool_calls
      }
    }

    const streamed = Object.values(byIndex).filter((tc) => tc.id && tc.name)
    if (streamed.length > 0) return { content, toolCalls: streamed }

    const fromFinal: AccumulatedToolCall[] = (finalToolCalls ?? [])
      .filter((tc) => tc.type === 'function' && tc.id && tc.function?.name)
      .map((tc) => ({
        id: tc.id,
        name: tc.function!.name,
        arguments: tc.function!.arguments || '{}',
      }))

    return { content, toolCalls: fromFinal }
  })()
}

export function appendAssistantToolTurn(
  messages: ChatCompletionMessageParam[],
  content: string,
  toolCalls: AccumulatedToolCall[],
) {
  const trimmed = content.trim()
  messages.push({
    role: 'assistant',
    // OpenAI-compatible endpoints reject empty text blocks alongside tool_calls.
    content: trimmed || null,
    tool_calls: toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.name, arguments: tc.arguments || '{}' },
    })),
  })
}

/** OpenAI-compatible endpoints reject assistant messages with empty text + tool_calls. */
export function normalizeMessagesForProvider(
  messages: ChatCompletionMessageParam[],
): ChatCompletionMessageParam[] {
  return messages.map((msg) => {
    if (msg.role !== 'assistant') return msg
    const hasTools = 'tool_calls' in msg && Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0
    if (!hasTools) return msg
    const text = typeof msg.content === 'string' ? msg.content.trim() : ''
    if (text) return msg
    return { ...msg, content: null }
  })
}

export function appendToolResultMessage(
  messages: ChatCompletionMessageParam[],
  toolCallId: string,
  payload: unknown,
) {
  messages.push({
    role: 'tool',
    tool_call_id: toolCallId,
    content: typeof payload === 'string' ? payload : JSON.stringify(payload),
  })
}
