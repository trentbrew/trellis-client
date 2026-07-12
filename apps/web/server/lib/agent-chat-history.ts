import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export interface AgentChatHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Cap prior turns so multi-turn chat stays within a reasonable context budget. */
export const AGENT_CHAT_MAX_HISTORY_TURNS = 40
export const AGENT_CHAT_MAX_HISTORY_CHARS = 80_000

export function sanitizeAgentChatHistory(
  history: unknown,
  opts?: { maxTurns?: number; maxChars?: number },
): AgentChatHistoryTurn[] {
  if (!Array.isArray(history)) return []

  const maxTurns = opts?.maxTurns ?? AGENT_CHAT_MAX_HISTORY_TURNS
  const maxChars = opts?.maxChars ?? AGENT_CHAT_MAX_HISTORY_CHARS

  const valid = history.filter(
    (turn): turn is AgentChatHistoryTurn =>
      !!turn
      && typeof turn === 'object'
      && (turn.role === 'user' || turn.role === 'assistant')
      && typeof turn.content === 'string'
      && turn.content.trim().length > 0,
  )

  const selected: AgentChatHistoryTurn[] = []
  let chars = 0

  for (let i = valid.length - 1; i >= 0; i--) {
    const turn = valid[i]!
    if (selected.length >= maxTurns) break
    if (chars + turn.content.length > maxChars && selected.length > 0) break
    selected.unshift(turn)
    chars += turn.content.length
  }

  return selected
}

export function buildAgentChatMessages(
  systemInstruction: string,
  latestUserMessage: string,
  history?: unknown,
): ChatCompletionMessageParam[] {
  const messages = buildAgentChatMessagesFromHistory(systemInstruction, history)
  if (latestUserMessage.trim()) {
    messages.push({ role: 'user', content: latestUserMessage })
  }
  return messages
}

export function buildAgentChatMessagesFromHistory(
  systemInstruction: string,
  history?: unknown,
): ChatCompletionMessageParam[] {
  const prior = sanitizeAgentChatHistory(history)
  const messages: ChatCompletionMessageParam[] = [{ role: 'system', content: systemInstruction }]

  for (const turn of prior) {
    messages.push({ role: turn.role, content: turn.content })
  }

  return messages
}
