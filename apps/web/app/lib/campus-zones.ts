import { CAMPUS_ZONES, type CampusZoneKind } from '~/composables/useZoneContext'

export interface CampusZoneMeta {
  kind: CampusZoneKind
  label: string
  icon: string
  description: string
  /** Tailwind class for breadcrumb icons (neutral — text carries hierarchy). */
  iconClass: string
  /** Canonical “walk to this room” route (workspace-prefixed at runtime). */
  homePath: string
}

export const CAMPUS_ZONE_META: Record<CampusZoneKind, CampusZoneMeta> = {
  lab: {
    kind: 'lab',
    label: 'Lab',
    icon: 'lucide:flask-conical',
    description: 'Private workspace — notes, tasks, personal graph.',
    iconClass: 'text-muted-foreground/55',
    homePath: '/workspace/browse',
  },
  lobby: {
    kind: 'lobby',
    label: 'Lobby',
    icon: 'lucide:door-open',
    description: 'Front door — notifications and access requests.',
    iconClass: 'text-muted-foreground/55',
    homePath: '/notifications',
  },
  workshop: {
    kind: 'workshop',
    label: 'Workshop',
    icon: 'lucide:hammer',
    description: 'Collaboration — agents, sheets, decks, workflows.',
    iconClass: 'text-muted-foreground/55',
    homePath: '/home',
  },
  showroom: {
    kind: 'showroom',
    label: 'Showroom',
    icon: 'lucide:store',
    description: 'Published artifacts — pages and collections.',
    iconClass: 'text-muted-foreground/55',
    homePath: '/pages',
  },
  vault: {
    kind: 'vault',
    label: 'Vault',
    icon: 'lucide:shield',
    description: 'Privileged ops — integrations and credentials.',
    iconClass: 'text-muted-foreground/55',
    homePath: '/settings',
  },
}

export const CAMPUS_ZONE_LIST = Object.values(CAMPUS_ZONE_META)

/** Resolve a zone kind from a canonical zone entity id. Unknown ids → lab. */
export function zoneKindFromId(zoneId: string | undefined | null): CampusZoneKind {
  if (!zoneId) return 'lab'
  for (const kind of Object.keys(CAMPUS_ZONES) as CampusZoneKind[]) {
    if (CAMPUS_ZONES[kind] === zoneId) return kind
  }
  return 'lab'
}

export function campusZoneMeta(zoneId: string | undefined | null): CampusZoneMeta {
  return CAMPUS_ZONE_META[zoneKindFromId(zoneId)]
}
