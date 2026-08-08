import type { CampusZoneKind } from '~/composables/useZoneContext'
import { zoneIdFromPath } from '~/composables/useZoneContext'
import { zoneKindFromId } from '~/lib/campus-zones'

const RAIL_ZONE_ORDER: CampusZoneKind[] = ['lab', 'workshop', 'showroom', 'vault']

const WORKSHOP_RAIL_PREFIXES = ['/graph', '/home']

/** Strip `/w/:orgSlug` prefix so zone rules match workspace-scoped URLs. */
function normalizeRailPath(path: string): string {
  const wsMatch = path.match(/^\/w\/[^/]+(\/.*)?$/)
  return (wsMatch ? wsMatch[1] || '/' : path).replace(/\/+$/, '')
}

/** Resolve campus zone kind for a route path (workspace prefix stripped). */
export function campusZoneKindForPath(path: string): CampusZoneKind {
  const clean = normalizeRailPath(path)
  for (const prefix of WORKSHOP_RAIL_PREFIXES) {
    if (clean === prefix || clean.startsWith(`${prefix}/`)) {
      return 'workshop'
    }
  }
  return zoneKindFromId(zoneIdFromPath(path))
}

export interface RailRouteZoneGroup {
  kind: CampusZoneKind
  routes: import('~/config/routes').RouteConfig[]
}

export function isWorkshopProjectionPath(path: string): boolean {
  const clean = normalizeRailPath(path)
  return (
    clean === '/sheets' ||
    clean.startsWith('/sheets/') ||
    clean === '/decks' ||
    clean.startsWith('/decks/') ||
    clean === '/canvases' ||
    clean.startsWith('/canvases/')
  )
}

/** Group primary rail routes by campus zone in canonical dock order. */
export function groupRailRoutesByZone<T extends { path: string }>(routes: T[]): RailRouteZoneGroup[] {
  const buckets = new Map<CampusZoneKind, T[]>()
  for (const route of routes) {
    const kind = campusZoneKindForPath(route.path)
    const list = buckets.get(kind) ?? []
    list.push(route)
    buckets.set(kind, list)
  }

  const groups: RailRouteZoneGroup[] = []
  for (const kind of RAIL_ZONE_ORDER) {
    const list = buckets.get(kind)
    if (list?.length) {
      groups.push({ kind, routes: list as unknown as RailRouteZoneGroup['routes'] })
    }
  }
  return groups
}

export { RAIL_ZONE_ORDER }
