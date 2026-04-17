<script lang="ts" setup>
  /**
   * EntityPreviewPopover — hover-triggered preview card for any entity reference.
   *
   * Wraps a trigger slot with UiHoverCard. Resolves full entity data from the
   * store by ID and renders a compact preview card showing type badge, title,
   * description/content snippet, date, and tags.
   *
   * Usage:
   *   <EntityPreviewPopover :entity-id="ref.entityId" :entity-type="ref.entityType">
   *     <template #trigger>
   *       <button>My reference link</button>
   *     </template>
   *   </EntityPreviewPopover>
   */

  import type { Entity } from '~/types/entity'

  const props = withDefaults(
    defineProps<{
      entityId: string
      entityType?: string
      /** Side of the trigger to place the popover */
      side?: 'top' | 'bottom' | 'left' | 'right'
      /** Alignment relative to the trigger */
      align?: 'start' | 'center' | 'end'
      /** Disable the hover preview (useful in edit modes) */
      disabled?: boolean
    }>(),
    {
      entityType: undefined,
      side: 'top',
      align: 'center',
      disabled: false,
    },
  )

  const { items } = useEntities()

  const entity = computed<Entity | null>(() => {
    if (!props.entityId) return null
    return items.value.find((e: Entity) => e.id === props.entityId) ?? null
  })
</script>

<template>
  <UiHoverCard v-if="!disabled && entity" :open-delay="300" :close-delay="150">
    <UiHoverCardTrigger as-child>
      <slot name="trigger" />
    </UiHoverCardTrigger>
    <UiHoverCardContent :side="side" :align="align" :side-offset="8" class="w-72 p-0 overflow-hidden">
      <EntityPreviewCard :entity-id="entityId" :entity-type="entityType" />
    </UiHoverCardContent>
  </UiHoverCard>

  <!-- Fallback: no entity found or disabled — just render the trigger -->
  <slot v-else name="trigger" />
</template>
