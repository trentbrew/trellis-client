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

  import type { Entity, EntityType } from '~/types/entity'
  import { getEntityClass } from '~/types/entity'
  import { stripHtml } from '~/utils/stripHtml'

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

  const i = computed(() => entity.value as any)

  // ── Type config ──
  const { getEntityConfig } = useOntologyRegistry()

  const typeConfig = computed(() => {
    const type = entity.value?.type || props.entityType
    if (!type) return null
    return getEntityConfig(type)
  })

  const entityClass = computed(() => {
    if (!entity.value?.type) return null
    try {
      return getEntityClass(entity.value.type as EntityType)
    } catch {
      return typeConfig.value?.class ?? 'container'
    }
  })

  // ── Preview data ──
  const contentPreview = computed(() => {
    if (!i.value) return ''
    const content = i.value.content || i.value.description || i.value.excerpt || ''
    return stripHtml(content).slice(0, 200)
  })

  const dateDisplay = computed(() => {
    if (!i.value) return null
    const d = i.value.startDate || i.value.createdAt
    if (!d) return null
    try {
      const date = typeof d === 'number' ? new Date(d) : new Date(d + 'T00:00:00')
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return null
    }
  })

  const statusDisplay = computed(() => {
    if (!i.value) return null
    return i.value.taskStatus || i.value.tripStatus || i.value.status || null
  })

  const STATUS_COLORS: Record<string, string> = {
    'pending': 'bg-gray-500/10 text-gray-400',
    'in-progress': 'bg-blue-500/10 text-blue-400',
    'completed': 'bg-emerald-500/10 text-emerald-400',
    'active': 'bg-emerald-500/10 text-emerald-400',
    'cancelled': 'bg-red-500/10 text-red-400',
    'draft': 'bg-gray-500/10 text-gray-400',
    'on-hold': 'bg-amber-500/10 text-amber-400',
  }

  const hasPreview = computed(() => {
    if (!entity.value) return false
    return !!(contentPreview.value || dateDisplay.value || statusDisplay.value || (entity.value.tags?.length))
  })
</script>

<template>
  <UiHoverCard v-if="!disabled && entity" :open-delay="300" :close-delay="150">
    <UiHoverCardTrigger as-child>
      <slot name="trigger" />
    </UiHoverCardTrigger>
    <UiHoverCardContent
      :side="side"
      :align="align"
      :side-offset="8"
      class="w-72 p-0 overflow-hidden">
      <!-- Type badge header -->
      <div class="flex items-center gap-2 px-3 pt-3 pb-2">
        <div
          v-if="typeConfig"
          :class="['flex h-6 w-6 items-center justify-center rounded-md shrink-0', `bg-${typeConfig.color}-500/10`]">
          <Icon :name="typeConfig.icon" :class="['h-3.5 w-3.5', `text-${typeConfig.color}-500`]" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium truncate">{{ entity.title || 'Untitled' }}</p>
          <p v-if="typeConfig" class="text-[10px] text-muted-foreground capitalize">{{ typeConfig.label }}</p>
        </div>
        <span
          v-if="statusDisplay"
          :class="['rounded-full px-1.5 py-0.5 text-[9px] font-medium shrink-0', STATUS_COLORS[statusDisplay] || 'bg-muted text-muted-foreground']">
          {{ statusDisplay }}
        </span>
      </div>

      <!-- Content preview -->
      <div v-if="contentPreview" class="px-3 pb-2">
        <p class="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
          {{ contentPreview }}
        </p>
      </div>

      <!-- Note: rendered content preview -->
      <div
        v-if="entityClass === 'document' && i?.content && !contentPreview"
        class="mx-3 mb-2 relative rounded-md overflow-hidden border border-border/30 bg-muted/20">
        <div class="absolute inset-0 bg-linear-to-b from-transparent to-popover pointer-events-none z-10" />
        <div
          class="prose prose-sm dark:prose-invert max-w-none text-[8px] leading-relaxed p-2 h-16 overflow-hidden opacity-50"
          v-html="i.content" />
      </div>

      <!-- Footer: date + tags -->
      <div v-if="hasPreview" class="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-muted/20">
        <div class="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Icon v-if="dateDisplay" name="lucide:calendar" class="h-3 w-3 opacity-50" />
          <span v-if="dateDisplay">{{ dateDisplay }}</span>
        </div>
        <div class="flex-1" />
        <template v-if="entity.tags?.length">
          <span
            v-for="tag in entity.tags.slice(0, 2)"
            :key="tag"
            class="bg-muted/80 px-1 py-0.5 rounded text-[9px] font-medium truncate max-w-[60px]">#{{ tag }}</span>
        </template>
      </div>
    </UiHoverCardContent>
  </UiHoverCard>

  <!-- Fallback: no entity found or disabled — just render the trigger -->
  <slot v-else name="trigger" />
</template>
