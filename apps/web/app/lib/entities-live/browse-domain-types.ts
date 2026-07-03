/** Curated entity types included in KernelBrowse aggregate (ADR-002 TRL-17). */
export const BROWSE_DOMAIN_TYPES = [
  // temporal
  'task',
  'event',
  'trip',
  'payment',
  'appointment',
  'reminder',
  'deadline',
  'milestone',
  'sprint',
  'budget',
  // document
  'note',
  'file',
  'page',
  'template',
  'slide_deck',
  'bookmark',
  'diagram',
  'email',
  // actor
  'person',
  'contact',
  'organization',
  'vendor',
  // container
  'project',
  'folder',
  'collection',
  'goal',
] as const

export type BrowseDomainType = (typeof BROWSE_DOMAIN_TYPES)[number]

const BROWSE_DOMAIN_SET = new Set<string>(BROWSE_DOMAIN_TYPES)

export function isBrowseDomainType(type: unknown): type is BrowseDomainType {
  return typeof type === 'string' && BROWSE_DOMAIN_SET.has(type)
}
