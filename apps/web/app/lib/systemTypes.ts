export type SystemType = {
  id: string
  name: string
  description?: string
  icon?: string
}

export const SYSTEM_TYPES: SystemType[] = [
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

export function findSystemTypeById(id: string): SystemType | null {
  const match = SYSTEM_TYPES.find((t) => t.id === id)
  return match || null
}
