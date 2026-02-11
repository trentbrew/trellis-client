export type SystemType = {
  id: string
  name: string
  description?: string
  icon?: string
}

/**
 * Platform types — internal constructs that power the system.
 * These are NOT usable as page data sources.
 */
export const PLATFORM_TYPES: SystemType[] = [
  {
    id: 'User',
    name: 'User',
    description: 'An authenticated user of the platform.',
    icon: 'lucide:user-cog',
  },
  {
    id: 'Ontology',
    name: 'Ontology',
    description: 'A schema definition for a custom entity type.',
    icon: 'lucide:shapes',
  },
  {
    id: 'Projection',
    name: 'Projection',
    description: 'A saved view configuration (table, kanban, calendar, etc.).',
    icon: 'lucide:layout-template',
  },
  {
    id: 'Tag',
    name: 'Tag',
    description: 'A label used to categorize and filter entities.',
    icon: 'lucide:tag',
  },
  {
    id: 'Workflow',
    name: 'Workflow',
    description: 'An automation or process definition.',
    icon: 'lucide:git-branch',
  },
  {
    id: 'Collection',
    name: 'Collection',
    description: 'A user-created data table or document collection.',
    icon: 'lucide:layers',
  },
]

/**
 * Entity types — schema.org-derived types that hold user data.
 * These CAN be used as page data sources.
 */
export const ENTITY_TYPES: SystemType[] = [
  {
    id: 'Thing',
    name: 'Thing',
    description: 'The most general type. Everything is a Thing.',
    icon: 'lucide:box',
  },
  {
    id: 'Person',
    name: 'Person',
    description: 'A human being.',
    icon: 'lucide:user',
  },
  {
    id: 'Organization',
    name: 'Organization',
    description: 'An organization such as a company, team, or institution.',
    icon: 'lucide:building-2',
  },
  {
    id: 'Event',
    name: 'Event',
    description: 'Something that happens at a certain time and place.',
    icon: 'lucide:calendar',
  },
  {
    id: 'Place',
    name: 'Place',
    description: 'A location such as a city, venue, or address.',
    icon: 'lucide:map-pin',
  },
  {
    id: 'Document',
    name: 'Document',
    description: 'A file, note, or other document-like artifact.',
    icon: 'lucide:file-text',
  },
]

/** @deprecated Use ENTITY_TYPES instead */
export const SYSTEM_TYPES = ENTITY_TYPES

export function findSystemTypeById(id: string): SystemType | null {
  const match = ENTITY_TYPES.find((t) => t.id === id)
  return match || null
}

export function findPlatformTypeById(id: string): SystemType | null {
  const match = PLATFORM_TYPES.find((t) => t.id === id)
  return match || null
}
