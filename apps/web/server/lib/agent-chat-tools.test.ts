import { describe, expect, it } from 'vitest'
import type { ChatCompletionChunk, ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import {
  accumulateStreamedToolCalls,
  appendAssistantToolTurn,
  normalizeMessagesForProvider,
} from './agent-chat-tools'

async function* chunksFrom(parts: ChatCompletionChunk[]) {
  for (const part of parts) yield part
}

describe('accumulateStreamedToolCalls', () => {
  it('merges streamed deltas into one tool call', async () => {
    const stream = chunksFrom([
      {
        choices: [{
          delta: { content: 'Creating ' },
        }],
      },
      {
        choices: [{
          delta: {
            tool_calls: [{ index: 0, id: 'toolu_abc', function: { name: 'createEntity' } }],
          },
        }],
      },
      {
        choices: [{
          delta: {
            tool_calls: [{ index: 0, function: { arguments: '{"type":"note"}' } }],
          },
          finish_reason: 'tool_calls',
        }],
      },
    ] as ChatCompletionChunk[])

    const result = await accumulateStreamedToolCalls(stream)
    expect(result.content).toBe('Creating ')
    expect(result.toolCalls).toEqual([
      { id: 'toolu_abc', name: 'createEntity', arguments: '{"type":"note"}' },
    ])
  })

  it('falls back to final message tool_calls when deltas are empty', async () => {
    const stream = chunksFrom([
      {
        choices: [{
          message: {
            role: 'assistant',
            content: '',
            tool_calls: [{
              id: 'toolu_final',
              type: 'function',
              function: { name: 'getGraphSummary', arguments: '{}' },
            }],
          },
          finish_reason: 'tool_calls',
        }],
      },
    ] as ChatCompletionChunk[])

    const result = await accumulateStreamedToolCalls(stream)
    expect(result.toolCalls).toEqual([
      { id: 'toolu_final', name: 'getGraphSummary', arguments: '{}' },
    ])
  })
})

describe('appendAssistantToolTurn', () => {
  it('uses null content for tool-only assistant turns', () => {
    const messages: ChatCompletionMessageParam[] = []
    appendAssistantToolTurn(messages, '  ', [{ id: 'toolu_x', name: 'createEntity', arguments: '{}' }])
    expect(messages[0]).toMatchObject({ role: 'assistant', content: null })
  })
})

describe('normalizeMessagesForProvider', () => {
  it('normalizes empty assistant text before follow-up requests', () => {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'toolu_x', type: 'function', function: { name: 'createEntity', arguments: '{}' } }],
      },
      { role: 'tool', tool_call_id: 'toolu_x', content: '{"created":true}' },
    ]
    const normalized = normalizeMessagesForProvider(messages)
    expect(normalized[0]).toMatchObject({ content: null })
  })
})
