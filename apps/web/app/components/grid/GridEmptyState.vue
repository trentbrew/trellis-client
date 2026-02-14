<script setup lang="ts">
  import type { ProjectionType } from '~/types/database'
  import type { EntityType } from '~/types/entity'
  import type { GridPreset } from '~/types/grid'
  import { GRID_PRESETS } from '~/types/grid'
  import {
    buildEntityTypeOptions,
    getProjectionsForType,
  } from '~/config/entityRegistry'

  const emit = defineEmits<{
    'create-view': [dataSource: string, projection: ProjectionType]
    'apply-preset': [preset: GridPreset]
  }>()

  const selectedSource = ref<string>('')
  const selectedProjection = ref<ProjectionType>('table')

  const entityTypeOptions = computed(() => buildEntityTypeOptions())

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

  watch(selectedSource, () => {
    const available = availableProjections.value
    if (!available.find((p) => p.value === selectedProjection.value)) {
      selectedProjection.value = available[0]?.value ?? 'table'
    }
  })

  const canCreate = computed(() => !!selectedSource.value && !!selectedProjection.value)

  function handleCreate() {
    if (!canCreate.value) return
    emit('create-view', selectedSource.value, selectedProjection.value)
  }
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] px-4">
    <!-- Setup card -->
    <div class="w-full max-w-md space-y-6">
      <div class="text-center space-y-2">
        <div class="mx-auto w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
          <Icon name="lucide:layout-grid" class="h-6 w-6 text-muted-foreground/60" />
        </div>
        <h3 class="text-lg font-semibold">Create your first view</h3>
        <p class="text-sm text-muted-foreground">
          Pick a data source and choose how to display it.
        </p>
      </div>

      <div class="rounded-xl border border-border bg-card/50 p-5 space-y-4">
        <!-- Data Source -->
        <div class="space-y-2">
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

        <!-- Projection -->
        <div v-if="selectedSource" class="space-y-2">
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
          <p v-if="selectedSource !== 'all'" class="text-[10px] text-muted-foreground/60">
            Showing views supported by {{ selectedSource }} entities
          </p>
        </div>

        <!-- Create button -->
        <UiButton
          class="w-full"
          :disabled="!canCreate"
          @click="handleCreate">
          <Icon name="lucide:plus" class="h-4 w-4 mr-2" />
          Create View
        </UiButton>
      </div>

      <!-- Presets -->
      <div class="space-y-3">
        <p class="text-xs font-medium text-muted-foreground/60 text-center uppercase tracking-wide">
          Or start with a template
        </p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="preset in GRID_PRESETS"
            :key="preset.id"
            class="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors text-center"
            @click="emit('apply-preset', preset)">
            <Icon :name="preset.icon" class="h-5 w-5 text-muted-foreground" />
            <span class="text-[11px] font-medium text-muted-foreground leading-tight">{{ preset.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
