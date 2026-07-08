import { describe, expect, test } from 'vitest'
import { groupRailRoutesByZone, isWorkshopProjectionPath } from './campus-zone-routes'

describe('isWorkshopProjectionPath', () => {
  test('matches sheets, decks, and canvases routes', () => {
    expect(isWorkshopProjectionPath('/sheets')).toBe(true)
    expect(isWorkshopProjectionPath('/sheets/demo')).toBe(true)
    expect(isWorkshopProjectionPath('/decks/yc-s26')).toBe(true)
    expect(isWorkshopProjectionPath('/canvases')).toBe(true)
    expect(isWorkshopProjectionPath('/canvases/e2e-board')).toBe(true)
    expect(isWorkshopProjectionPath('/w/acme/sheets/demo')).toBe(true)
  })

  test('rejects unrelated routes', () => {
    expect(isWorkshopProjectionPath('/messages')).toBe(false)
    expect(isWorkshopProjectionPath('/graph')).toBe(false)
  })
})

describe('groupRailRoutesByZone', () => {
  test('groups workshop routes together', () => {
    const groups = groupRailRoutesByZone([
      { path: '/calendar', label: 'Calendar', icon: 'lucide:calendar' },
      { path: '/sheets', label: 'Sheets', icon: 'lucide:table-2' },
      { path: '/decks', label: 'Decks', icon: 'lucide:presentation' },
      { path: '/canvases', label: 'Canvases', icon: 'lucide:layout-dashboard' },
      { path: '/messages', label: 'Messages', icon: 'lucide:message-square' },
    ])
    const workshop = groups.find((g) => g.kind === 'workshop')
    expect(workshop?.routes.map((r) => r.path)).toEqual(['/sheets', '/decks', '/canvases', '/messages'])
  })
})
