import { describe, expect, test } from 'vitest'
import {
  isWorkshopSpecialItems,
  resolveWorkshopSidebarItems,
  WORKSHOP_BROWSE_LINKS,
} from './sidebar-affordances'

describe('sidebar-affordances', () => {
  test('isWorkshopSpecialItems accepts workshop and legacy sheets', () => {
    expect(isWorkshopSpecialItems('workshop')).toBe(true)
    expect(isWorkshopSpecialItems('sheets')).toBe(true)
    expect(isWorkshopSpecialItems('pages')).toBe(false)
  })

  test('resolveWorkshopSidebarItems prepends browse links', () => {
    const items = resolveWorkshopSidebarItems(
      [{ path: '/sheets/demo', label: 'Demo', icon: 'lucide:table-2' }],
      [{ path: '/decks/yc', label: 'YC', icon: 'lucide:presentation' }],
    )
    expect(items[0]?.path).toBe(WORKSHOP_BROWSE_LINKS[0]?.path)
    expect(items[1]?.path).toBe(WORKSHOP_BROWSE_LINKS[1]?.path)
    expect(items).toHaveLength(4)
  })
})
