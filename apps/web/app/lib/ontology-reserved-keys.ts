import { getAllEntityTypeIds } from '~/config/entityRegistry'
import { NON_BROWSE_SYSTEM_TYPES, ROUTED_ONTOLOGY_SURFACES } from '~/lib/ontology-capabilities'

const COLLECTION_KEY_RE = /^[a-z][a-z0-9_-]*$/

const PLATFORM = new Set(['user', 'ontology', 'projection', 'tag', 'workflow', 'collection'])

const META = new Set(['entity', 'schema', 'field', 'comment', 'notification'])

/** Match OntologyCreateDialog slug derivation (dashes, not underscores). */
export function normalizeOntologySlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildReservedSet(): Set<string> {
  return new Set<string>([
    ...getAllEntityTypeIds(),
    ...NON_BROWSE_SYSTEM_TYPES,
    ...Object.keys(ROUTED_ONTOLOGY_SURFACES),
    ...PLATFORM,
    ...META,
  ])
}

let _cached: Set<string> | null = null

export function getReservedOntologySlugs(): Set<string> {
  if (!_cached) _cached = buildReservedSet()
  return _cached
}

export function isReservedOntologySlug(raw: string): boolean {
  const slug = normalizeOntologySlug(raw)
  if (!slug) return true
  return getReservedOntologySlugs().has(slug)
}

export function validateOntologySlug(raw: string): string | null {
  const slug = normalizeOntologySlug(raw)
  if (!slug) return 'Type name is required'
  if (!COLLECTION_KEY_RE.test(slug)) {
    return 'Use lowercase letters, digits, and hyphens; start with a letter'
  }
  if (isReservedOntologySlug(slug)) {
    return `"${slug}" is reserved for a built-in type — pick a different name (the label can stay human-readable)`
  }
  return null
}
