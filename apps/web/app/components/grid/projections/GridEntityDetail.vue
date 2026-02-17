<script setup lang="ts">
  import type { Entity } from '~/types/entity'
  import type { GridView } from '~/types/grid'
  import { getEntityTypeConfig } from '~/config/entityRegistry'

  const props = defineProps<{
    view: GridView
    items: Entity[]
  }>()

  const emit = defineEmits<{
    'open-detail': [item: Entity]
  }>()

  const entity = computed<Entity | null>(() => {
    if (props.view.entityId) {
      return props.items.find((i) => i.id === props.view.entityId) ?? null
    }
    return props.items[0] ?? null
  })

  const typeConfig = computed(() => {
    if (!entity.value?.type) return null
    try {
      return getEntityTypeConfig(entity.value.type as any)
    } catch {
      return null
    }
  })

  const typeIcon = computed(() => typeConfig.value?.icon ?? 'lucide:file')
  const typeColor = computed(() => typeConfig.value?.color ?? 'var(--color-muted-foreground)')

  function formatDate(d: string | number | undefined): string {
    if (!d) return ''
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }
</script>

<template>
  <div class="h-full flex flex-col">
    <template v-if="entity">
      <!-- Clickable entity card -->
      <div
        class="flex-1 p-4 cursor-pointer hover:bg-accent/10 transition-colors"
        @click="emit('open-detail', entity)">
        <!-- Type badge + title -->
        <div class="flex items-start gap-3 mb-3">
          <div
            class="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            :style="{ backgroundColor: `color-mix(in srgb, ${typeColor} 15%, transparent)` }">
            <Icon :name="typeIcon" class="h-4.5 w-4.5" :style="{ color: typeColor }" />
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-semibold truncate">{{ entity.title || 'Untitled' }}</h3>
            <span class="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              {{ entity.type }}
            </span>
          </div>
        </div>

        <!-- Description -->
        <p
          v-if="entity.description"
          class="text-xs text-muted-foreground line-clamp-3 mb-3">
          {{ entity.description }}
        </p>

        <!-- Properties -->
        <div class="flex flex-wrap gap-1.5">
          <span
            v-if="entity.startDate"
            class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
            <Icon name="lucide:calendar" class="h-2.5 w-2.5" />
            {{ formatDate(entity.startDate) }}
          </span>
          <span
            v-if="(entity as any).taskStatus"
            class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
            <Icon name="lucide:circle-dot" class="h-2.5 w-2.5" />
            {{ (entity as any).taskStatus }}
          </span>
          <span
            v-if="(entity as any).priority"
            class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
            <Icon name="lucide:flag" class="h-2.5 w-2.5" />
            {{ (entity as any).priority }}
          </span>
          <span
            v-if="entity.category"
            class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
            <Icon name="lucide:tag" class="h-2.5 w-2.5" />
            {{ entity.category }}
          </span>
        </div>

        <!-- Tags -->
        <div v-if="entity.tags?.length" class="flex flex-wrap gap-1 mt-2">
          <span
            v-for="tag in entity.tags.slice(0, 5)"
            :key="tag"
            class="text-[10px] text-primary/70 bg-primary/10 px-1.5 py-0.5 rounded">
            #{{ tag }}
          </span>
          <span
            v-if="entity.tags.length > 5"
            class="text-[10px] text-muted-foreground/50">
            +{{ entity.tags.length - 5 }}
          </span>
        </div>
      </div>
    </template>

    <!-- No entity found -->
    <div v-else class="flex-1 flex items-center justify-center text-muted-foreground/40">
      <div class="text-center space-y-1">
        <Icon name="lucide:square-user" class="h-6 w-6 mx-auto" />
        <p class="text-[10px]">No entity selected</p>
      </div>
    </div>
  </div>
</template>
