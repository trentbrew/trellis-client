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

  // ── Wizard state ─────────────────────────────────────────────────────
  const currentStep = ref(0)
  const totalSteps = 3
  const stepLabels = ['Data Source', 'View Type', 'Layout']

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

  function handleSelectSource(source: string) {
    selectedSource.value = source
    currentStep.value = 1
  }

  function handleSelectProjection(proj: ProjectionType) {
    selectedProjection.value = proj
    currentStep.value = 2
  }

  function handleCreate() {
    if (!canCreate.value) return
    emit('create-view', selectedSource.value, selectedProjection.value)
  }

  function goBack() {
    if (currentStep.value > 0) currentStep.value--
  }

  const progressPercent = computed(() => ((currentStep.value + 1) / totalSteps) * 100)
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] px-4">
    <div class="w-full max-w-lg space-y-6">
      <!-- Progress bar -->
      <div class="space-y-3">
        <div class="flex items-center justify-between text-[11px] text-muted-foreground">
          <button
            v-for="(label, i) in stepLabels"
            :key="i"
            class="flex items-center gap-1.5 transition-colors"
            :class="[
              i < currentStep ? 'text-primary cursor-pointer' : '',
              i === currentStep ? 'text-foreground font-medium' : '',
              i > currentStep ? 'text-muted-foreground/40' : '',
            ]"
            :disabled="i > currentStep"
            @click="i < currentStep ? currentStep = i : undefined">
            <span
              class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold border transition-colors"
              :class="[
                i < currentStep ? 'bg-primary text-primary-foreground border-primary' : '',
                i === currentStep ? 'bg-foreground text-background border-foreground' : '',
                i > currentStep ? 'border-border text-muted-foreground/40' : '',
              ]">
              <Icon v-if="i < currentStep" name="lucide:check" class="h-3 w-3" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            {{ label }}
          </button>
        </div>
        <div class="h-1 rounded-full bg-muted/50 overflow-hidden">
          <div
            class="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>

      <!-- Step 0: Data Source -->
      <Transition name="fade" mode="out-in">
        <div v-if="currentStep === 0" key="step-0" class="space-y-4">
          <div class="text-center space-y-2">
            <div class="mx-auto w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <Icon name="lucide:database" class="h-6 w-6 text-muted-foreground/60" />
            </div>
            <h3 class="text-lg font-semibold">Choose a data source</h3>
            <p class="text-sm text-muted-foreground">
              What kind of data should this view display?
            </p>
          </div>

          <div class="rounded-xl border border-border bg-card/50 p-5">
            <div class="flex flex-wrap gap-1.5">
              <button
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors border"
                :class="selectedSource === 'all'
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'"
                @click="handleSelectSource('all')">
                <Icon name="lucide:layers" class="h-3.5 w-3.5" />
                All
              </button>
              <button
                v-for="opt in entityTypeOptions"
                :key="opt.value"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-colors border"
                :class="selectedSource === opt.value
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'"
                @click="handleSelectSource(opt.value)">
                <Icon :name="opt.icon" class="h-3.5 w-3.5" />
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Step 1: View Type -->
        <div v-else-if="currentStep === 1" key="step-1" class="space-y-4">
          <div class="text-center space-y-2">
            <div class="mx-auto w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <Icon name="lucide:layout-grid" class="h-6 w-6 text-muted-foreground/60" />
            </div>
            <h3 class="text-lg font-semibold">Choose a view type</h3>
            <p class="text-sm text-muted-foreground">
              How would you like to visualize your
              <span class="font-medium text-foreground">{{ selectedSource === 'all' ? 'data' : selectedSource + ' items' }}</span>?
            </p>
          </div>

          <div class="rounded-xl border border-border bg-card/50 p-5">
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="proj in availableProjections"
                :key="proj.value"
                class="flex flex-col items-center gap-2 p-3 rounded-lg text-xs transition-colors border"
                :class="selectedProjection === proj.value
                  ? 'bg-foreground text-background border-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'"
                @click="handleSelectProjection(proj.value)">
                <Icon :name="proj.icon" class="h-5 w-5" />
                <span class="font-medium">{{ proj.label }}</span>
              </button>
            </div>
            <p v-if="selectedSource && selectedSource !== 'all'" class="text-[10px] text-muted-foreground/60 mt-3 text-center">
              Showing views supported by {{ selectedSource }} entities
            </p>
          </div>

          <div class="flex items-center gap-2">
            <UiButton variant="ghost" size="sm" @click="goBack">
              <Icon name="lucide:arrow-left" class="h-3.5 w-3.5 mr-1.5" />
              Back
            </UiButton>
          </div>
        </div>

        <!-- Step 2: Layout / Template -->
        <div v-else-if="currentStep === 2" key="step-2" class="space-y-4">
          <div class="text-center space-y-2">
            <div class="mx-auto w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <Icon name="lucide:layout-template" class="h-6 w-6 text-muted-foreground/60" />
            </div>
            <h3 class="text-lg font-semibold">Choose a layout</h3>
            <p class="text-sm text-muted-foreground">
              Start with a single view or pick a multi-view template.
            </p>
          </div>

          <!-- Create single view -->
          <UiButton
            class="w-full"
            size="lg"
            :disabled="!canCreate"
            @click="handleCreate">
            <Icon name="lucide:plus" class="h-4 w-4 mr-2" />
            Create Single View
          </UiButton>

          <!-- Templates -->
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

          <div class="flex items-center gap-2">
            <UiButton variant="ghost" size="sm" @click="goBack">
              <Icon name="lucide:arrow-left" class="h-3.5 w-3.5 mr-1.5" />
              Back
            </UiButton>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>
