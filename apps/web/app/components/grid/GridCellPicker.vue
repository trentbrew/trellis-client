<script setup lang="ts">
  import type { GridView } from '~/types/grid'
  import type { ProjectionType } from '~/types/database'
  import type { EntityType } from '~/types/entity'
  import {
    buildEntityTypeOptions,
    getProjectionsForType,
  } from '~/config/entityRegistry'

  const props = defineProps<{
    open: boolean
    /** Existing view to edit (null = creating new) */
    existingView?: GridView | null
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    confirm: [dataSource: string, projection: ProjectionType, title?: string]
  }>()

  const selectedSource = ref<string>('')
  const selectedProjection = ref<ProjectionType>('table')
  const viewTitle = ref('')

  // Hydrate from existing view when editing
  watch(
    () => props.open,
    (open) => {
      if (open && props.existingView) {
        selectedSource.value = props.existingView.dataSource || ''
        selectedProjection.value = props.existingView.projection || 'table'
        viewTitle.value = props.existingView.title || ''
      } else if (open) {
        selectedSource.value = ''
        selectedProjection.value = 'table'
        viewTitle.value = ''
      }
    },
  )

  // Data source options
  const entityTypeOptions = computed(() => buildEntityTypeOptions())

  // Dynamic projection filtering based on selected source
  const allProjectionOptions: { value: ProjectionType; label: string; icon: string }[] = [
    { value: 'table', label: 'Table', icon: 'lucide:table' },
    { value: 'list', label: 'List', icon: 'lucide:list' },
    { value: 'card-grid', label: 'Grid', icon: 'lucide:grid-3x3' },
    { value: 'kanban', label: 'Kanban', icon: 'lucide:square-kanban' },
    { value: 'calendar', label: 'Calendar', icon: 'lucide:calendar' },
    { value: 'timeline', label: 'Timeline', icon: 'lucide:calendar-range' },
    { value: 'chart', label: 'Chart', icon: 'lucide:bar-chart-2' },
    { value: 'graph', label: 'Graph', icon: 'lucide:network' },
    { value: 'spreadsheet', label: 'Spreadsheet', icon: 'lucide:sheet' },
    { value: 'dashboard', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
    { value: 'moodboard', label: 'Moodboard', icon: 'lucide:image' },
    { value: 'slide-deck', label: 'Slides', icon: 'lucide:presentation' },
  ]

  const availableProjections = computed(() => {
    if (!selectedSource.value || selectedSource.value === 'all') {
      return allProjectionOptions
    }
    try {
      const allowed = getProjectionsForType(selectedSource.value as EntityType)
      const allowedSet = new Set(allowed)
      return allProjectionOptions.filter((p) => allowedSet.has(p.value))
    } catch {
      return allProjectionOptions
    }
  })

  // When source changes, reset projection if current one isn't available
  watch(selectedSource, () => {
    const available = availableProjections.value
    if (!available.find((p) => p.value === selectedProjection.value)) {
      selectedProjection.value = available[0]?.value ?? 'table'
    }
  })

  const canConfirm = computed(() => !!selectedSource.value && !!selectedProjection.value)

  function handleConfirm() {
    if (!canConfirm.value) return
    emit('confirm', selectedSource.value, selectedProjection.value, viewTitle.value || undefined)
    emit('update:open', false)
  }

  function handleClose() {
    emit('update:open', false)
  }
</script>

<template>
  <UiDialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <UiDialogContent
      :hide-close="true"
      class="p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0 w-[min(480px,calc(100vw-4rem))]!">
      <UiDialogTitle class="sr-only">{{ existingView ? 'Edit View' : 'Add View' }}</UiDialogTitle>
      <UiDialogDescription class="sr-only">Pick a data source and projection for this cell</UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border px-5 py-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="lucide:layout-grid" class="h-4 w-4 text-muted-foreground" />
          <span class="font-medium text-sm">{{ existingView ? 'Edit View' : 'Add View' }}</span>
        </div>
        <button class="text-muted-foreground hover:text-foreground transition-colors" @click="handleClose">
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </div>

      <!-- Form -->
      <div class="flex-1 p-5 space-y-4">
        <!-- View Title (optional) -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title (optional)</label>
          <input
            v-model="viewTitle"
            type="text"
            placeholder="e.g. My Tasks, Weekly Calendar..."
            class="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <!-- Data Source -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data Source</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors border"
              :class="selectedSource === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'"
              @click="selectedSource = 'all'">
              <Icon name="lucide:layers" class="h-3.5 w-3.5" />
              All
            </button>
            <button
              v-for="opt in entityTypeOptions"
              :key="opt.value"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors border"
              :class="selectedSource === opt.value
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'"
              @click="selectedSource = opt.value">
              <Icon :name="opt.icon" class="h-3.5 w-3.5" />
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Projection (dynamically filtered) -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">View</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="proj in availableProjections"
              :key="proj.value"
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors border"
              :class="selectedProjection === proj.value
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'"
              @click="selectedProjection = proj.value">
              <Icon :name="proj.icon" class="h-3.5 w-3.5" />
              {{ proj.label }}
            </button>
          </div>
          <p v-if="selectedSource && selectedSource !== 'all'" class="text-[10px] text-muted-foreground/60">
            Showing views supported by {{ selectedSource }} entities
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-5 py-3 shrink-0 bg-muted/10 flex items-center justify-end gap-2">
        <UiButton variant="ghost" size="sm" @click="handleClose">
          Cancel
        </UiButton>
        <UiButton size="sm" :disabled="!canConfirm" @click="handleConfirm">
          {{ existingView ? 'Update' : 'Add View' }}
        </UiButton>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
