<script lang="ts" setup>
  import type { EntityReference, EntityType } from '~/types/entity'
  import { createDefaultItem } from '~/types/entity'
  import { useEntitySearch } from '~/composables/useEntitySearch'
  import { useEntities } from '~/composables/useEntities'

  const props = defineProps<{
    open: boolean
    excludeId?: string
    filterType?: string
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    select: [ref: EntityReference]
  }>()

  const excludeIdRef = computed(() => props.excludeId)
  const filterTypeRef = computed(() => props.filterType)
  const { search, filteredItems, getIcon, getColor, getLabel, buildEntityReference } = useEntitySearch({
    excludeId: excludeIdRef,
    filterType: filterTypeRef,
  })
  const { create: createItem } = useEntities()

  const selectItem = (item: any) => {
    emit('select', buildEntityReference(item))
    emit('update:open', false)
    search.value = ''
  }

  const createAndSelect = async () => {
    const type = props.filterType as EntityType
    if (!type) return
    const title = search.value.trim() || `New ${getLabel(type)}`
    const newItem = { ...createDefaultItem(type), title }
    await createItem(newItem)
    emit('select', {
      kind: 'entity',
      id: `ref-${crypto.randomUUID().slice(0, 8)}`,
      entityId: newItem.id,
      entityType: type as EntityType,
      title,
      direction: 'outgoing',
    })
    emit('update:open', false)
    search.value = ''
  }

  const close = () => {
    emit('update:open', false)
    search.value = ''
  }
</script>

<template>
  <UiDialog :open="open" @update:open="(v) => !v && close()">
    <UiDialogContent class="sm:max-w-md p-0 gap-0 overflow-hidden">
      <UiDialogTitle class="sr-only">Link an entity</UiDialogTitle>
      <UiDialogDescription class="sr-only">Search for an entity to reference</UiDialogDescription>

      <!-- Search input -->
      <div class="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Icon name="lucide:search" class="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          v-model="search"
          type="text"
          placeholder="Search entities..."
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          autofocus />
        <button v-if="search" class="text-muted-foreground hover:text-foreground" @click="search = ''">
          <Icon name="lucide:x" class="h-3.5 w-3.5" />
        </button>
      </div>

      <!-- Results -->
      <div class="max-h-64 overflow-y-auto">
        <!-- Create new inline (when filterType is set) -->
        <button
          v-if="filterType"
          class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary/5 transition-colors text-left border-b border-border"
          @click="createAndSelect">
          <div :class="['w-7 h-7 rounded flex items-center justify-center shrink-0', getColor(filterType)]">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium">
              Create new {{ getLabel(filterType) }}
              <span v-if="search" class="text-muted-foreground">"{{ search }}"</span>
            </p>
          </div>
          <span class="shrink-0 text-[10px] font-medium text-primary bg-primary/10 rounded px-1.5 py-0.5">
            New
          </span>
        </button>

        <div v-if="filteredItems.length === 0 && !filterType" class="px-4 py-6 text-center">
          <Icon name="lucide:search-x" class="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p class="text-xs text-muted-foreground">No entities found</p>
        </div>
        <div v-else-if="filteredItems.length === 0 && filterType" class="px-4 py-4 text-center">
          <p class="text-[10px] text-muted-foreground">No existing {{ getLabel(filterType).toLowerCase() }}s found</p>
        </div>
        <button
          v-for="item in filteredItems"
          :key="item.id"
          class="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
          @click="selectItem(item)">
          <div :class="['w-7 h-7 rounded flex items-center justify-center shrink-0', getColor(item.type)]">
            <Icon :name="getIcon(item.type)" class="h-3.5 w-3.5" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium truncate">{{ item.title || 'Untitled' }}</p>
            <p v-if="(item as any).url" class="text-[10px] text-muted-foreground truncate font-mono">{{ (item as any).url }}</p>
            <p v-else-if="item.description" class="text-[10px] text-muted-foreground truncate">{{ item.description }}</p>
          </div>
          <span class="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
            {{ getLabel(item.type) }}
          </span>
        </button>
      </div>

      <!-- Footer -->
      <div class="px-3 py-2 border-t border-border bg-muted/10">
        <p class="text-[10px] text-muted-foreground">
          {{ filteredItems.length }} result{{ filteredItems.length === 1 ? '' : 's' }}
          <span v-if="search">for "{{ search }}"</span>
        </p>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
