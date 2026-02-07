import type { EntityReference, EntityType } from '~/types/entity'

/**
 * Parse an HTML string from TipTap and extract all inline @mention references
 * as EntityReference objects. Useful for syncing mentions → references array.
 */
export function extractMentionRefs(html: string): EntityReference[] {
  if (!html || typeof window === 'undefined') return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const mentions = doc.querySelectorAll('[data-type="mention"]')

  const refs: EntityReference[] = []
  const seen = new Set<string>()

  mentions.forEach((el) => {
    const id = el.getAttribute('data-id')
    const label = el.getAttribute('data-label') || el.textContent?.replace(/^@/, '') || 'Untitled'
    const entityType = el.getAttribute('data-entity-type') || 'task'

    if (!id || seen.has(id)) return
    seen.add(id)

    refs.push({
      kind: 'entity',
      id: `mention-${id}`,
      entityId: id,
      entityType: entityType as EntityType,
      title: label,
      direction: 'outgoing',
    })
  })

  return refs
}
