import { extractImageRefs } from '~/utils/extractImageRefs'
import type { EntityReference, Reference } from '~/types/entity'
import { isFileReference, isEntityReference } from '~/types/entity'

/**
 * Syncs inline images in HTML content to proper `file` entity references.
 *
 * For each `<img>` found in the editor content, a `file` entity is created
 * in the graph (or reused if one already exists for that URL) and an
 * `EntityReference` is added to `editableItem.references`. This makes pasted
 * images first-class graph nodes rather than raw URL pointers.
 *
 * Migration: old-style `FileReference` entries with `img-*` IDs are removed
 * and replaced by their corresponding `EntityReference` counterparts.
 */
export function useImageLinks(
  editableItem: { id: string; content?: string; references?: Reference[] },
) {
  const { create: createFileEntity, items } = useTrellisEntities()

  // Session cache: stable image ID → created entity ID (avoids duplicate creates)
  const _imgEntityCache = new Map<string, string>()
  // In-flight guard: prevents concurrent creates for the same image
  const _pending = new Set<string>()

  async function syncImageRefs() {
    if (!editableItem.id) return
    if (!editableItem.references) editableItem.references = []

    const currentRefs = extractImageRefs(editableItem.content || '')
    const currentImgIds = new Set(currentRefs.map((r) => r.id))

    // Add new images as file entity references
    for (const ref of currentRefs) {
      const entityRefId = `img-entity-${ref.id}`

      // Already tracked — skip
      if (editableItem.references.some((r) => r.id === entityRefId)) continue
      // Creation already in flight — skip
      if (_pending.has(ref.id)) continue

      let entityId: string | undefined = _imgEntityCache.get(ref.id)
      if (!entityId) {
        // Reuse an existing file entity that stores this exact URL
        const existing = (items.value as any[]).find(
          (e: any) => e.type === 'file' && (e.fileUrl === ref.url || e.url === ref.url),
        )
        if (existing) {
          entityId = existing.id as string
        } else {
          _pending.add(ref.id)
          try {
            entityId = await createFileEntity({
              type: 'file',
              title: ref.name || 'Pasted Image',
              mimeType: _inferMimeType(ref.url || ''),
              fileUrl: ref.url || '',
              pinned: false,
            } as any) as string
          } finally {
            _pending.delete(ref.id)
          }
        }
        if (entityId) _imgEntityCache.set(ref.id, entityId)
      }

      if (!entityId) continue

      editableItem.references.push({
        kind: 'entity',
        id: entityRefId,
        entityId,
        entityType: 'file',
        title: ref.name || 'Pasted Image',
        direction: 'outgoing',
      } satisfies EntityReference)
    }

    // Cleanup pass: remove old-style FileReference img entries (migration)
    // and prune EntityReference img entries whose images were removed from content.
    for (let i = editableItem.references.length - 1; i >= 0; i--) {
      const r = editableItem.references[i]
      if (!r) continue
      if (isFileReference(r) && r.id.startsWith('img-')) {
        editableItem.references.splice(i, 1)
        continue
      }
      if (isEntityReference(r) && r.id.startsWith('img-entity-')) {
        const imgId = r.id.slice('img-entity-'.length)
        if (!currentImgIds.has(imgId)) {
          editableItem.references.splice(i, 1)
        }
      }
    }
  }

  watchDebounced(
    () => editableItem.content,
    syncImageRefs,
    { debounce: 150, immediate: true },
  )
}

function _inferMimeType(src: string): string {
  if (src.startsWith('data:')) {
    const m = src.match(/^data:([^;,]+)/)
    return m?.[1] || 'image/png'
  }
  const ext = ((src.split('?')[0] ?? '').split('.').pop() ?? '').toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  }
  return map[ext] || 'image/png'
}

