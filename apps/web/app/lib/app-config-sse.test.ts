// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { shouldRefetchAppConfigFromSSE } from './app-config-sse'

describe('shouldRefetchAppConfigFromSSE', () => {
  it('refetches on route: entity mutations', () => {
    expect(shouldRefetchAppConfigFromSSE({ entityId: 'route:home', action: 'updateNode' })).toBe(true)
  })

  it('refetches on app_route typed payloads', () => {
    expect(shouldRefetchAppConfigFromSSE({
      action: 'updateNode',
      entityId: 'route:workspace',
      data: { type: 'app_route', title: 'Collections' },
    })).toBe(true)
  })

  it('ignores unrelated entity mutations', () => {
    expect(shouldRefetchAppConfigFromSSE({
      entityId: 'entity:task-1',
      action: 'updateNode',
      data: { type: 'task', title: 'Deploy' },
    })).toBe(false)
  })
})
