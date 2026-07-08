<script lang="ts" setup>
  import type { Entity, EntityType } from '~/types/entity'
  import { resolveDialog } from '~/lib/dialogResolver'

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      item?: Entity | null
      itemType?: EntityType
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      owners?: { id: string; name: string }[]
    }>(),
    {
      mode: 'edit',
      item: null,
      itemType: 'task',
      canNavigatePrev: false,
      canNavigateNext: false,
      owners: () => [],
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [item: Entity]
    delete: [item: Entity]
    edit: []
    navigatePrev: []
    navigateNext: []
  }>()

  const { getEntityConfig } = useOntologyRegistry()

  const resolvedType = computed(() => (props.item?.type ?? props.itemType) as string)
  const resolved = computed(() => resolveDialog(resolvedType.value))
  const typeConfig = computed(() => getEntityConfig(resolvedType.value))

  function handleUpdateOpen(value: boolean) {
    emit('update:open', value)
    if (!value) emit('close')
  }
</script>

<template>
  <component
    :is="resolved.component"
    :open="open"
    :mode="mode"
    :item="item"
    :item-type="itemType"
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :owners="owners"
    v-bind="resolved.needsTypeConfig && typeConfig ? { typeConfig } : {}"
    @update:open="handleUpdateOpen"
    @close="emit('close')"
    @save="emit('save', $event)"
    @delete="emit('delete', $event)"
    @edit="emit('edit')"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')" />
</template>
