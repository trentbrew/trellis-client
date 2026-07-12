export type AgentMessageRole = 'user' | 'assistant' | 'function'

/**
 * Routing metadata surfaced by the TokenRouter-backed agent endpoint.
 * Populated from `{ type: 'meta' }` SSE events so the UI can show
 * which model handled the turn and why it was selected.
 */
export interface AgentRoutingInfo {
  /** Model identifier passed to TokenRouter (e.g. `anthropic:claude-3-5-sonnet-20241022`, `auto:quality`). */
  model?: string
  /** Routing provider name (e.g. `tokenrouter`). */
  router?: string
  /** Resolved upstream provider if reported by the router (e.g. `anthropic`, `openai`). */
  provider?: string
  /** Short classification label for the request (e.g. `lookup`, `synthesis`, `creative`). */
  taskClass?: string
  /** Human-readable rationale for the routing decision. */
  rationale?: string
  /** Sanitized base URL (host only) — useful for a subtle subtext display. */
  baseURL?: string
}

export interface AgentAttachment {
  id: string
  url: string
  path?: string
  filename: string
  contentType: string
  size: number
  kind: 'image' | 'file'
  /** Graph file entity created when the attachment was added. */
  entityId?: string
}

export interface AgentMessage {
  id: string
  conversationId: string
  role: AgentMessageRole
  content: string
  attachments?: readonly AgentAttachment[]
  toolCalls?: readonly ToolCall[]
  routing?: AgentRoutingInfo
  timestamp: number
}

export interface AgentConversation {
  id: string
  userId: string
  title?: string
  createdAt: number
  updatedAt: number
}

export interface ToolCall {
  name: string
  args: Record<string, any>
  result?: any
}

export interface AgentChatHistoryTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentChatRequest {
  message: string
  attachments?: AgentAttachment[]
  /** Prior turns in the active thread (client-local); server window-truncates. */
  history?: AgentChatHistoryTurn[]
  conversationId?: string
  userId: string
  path?: string
}

export interface AgentAction {
  type: 'navigate' | 'create' | 'view' | 'query'
  label: string
  payload: Record<string, any>
}
