/**
 * Combines useEntitySelection with common batch operation handlers.
 *
 * Wraps the selection composable + CRUD operations into a single call
 * that any browse page can use with minimal boilerplate.
 */

import type { Entity, PropertyFieldId } from '~/types/entity'
import { useEntitySelection } from '~/composables/useEntitySelection'
import { resolvePropertyKey } from '~/lib/fieldEditorConfig'

export function useBrowseSelection(
  filteredItems: Ref<Entity[]> | ComputedRef<Entity[]>,
) {
  const { update: updateEntity, remove: removeEntity, create: createEntity } = useEntities()

  const selection = useEntitySelection(filteredItems)

  // Checkbox clicks (@select) should always be additive — users expect each
  // checkbox click to toggle that single item without clearing others.
  const toggleSelection = (id: string, event?: MouseEvent | KeyboardEvent) => {
    selection.toggle(id, event, true)
  }

  const handleFieldUpdate = async (item: Entity, fieldId: PropertyFieldId, value: unknown) => {
    const propKey = resolvePropertyKey(fieldId, item.type)
    const updated = { ...item, [propKey]: value }
    await updateEntity(updated)
  }

  const handleBatchDelete = async () => {
    for (const item of selection.selectedItems.value) {
      await removeEntity(item.id)
    }
    selection.clearSelection()
  }

  const handleBatchDuplicate = async () => {
    for (const item of selection.selectedItems.value) {
      const clone = { ...item, id: '', title: `${item.title} (copy)` }
      await createEntity(clone)
    }
    selection.clearSelection()
  }

  const handleBatchSetField = async (fieldId: PropertyFieldId, value: unknown) => {
    for (const item of selection.selectedItems.value) {
      const propKey = resolvePropertyKey(fieldId, item.type)
      await updateEntity({ ...item, [propKey]: value })
    }
    selection.clearSelection()
  }

  return {
    ...selection,
    toggle: toggleSelection,
    toggleSelection,
    handleFieldUpdate,
    handleBatchDelete,
    handleBatchDuplicate,
    handleBatchSetField,
  }
}
