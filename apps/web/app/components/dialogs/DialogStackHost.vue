<script lang="ts" setup>
  import type { EntityType } from '~/types/entity'
  import type { Entity } from '~/types/entity'
  import type { Component } from 'vue'
  import EntityDialog from '~/components/dialogs/EntityDialog.vue'
  import PersonDialog from '~/components/dialogs/PersonDialog.vue'
  import OrganizationDialog from '~/components/dialogs/OrganizationDialog.vue'
  import ProjectDialog from '~/components/dialogs/ProjectDialog.vue'
  import FileDialog from '~/components/dialogs/FileDialog.vue'

  const dialogStack = useDialogStack()
  const { update: updateItem, remove: removeItem } = useEntities()

  /**
   * Resolve entity type → dialog component.
   * Falls back to EntityDialog for unknown types.
   */
  function resolveDialogComponent(entityType: EntityType): Component {
    switch (entityType) {
      case 'person':
      case 'contact':
      case 'vendor':
        return PersonDialog
      case 'organization':
        return OrganizationDialog
      case 'project':
      case 'folder':
      case 'collection':
      case 'goal':
        return ProjectDialog
      case 'file':
        return FileDialog
      default:
        return EntityDialog
    }
  }

  /** Handle save from a stacked dialog */
  async function handleSave(item: Entity) {
    await updateItem(item)
  }

  /** Handle delete from a stacked dialog */
  async function handleDelete(item: Entity) {
    await removeItem(item.id)
    dialogStack.pop()
  }

  /** Handle close — pops the topmost dialog */
  function handleClose(index: number) {
    // Only allow closing the topmost dialog
    if (index === dialogStack.stack.value.length - 1) {
      dialogStack.pop()
    }
  }
</script>

<template>
  <!--
    Each stacked dialog is wrapped in DialogStackEntry which provides
    the stack index via inject so shells can compute their transforms.
  -->
  <DialogStackEntry
    v-for="(entry, index) in dialogStack.stack.value"
    :key="entry.id"
    :stack-index="index">
    <component
      :is="resolveDialogComponent(entry.entityType)"
      :open="true"
      :item="JSON.parse(JSON.stringify(entry.item))"
      mode="edit"
      :can-navigate-prev="false"
      :can-navigate-next="false"
      @update:open="(val: boolean) => { if (!val) handleClose(index) }"
      @close="handleClose(index)"
      @save="handleSave"
      @delete="handleDelete"
    />
  </DialogStackEntry>
</template>
