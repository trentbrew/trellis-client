import { extractImageRefs } from '~/utils/extractImageRefs'
import type { Reference } from '~/types/entity'
import { isFileReference } from '~/types/entity'

/**
 * Syncs inline images in HTML content to FileReference entries.
 *
 * Image references are **content-derived** — extracted from `<img>` tags in
 * the entity's HTML body. They persist across sessions because the HTML
 * persists; we re-derive them on every load via `{ immediate: true }`.
 *
 * No TQL links are created. Unlike mentions (which reference real entities),
 * inline images are not graph nodes — they're binary assets identified by URL.
 * Storing them as `FileReference` objects in the `references` array is
 * sufficient for the References panel display.
 *
 * The watcher is bidirectional: new images are added AND stale images (removed
 * from content) are pruned from the references array.
 */
export function useImageLinks(
  editableItem: { id: string; content?: string; references?: Reference[] },
) {
  /**
   * Extract image refs from content and sync them into
   * `editableItem.references` — adding new ones, removing stale ones.
   */
  function syncImageRefs() {
    if (!editableItem.id || !editableItem.references) return

    const currentRefs = extractImageRefs(editableItem.content || '')
    const currentIds = new Set(currentRefs.map((r) => r.id))

    // Add new image refs that aren't already present
    for (const ref of currentRefs) {
      const alreadyExists = editableItem.references.some(
        (r) => isFileReference(r) && r.id === ref.id,
      )
      if (!alreadyExists) {
        editableItem.references.push(ref)
      }
    }

    // Remove stale image refs whose URLs are no longer in the content
    for (let i = editableItem.references.length - 1; i >= 0; i--) {
      const r = editableItem.references[i]
      if (isFileReference(r) && !currentIds.has(r.id)) {
        editableItem.references.splice(i, 1)
      }
    }
  }

  // Fire immediately so image refs are populated on first render (load),
  // then debounce subsequent content changes at 150ms.
  watchDebounced(
    () => editableItem.content,
    syncImageRefs,
    { debounce: 150, immediate: true },
  )
}
