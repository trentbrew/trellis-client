import { describe, expect, it } from 'vitest'
import {
  buildAgentChatMessages,
  sanitizeAgentChatHistory,
} from './agent-chat-history'

describe('sanitizeAgentChatHistory', () => {
  it('keeps valid user/assistant turns in order', () => {
    const history = [
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'reply one' },
      { role: 'user', content: 'second' },
    ]

    expect(sanitizeAgentChatHistory(history)).toEqual(history)
  })

  it('drops invalid roles and empty content', () => {
    const history = [
      { role: 'user', content: 'ok' },
      { role: 'function', content: 'ignored' },
      { role: 'assistant', content: '   ' },
      { role: 'assistant', content: 'valid' },
      null,
      { role: 'user', content: 123 },
    ]

    expect(sanitizeAgentChatHistory(history)).toEqual([
      { role: 'user', content: 'ok' },
      { role: 'assistant', content: 'valid' },
    ])
  })

  it('drops oldest turns when over the char budget', () => {
    const history = [
      { role: 'user', content: 'a'.repeat(100) },
      { role: 'assistant', content: 'old reply' },
      { role: 'user', content: 'recent question' },
      { role: 'assistant', content: 'recent reply' },
    ]

    const result = sanitizeAgentChatHistory(history, { maxChars: 50 })
    expect(result).toEqual([
      { role: 'assistant', content: 'old reply' },
      { role: 'user', content: 'recent question' },
      { role: 'assistant', content: 'recent reply' },
    ])
    expect(result.some((t) => t.content === 'a'.repeat(100))).toBe(false)
  })
})

describe('buildAgentChatMessages', () => {
  it('prepends system + history before the latest user turn', () => {
    const messages = buildAgentChatMessages(
      'system prompt',
      'go ahead',
      [
        { role: 'user', content: 'summarize inset hierarchy' },
        { role: 'assistant', content: 'here is a summary…' },
      ],
    )

    expect(messages).toEqual([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'summarize inset hierarchy' },
      { role: 'assistant', content: 'here is a summary…' },
      { role: 'user', content: 'go ahead' },
    ])
  })
})
