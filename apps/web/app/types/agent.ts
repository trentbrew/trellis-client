export type AgentMessageRole = 'user' | 'assistant' | 'function'

export interface AgentMessage {
  id: string
  conversationId: string
  role: AgentMessageRole
  content: string
  toolCalls?: readonly ToolCall[]
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

export interface AgentChatRequest {
  message: string
  conversationId?: string
  userId: string
}

export interface AgentAction {
  type: 'navigate' | 'create' | 'view' | 'query'
  label: string
  payload: Record<string, any>
}
