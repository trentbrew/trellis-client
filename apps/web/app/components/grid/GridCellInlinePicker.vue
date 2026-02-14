<script setup lang="ts">
  import type { ProjectionType } from '~/types/database'
  import type { EntityType } from '~/types/entity'
  import {
    buildEntityTypeOptions,
    getProjectionsForType,
  } from '~/config/entityRegistry'

  const emit = defineEmits<{
    configure: [dataSource: string, projection: ProjectionType]
    cancel: []
  }>()

  const step = ref<'source' | 'projection'>('source')
  const selectedSource = ref<string>('')
  const selectedProjection = ref<ProjectionType>('table')

  // Data source options
  const entityTypeOptions = computed(() => buildEntityTypeOptions())

  // Projection options filtered by selected source
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
    { value: 'entity-detail', label: 'Entity', icon: 'lucide:square-user' },
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

  function selectSource(source: string) {
    selectedSource.value = source
    // Auto-select first available projection
    const available = source === 'all'
      ? allProjectionOptions
      : (() => {
          try {
            const allowed = getProjectionsForType(source as EntityType)
            const allowedSet = new Set(allowed)
            return allProjectionOptions.filter((p) => allowedSet.has(p.value))
          } catch {
            return allProjectionOptions
          }
        })()
    selectedProjection.value = available[0]?.value ?? 'table'
    step.value = 'projection'
  }

  function selectProjection(projection: ProjectionType) {
    selectedProjection.value = projection
    emit('configure', selectedSource.value, projection)
  }

  function goBack() {
    if (step.value === 'projection') {
      step.value = 'source'
      selectedSource.value = ''
    } else {
      emit('cancel')
    }
  }
</script>

<template>
  <div class="h-full flex flex-col items-center justify-center p-3 select-none">
    <!-- Cancel button -->
    <button
      class="absolute top-2 right-2 p-1 rounded hover:bg-muted/50 text-muted-foreground/40 hover:text-muted-foreground transition-colors z-10"
      @click.stop="emit('cancel')">
      <Icon name="lucide:x" class="h-3.5 w-3.5" />
    </button>

    <!-- Step 1: Data Source (searchable combobox) -->
    <Transition name="picker-fade" mode="out-in">
      <div v-if="step === 'source'" key="source" class="w-full max-w-[240px] space-y-1">
        <p class="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide text-center mb-1">
          Data source
        </p>
        <UiCommand class="rounded-lg border border-border/50 bg-card/80 shadow-sm max-h-[220px]">
          <UiCommandInput placeholder="Search entity types..." class="h-8 text-xs" />
          <UiCommandList class="max-h-[170px] overflow-y-auto">
            <UiCommandEmpty class="py-3 text-center text-[11px] text-muted-foreground">No results</UiCommandEmpty>
            <UiCommandGroup>
              <UiCommandItem
                :value="'all'"
                class="text-xs gap-2"
                @select="selectSource('all')">
                <Icon name="lucide:layers" class="h-3.5 w-3.5 text-muted-foreground" />
                All entities
              </UiCommandItem>
              <UiCommandSeparator class="my-0.5" />
              <UiCommandItem
                v-for="opt in entityTypeOptions"
                :key="opt.value"
                :value="opt.value"
                class="text-xs gap-2"
                @select="selectSource(opt.value)">
                <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
                {{ opt.label }}
              </UiCommandItem>
            </UiCommandGroup>
          </UiCommandList>
        </UiCommand>
      </div>

      <!-- Step 2: Projection -->
      <div v-else key="projection" class="w-full max-w-[280px] space-y-2">
        <div class="flex items-center justify-center gap-1.5">
          <button
            class="p-0.5 rounded hover:bg-muted/50 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            @click="goBack">
            <Icon name="lucide:arrow-left" class="h-3 w-3" />
          </button>
          <p class="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wide">
            View as
          </p>
        </div>
        <div class="flex flex-wrap gap-1 justify-center">
          <button
            v-for="proj in availableProjections"
            :key="proj.value"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border"
            @click="selectProjection(proj.value)">
            <Icon :name="proj.icon" class="h-3 w-3" />
            {{ proj.label }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
  .picker-fade-enter-active,
  .picker-fade-leave-active {
    transition: opacity 0.15s ease, transform 0.15s ease;
  }
  .picker-fade-enter-from {
    opacity: 0;
    transform: translateX(8px);
  }
  .picker-fade-leave-to {
    opacity: 0;
    transform: translateX(-8px);
  }
</style>
