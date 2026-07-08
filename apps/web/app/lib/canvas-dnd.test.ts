import { describe, expect, it } from 'vitest'
import { resolveSidebarEntityId } from '~/lib/canvas-dnd'

describe('resolveSidebarEntityId', () => {
  it('prefers meta.entityId', () => {
    expect(resolveSidebarEntityId({ meta: { entityId: 'entity:task-1' }, path: '/tasks/foo' })).toBe(
      'entity:task-1',
    )
  })

  it('resolves deck path slug', () => {
    expect(resolveSidebarEntityId({ path: '/decks/my-deck' })).toMatch(/^entity:deck-/)
  })

  it('resolves sheet path slug', () => {
    expect(resolveSidebarEntityId({ path: '/sheets/my-sheet' })).toMatch(/^entity:sheet-/)
  })

  it('returns null for unknown paths', () => {
    expect(resolveSidebarEntityId({ path: '/workspace' })).toBeNull()
  })
})
