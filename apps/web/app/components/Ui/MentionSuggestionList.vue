<script lang="ts" setup>
  import type { EntitySearchItem } from '~/composables/useEntitySearch'
  import { useEntitySearch } from '~/composables/useEntitySearch'
  import type { MentionCreateContext } from '~/lib/mention-extension'

  const props = defineProps<{
    items: EntitySearchItem[]
    command: (_item: EntitySearchItem) => void
    createContext?: MentionCreateContext | null
    onCreateNew?: (_type?: string) => void
  }>()

  const { getIcon, getColor, getLabel } = useEntitySearch()

  // Common entity types shown in the type picker when no type prefix is used
  const TYPE_PICKER_TYPES = [
    { type: 'note', label: 'Note' },
    { type: 'task', label: 'Task' },
    { type: 'event', label: 'Event' },
    { type: 'person', label: 'Person' },
    { type: 'project', label: 'Project' },
    { type: 'bookmark', label: 'Bookmark' },
  ]

  const selectedIndex = ref(0)
  const hoveredPickerType = ref<string | null>(null)

  // Whether we show the type picker (no type prefix in query)
  const showTypePicker = computed(() => !!props.createContext && !props.createContext.type)

  const totalRows = computed(() => props.items.length + (props.createContext ? 1 : 0))
  const createRowIndex = computed(() => props.items.length)
  const isCreateRowSelected = computed(() => !!props.createContext && selectedIndex.value === createRowIndex.value)

  const createLabel = computed(() => {
    if (!props.createContext) return ''
    const { type, name } = props.createContext
    const displayName = name.trim() || 'Untitled'
    if (type) return `${getLabel(type)}: ${displayName}`
    return displayName
  })

  const createIcon = computed(() => {
    if (!props.createContext?.type) return 'lucide:plus-circle'
    return getIcon(props.createContext.type)
  })

  const createColor = computed(() => {
    if (!props.createContext?.type) return 'text-muted-foreground bg-muted/60'
    return getColor(props.createContext.type)
  })

  watch(
    () => props.items,
    () => {
      selectedIndex.value = 0
    },
  )

  const selectItem = (index: number) => {
    if (props.createContext && index === createRowIndex.value) {
      // If type picker is shown, default to 'note' on Enter; type chips handle their own clicks
      props.onCreateNew?.(props.createContext.type ?? 'note')
      return
    }
    const item = props.items[index]
    if (item) props.command(item)
  }

  const onKeyDown = (event: KeyboardEvent): boolean => {
    if (totalRows.value === 0) return false
    if (event.key === 'ArrowUp') {
      selectedIndex.value = (selectedIndex.value + totalRows.value - 1) % totalRows.value
      return true
    }
    if (event.key === 'ArrowDown') {
      selectedIndex.value = (selectedIndex.value + 1) % totalRows.value
      return true
    }
    if (event.key === 'Enter') {
      selectItem(selectedIndex.value)
      return true
    }
    return false
  }

  defineExpose({ onKeyDown })
</script>

<template>
  <div
    v-if="items.length || createContext"
    class="z-50 w-72 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
    <button
      v-for="(item, index) in items"
      :key="item.id"
      :class="[
        'w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors',
        index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
      ]"
      @click="selectItem(index)"
      @mouseenter="selectedIndex = index">
      <div :class="['w-6 h-6 rounded flex items-center justify-center shrink-0', getColor(item.type)]">
        <Icon :name="getIcon(item.type)" class="h-3 w-3" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-xs font-medium truncate">{{ item.title || 'Untitled' }}</p>
      </div>
      <span class="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
        {{ getLabel(item.type) }}
      </span>
    </button>

    <!-- Create new entity row — with type picker when no prefix typed -->
    <div
      v-if="createContext"
      :class="[
        'border-t border-border/50 transition-colors',
        isCreateRowSelected ? 'bg-accent/50' : '',
      ]"
      @mouseenter="selectedIndex = createRowIndex">

      <!-- Type prefix provided: single-action create row -->
      <button
        v-if="!showTypePicker"
        class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
        @click="selectItem(createRowIndex)">
        <div :class="['w-6 h-6 rounded flex items-center justify-center shrink-0', createColor]">
          <Icon :name="createIcon" class="h-3 w-3" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-medium truncate text-muted-foreground">
            <span class="text-foreground">Create</span> {{ createLabel }}
          </p>
        </div>
        <Icon name="lucide:corner-down-left" class="h-3 w-3 shrink-0 text-muted-foreground/50" />
      </button>

      <!-- No type prefix: show label + type picker chips -->
      <div v-else class="px-3 py-2">
        <p class="text-xs text-muted-foreground mb-2">
          <span class="text-foreground font-medium">Create</span>
          <span class="ml-1">{{ createContext?.name?.trim() || 'Untitled' }}</span>
          <span class="ml-1">as…</span>
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="opt in TYPE_PICKER_TYPES"
            :key="opt.type"
            :title="opt.label"
            :class="[
              'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
              hoveredPickerType === opt.type
                ? getColor(opt.type) + ' opacity-100'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted',
            ]"
            @click.stop="onCreateNew?.(opt.type)"
            @mouseenter="hoveredPickerType = opt.type"
            @mouseleave="hoveredPickerType = null">
            <Icon :name="getIcon(opt.type)" class="h-3 w-3 shrink-0" />
            {{ opt.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div v-else class="z-50 w-72 rounded-lg border border-border bg-popover shadow-lg px-4 py-3 text-center">
    <p class="text-xs text-muted-foreground">No entities found</p>
  </div>
</template>
