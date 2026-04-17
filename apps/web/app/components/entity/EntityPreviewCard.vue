<script lang="ts" setup>
  /**
   * EntityPreviewCard — the visual card body shared by EntityPreviewPopover
   * (hover-triggered) and non-hover contexts like the graph view's pinned
   * hover preview. Renders type badge, title, status, content snippet,
   * date, and tags for a given entity id.
   *
   * Has no trigger / positioning logic — callers are responsible for
   * wrapping it in HoverCard, a floating div, etc.
   */

  import type { Entity, EntityType } from '~/types/entity'
  import { getEntityClass } from '~/types/entity'
  import { stripHtml } from '~/utils/stripHtml'

  const props = withDefaults(
    defineProps<{
      entityId: string
      entityType?: string
    }>(),
    {
      entityType: undefined,
    },
  )

  const { items } = useEntities()

  const entity = computed<Entity | null>(() => {
    if (!props.entityId) return null
    return items.value.find((e: Entity) => e.id === props.entityId) ?? null
  })

  const i = computed(() => entity.value as any)

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

  const hasFooter = computed(() => {
    if (!entity.value) return false
    return !!(dateDisplay.value || (entity.value.tags?.length))
  })
</script>

<template>
  <div v-if="entity" class="overflow-hidden">
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
        :class="[
          'rounded-full px-1.5 py-0.5 text-[9px] font-medium shrink-0',
          STATUS_COLORS[statusDisplay] || 'bg-muted text-muted-foreground',
        ]">
        {{ statusDisplay }}
      </span>
    </div>

    <div v-if="contentPreview" class="px-3 pb-2">
      <p class="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
        {{ contentPreview }}
      </p>
    </div>

    <div
      v-if="entityClass === 'document' && i?.content && !contentPreview"
      class="mx-3 mb-2 relative rounded-md overflow-hidden border border-border/30 bg-muted/20">
      <div class="absolute inset-0 bg-linear-to-b from-transparent to-popover pointer-events-none z-10" />
      <div
        class="prose prose-sm dark:prose-invert max-w-none text-[8px] leading-relaxed p-2 h-16 overflow-hidden opacity-50"
        v-html="i.content" />
    </div>

    <div v-if="hasFooter" class="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-muted/20">
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
  </div>
</template>
