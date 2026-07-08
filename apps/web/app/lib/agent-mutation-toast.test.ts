import { describe, expect, it } from 'vitest'
import {
  formatMutationToast,
  isExternalAgentMutation,
  shouldToastMutation,
} from './agent-mutation-toast'

describe('agent-mutation-toast', () => {
  it('ignores browser mutations', () => {
    expect(isExternalAgentMutation({ agentId: 'browser' })).toBe(false)
    expect(shouldToastMutation({ agentId: 'browser', action: 'createNode' })).toBe(false)
  })

  it('toasts MCP agent mutations', () => {
    expect(
      shouldToastMutation({
        agentId: 'cursor',
        action: 'updateNode',
        entityId: 'person-mcp-demo-wabi',
        type: 'person',
        data: { title: 'MCP Demo Contact' },
      }),
    ).toBe(true)

    const toast = formatMutationToast({
      agentId: 'cursor',
      action: 'updateNode',
      entityId: 'person-mcp-demo-wabi',
      data: { title: 'MCP Demo Contact' },
    })

    expect(toast.title).toBe('Cursor updated')
    expect(toast.description).toBe('MCP Demo Contact')
  })
})
