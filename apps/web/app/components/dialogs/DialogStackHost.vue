<script lang="ts" setup>
  import type { Entity } from '~/types/entity'
  import { resolveDialog } from '~/lib/dialogResolver'

  const dialogStack = useDialogStack()
  const { update: updateItem, remove: removeItem } = useEntities()
  const { getEntityConfig } = useOntologyRegistry()

  /** Cache resolved dialog per stack entry to avoid calling resolveDialog twice in template */
  const resolvedDialogs = computed(() =>
    dialogStack.stack.value.map((entry) => resolveDialog(entry.entityType)),
  )

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
      :is="resolvedDialogs[index]!.component"
      v-bind="{
        open: true,
        item: JSON.parse(JSON.stringify(entry.item)),
        mode: 'edit',
        canNavigatePrev: false,
        canNavigateNext: false,
        ...(resolvedDialogs[index]!.needsTypeConfig ? { typeConfig: getEntityConfig(entry.entityType) } : {}),
      }"
      @update:open="(val: boolean) => { if (!val) handleClose(index) }"
      @close="handleClose(index)"
      @save="handleSave"
      @delete="handleDelete"
    />
  </DialogStackEntry>
</template>
