<script setup lang="ts">
  import seedData from '~/data/ecmsSeedData.json'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'
  import type { TemplateFormData } from '~/components/dialogs/TemplateEditDialog.vue'
  import type { Branch, InspectionType, TaskCategory, TrackedStatus } from '~/types/ecms/common'
  import UnifiedTaskDialog, { type TaskData } from '~/components/dialogs/UnifiedTaskDialog.vue'

  const props = withDefaults(
    defineProps<{
      viewMode?: BrowseViewMode
    }>(),
    {
      viewMode: 'grid',
    },
  )

  interface StandardTask {
    id: string
    title: string
    description: string
    category: TaskCategory
    inspectionType: InspectionType
    usageCount: number
    lastUsed?: string | null
    tracked: TrackedStatus
    branches: Branch[]
    isStandardTaskTemplate: boolean
  }

  // Dialog state
  const viewDialogOpen = ref(false)
  const viewingTask = ref<StandardTask | null>(null)

  const editTemplateOpen = ref(false)

  const openViewDialog = (task: StandardTask) => {
    viewingTask.value = task
    viewDialogOpen.value = true
  }

  const detailTaskData = computed<TaskData | null>(() => {
    if (!viewingTask.value) return null
    return {
      id: viewingTask.value.id,
      title: viewingTask.value.title,
      description: viewingTask.value.description,
      status: 'pending',
      priority: 'medium',
      dueDate: new Date().toISOString().split('T')[0] || '',
      category: viewingTask.value.category,
      inspectionType: viewingTask.value.inspectionType,
      tracked:
        viewingTask.value.tracked === true
          ? 'tracked-corporate'
          : viewingTask.value.tracked === 'facility'
            ? 'tracked-facility'
            : 'untracked',
    }
  })

  const editInitialData = computed<Partial<TemplateFormData>>(() => {
    if (!viewingTask.value) return {}
    return {
      name: viewingTask.value.title,
      category: viewingTask.value.category,
      status: viewingTask.value.isStandardTaskTemplate ? 'Active' : 'Draft',
      description: viewingTask.value.description,
    }
  })

  const buildTemplateRows = (): StandardTask[] => {
    const taskTemplates = (seedData.taskTemplates || []) as any[]
    const taskGenerators = (seedData.taskGenerators || []) as any[]
    const tasks = (seedData.tasks || []) as any[]

    if (!taskTemplates.length) return []

    const generatorCounts: Record<string, number> = {}
    taskGenerators.forEach((generator) => {
      const templateId = generator.taskTemplateID
      if (!templateId) return
      generatorCounts[templateId] = (generatorCounts[templateId] || 0) + 1
    })

    const taskCounts: Record<string, number> = {}
    const lastUsed: Record<string, string> = {}
    tasks.forEach((task) => {
      const templateId = task.taskTemplateID
      if (!templateId) return
      taskCounts[templateId] = (taskCounts[templateId] || 0) + 1

      const date = task.dueAt || task.updatedAt
      if (!date) return
      const current = lastUsed[templateId]
      if (!current || new Date(date).getTime() > new Date(current).getTime()) {
        lastUsed[templateId] = date
      }
    })

    return taskTemplates.map((template) => {
      const templateId = template.taskTemplateID
      const usageFromTasks = taskCounts[templateId] || 0
      const usageFromGenerators = generatorCounts[templateId] || 0

      return {
        id: templateId,
        title: template.title,
        description: template.description || '',
        category: template.category,
        inspectionType: template.inspectionType,
        usageCount: Math.max(usageFromTasks, usageFromGenerators),
        lastUsed: lastUsed[templateId] || null,
        tracked: template.tracked ?? false,
        branches: template.branches || [],
        isStandardTaskTemplate: template.isStandardTaskTemplate ?? false,
      }
    })
  }

  const standardTasks = ref<StandardTask[]>(buildTemplateRows())

  const createTemplateOpen = ref(false)

  const safetyBase = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  const safetyCritical = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  const categoryColors: Record<TaskCategory, string> = {
    Air: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    Corp: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
    DOT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    EMS: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    EPCRA: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    Maintenance: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    Other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    Radiation: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    Safety: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    SPCC: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    Waste: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    Water: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Chemical Safety': safetyBase,
    'Electrical Safety': safetyBase,
    'Emergency Preparedness': safetyCritical,
    Ergonomics: safetyBase,
    'Fall Protection': safetyBase,
    'Fire Safety': safetyCritical,
    'General Safety': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Hazard Communication': safetyBase,
    'Industrial Hygiene': safetyBase,
    'Lockout/Tagout': safetyBase,
    'Machine Guarding': safetyBase,
    PPE: safetyBase,
    'Process Safety': safetyCritical,
    'Respiratory Protection': safetyBase,
    'Vehicle Safety': safetyBase,
    'Workplace Violence Prevention': safetyBase,
  }

  const categoryOptions = computed(() => {
    const categories = Array.from(new Set(standardTasks.value.map((task) => task.category))).sort((a, b) =>
      a.localeCompare(b),
    )
    return [
      { value: 'all', label: 'All Categories' },
      ...categories.map((category) => ({ value: category, label: category })),
    ]
  })

  const inspectionTypeOptions = computed(() => {
    const types = Array.from(new Set(standardTasks.value.map((task) => task.inspectionType).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b),
    )
    return [{ value: 'all', label: 'All Types' }, ...types.map((type) => ({ value: type, label: type }))]
  })

  const branchOptions = computed(() => {
    const branches = new Set<Branch>()
    standardTasks.value.forEach((task) => task.branches.forEach((branch) => branches.add(branch)))
    return [
      { value: 'all', label: 'All Branches' },
      ...Array.from(branches)
        .sort((a, b) => a.localeCompare(b))
        .map((branch) => ({ value: branch, label: branch === 'environmental' ? 'Environmental' : 'Safety' })),
    ]
  })

  const templateTypeOptions = [
    { value: 'all', label: 'All Templates' },
    { value: 'standard', label: 'Standard Templates' },
    { value: 'facility', label: 'Facility Templates' },
  ]

  const trackedOptions = [
    { value: 'all', label: 'All' },
    { value: 'true', label: 'Tracked' },
    { value: 'facility', label: 'Facility Tracked' },
    { value: 'false', label: 'Not Tracked' },
  ]

  const { browseState, filteredItems: filteredTasks } = useBrowse({
    items: standardTasks,
    searchFields: ['title', 'description', 'category'],
    defaultViewMode: 'grid',
    sortOptions: [
      { value: 'usageCount', label: 'Most Used' },
      { value: 'title', label: 'Title' },
      { value: 'lastUsed', label: 'Last Used' },
    ],
    filters: [
      {
        id: 'category',
        label: 'Category',
        icon: 'lucide:tag',
        options: categoryOptions.value,
        fn: (item, val) => item.category === val,
      },
      {
        id: 'inspectionType',
        label: 'Type',
        icon: 'lucide:clipboard-list',
        options: inspectionTypeOptions.value,
        fn: (item, val) => item.inspectionType === val,
      },
      {
        id: 'branch',
        label: 'Branch',
        icon: 'lucide:git-branch',
        options: branchOptions.value,
        fn: (item, val) => item.branches?.includes(val),
      },
      {
        id: 'templateType',
        label: 'Template Type',
        icon: 'lucide:layout-template',
        options: templateTypeOptions,
        fn: (item, val) => (val === 'standard' ? item.isStandardTaskTemplate : !item.isStandardTaskTemplate),
      },
      {
        id: 'tracked',
        label: 'Tracked',
        icon: 'lucide:bell',
        options: trackedOptions,
        fn: (item, val) => String(item.tracked) === val,
      },
    ],
  })

  const effectiveViewMode = computed(() => props.viewMode)

  // Navigation for dialog
  const viewingTaskIndex = computed(() => {
    if (!viewingTask.value) return -1
    return standardTasks.value.findIndex((t) => t.id === viewingTask.value?.id)
  })
  const canNavigatePrev = computed(() => viewingTaskIndex.value > 0)
  const canNavigateNext = computed(() => viewingTaskIndex.value < standardTasks.value.length - 1)
  const navigateToPrevTask = () => {
    if (canNavigatePrev.value) viewingTask.value = standardTasks.value[viewingTaskIndex.value - 1] ?? null
  }
  const navigateToNextTask = () => {
    if (canNavigateNext.value) viewingTask.value = standardTasks.value[viewingTaskIndex.value + 1] ?? null
  }

  const _handleEditTask = (task: StandardTask) => {
    viewingTask.value = task
    editTemplateOpen.value = true
  }

  const _handleDeleteTask = (task: StandardTask) => {
    standardTasks.value = standardTasks.value.filter((t) => t.id !== task.id)
    viewDialogOpen.value = false
  }

  const handleSaveTemplate = (data: TemplateFormData) => {
    if (!viewingTask.value) return
    const idx = standardTasks.value.findIndex((t) => t.id === viewingTask.value?.id)
    if (idx === -1) return
    const current = standardTasks.value[idx]
    if (!current) return
    const updated: StandardTask = {
      ...current,
      title: data.name,
      category: data.category as TaskCategory,
      description: data.description || current.description,
    }
    standardTasks.value[idx] = updated
    standardTasks.value = [...standardTasks.value]
    viewingTask.value = updated
    editTemplateOpen.value = false
  }

  const useTemplate = () => {
    // TODO: Create a new task from this template
  }

  defineExpose({
    browseState,
    stats: computed(() => [
      { label: 'Total Templates', value: standardTasks.value.length, icon: 'lucide:layout-template' },
      {
        label: 'Tracked',
        value: standardTasks.value.filter((t) => t.tracked).length,
        icon: 'lucide:bell',
        color: 'text-emerald-500',
      },
      {
        label: 'Most Used',
        value: Math.max(0, ...standardTasks.value.map((t) => t.usageCount)),
        icon: 'lucide:trending-up',
        color: 'text-blue-500',
      },
    ]),
    createTemplateOpen,
  })
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Grid View -->
    <div v-if="effectiveViewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="task in filteredTasks"
        :key="task.id"
        class="relative overflow-hidden hover:bg-accent/30 transition-colors cursor-pointer"
        @click="openViewDialog(task)">
        <div
          class="absolute top-0 left-0 w-1 h-full"
          :class="task.tracked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'" />
        <UiCardHeader class="pb-2">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <Icon name="lucide:layout-template" class="h-4 w-4 text-muted-foreground" />
            </div>
            <span
              v-if="task.tracked"
              class="rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
              <Icon name="lucide:bell" class="h-3 w-3" />
              Tracked
            </span>
          </div>
          <UiCardTitle class="text-base mt-2">{{ task.title }}</UiCardTitle>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-3">
          <span
            :class="[
              'rounded-full px-2 py-0.5 text-xs font-medium inline-block',
              categoryColors[task.category] || 'bg-gray-100 text-gray-600',
            ]">
            {{ task.category }}
          </span>
          <div class="flex items-center justify-between text-sm text-muted-foreground">
            <div class="flex items-center gap-1">
              <Icon name="lucide:repeat" class="h-3 w-3" />
              <span>{{ task.usageCount }} uses</span>
            </div>
            <span>Last: {{ task.lastUsed || '—' }}</span>
          </div>
        </UiCardContent>
        <UiCardFooter class="pt-0 gap-2">
          <UiButton variant="outline" size="sm" class="flex-1" @click.stop="openViewDialog(task)">
            <Icon name="lucide:eye" class="mr-2 h-4 w-4" />
            View
          </UiButton>
          <UiButton size="sm" class="flex-1" @click.stop="useTemplate()">
            <Icon name="lucide:play" class="mr-2 h-4 w-4" />
            Use
          </UiButton>
        </UiCardFooter>
      </UiCard>
    </div>

    <!-- List View -->
    <div v-else-if="effectiveViewMode === 'list'" class="space-y-2">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        @click="openViewDialog(task)">
        <Icon name="lucide:layout-template" class="h-5 w-5 text-muted-foreground shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ task.title }}</p>
          <p class="text-sm text-muted-foreground">{{ task.usageCount }} uses · Last used {{ task.lastUsed || '—' }}</p>
        </div>
        <span
          :class="[
            'rounded-full px-2 py-1 text-xs font-medium shrink-0',
            categoryColors[task.category] || 'bg-gray-100 text-gray-600',
          ]">
          {{ task.category }}
        </span>
        <span
          v-if="task.tracked"
          class="rounded-full px-2 py-1 text-xs font-medium shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1">
          <Icon name="lucide:bell" class="h-3 w-3" />
          Tracked
        </span>
        <UiButton variant="outline" size="sm" @click.stop="openViewDialog(task)">Open</UiButton>
      </div>
    </div>

    <!-- Table View -->
    <div v-else-if="effectiveViewMode === 'table'" class="overflow-hidden rounded-xl border border-border bg-card">
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead>Template</UiTableHead>
            <UiTableHead>Category</UiTableHead>
            <UiTableHead>Usage</UiTableHead>
            <UiTableHead>Last Used</UiTableHead>
            <UiTableHead>Tracked</UiTableHead>
            <UiTableHead class="w-24">Actions</UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow
            v-for="task in filteredTasks"
            :key="task.id"
            class="cursor-pointer hover:bg-muted/50"
            @click="openViewDialog(task)">
            <UiTableCell>
              <div class="flex items-center gap-2">
                <Icon name="lucide:layout-template" class="h-4 w-4 text-muted-foreground" />
                <span class="font-medium">{{ task.title }}</span>
              </div>
            </UiTableCell>
            <UiTableCell>
              <span
                :class="[
                  'rounded-full px-2 py-1 text-xs font-medium',
                  categoryColors[task.category] || 'bg-gray-100 text-gray-600',
                ]">
                {{ task.category }}
              </span>
            </UiTableCell>
            <UiTableCell class="text-muted-foreground">{{ task.usageCount }} uses</UiTableCell>
            <UiTableCell class="text-muted-foreground">{{ task.lastUsed }}</UiTableCell>
            <UiTableCell>
              <span
                v-if="task.tracked"
                class="rounded-full px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center gap-1 w-fit">
                <Icon name="lucide:bell" class="h-3 w-3" />
                Yes
              </span>
              <span v-else class="text-muted-foreground">No</span>
            </UiTableCell>
            <UiTableCell>
              <UiButton variant="outline" size="sm" @click.stop="openViewDialog(task)">Open</UiButton>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>

    <div class="text-sm text-muted-foreground mt-4 pt-4 border-t border-border">
      Showing {{ filteredTasks.length }} templates
    </div>

    <!-- Create Template Dialog -->
    <UiDialog v-model:open="createTemplateOpen">
      <UiDialogContent class="max-w-[600px] w-[95vw]">
        <UiDialogHeader>
          <div class="flex items-center gap-3 mb-2">
            <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon name="lucide:layout-template" class="h-5 w-5 text-primary" />
            </div>
            <div>
              <UiDialogTitle>New Template</UiDialogTitle>
              <UiDialogDescription>
                Create a reusable task template for recurring compliance workflows.
              </UiDialogDescription>
            </div>
          </div>
        </UiDialogHeader>
        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <UiLabel class="flex items-center gap-1">
              Template Name
              <span class="text-destructive">*</span>
            </UiLabel>
            <UiInput placeholder="e.g., Monthly Emissions Report" />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <UiLabel>Category</UiLabel>
              <UiSelect>
                <UiSelectTrigger>
                  <UiSelectValue placeholder="Select category" />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="Safety">Safety</UiSelectItem>
                  <UiSelectItem value="Permits">Permits</UiSelectItem>
                  <UiSelectItem value="Water">Water</UiSelectItem>
                  <UiSelectItem value="Air Quality">Air Quality</UiSelectItem>
                  <UiSelectItem value="Training">Training</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div class="space-y-2">
              <UiLabel>Tracked</UiLabel>
              <div class="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
                <input type="checkbox" class="h-4 w-4 rounded border-gray-300" />
                <span class="text-sm text-muted-foreground">Enable escalation tracking</span>
              </div>
            </div>
          </div>
          <div class="space-y-2">
            <UiLabel>Description</UiLabel>
            <UiTextarea placeholder="Describe what this template is used for..." :rows="3" />
          </div>
        </div>
        <UiDialogFooter>
          <UiButton variant="outline" @click="createTemplateOpen = false">Cancel</UiButton>
          <UiButton @click="createTemplateOpen = false">
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            Create Template
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>

    <!-- View Template Dialog (using UnifiedTaskDialog) -->
    <UnifiedTaskDialog
      v-model:open="viewDialogOpen"
      :task="detailTaskData"
      mode="edit"
      task-type="template"
      :can-navigate-prev="canNavigatePrev"
      :can-navigate-next="canNavigateNext"
      @navigate-prev="navigateToPrevTask"
      @navigate-next="navigateToNextTask"
      @save="
        (data) =>
          handleSaveTemplate({
            name: data.title || '',
            description: data.description || '',
            category: data.category || '',
            status: 'Active',
          })
      "
      @close="viewDialogOpen = false">
      <!-- Template Info Content -->
      <template #content>
        <div v-if="viewingTask" class="space-y-4">
          <div class="rounded-lg bg-muted/50 border border-border p-4">
            <div class="flex items-start gap-3">
              <Icon name="lucide:layout-template" class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p class="text-sm font-medium">Reusable Task Template</p>
                <p class="text-sm text-muted-foreground mt-1">
                  This template has been used {{ viewingTask.usageCount }} times.
                  <template v-if="viewingTask.lastUsed">Last used on {{ viewingTask.lastUsed }}.</template>
                  <template v-else>Never used yet.</template>
                </p>
              </div>
            </div>
          </div>
          <UiButton
            class="w-full"
            @click="
              () => {
                if (!viewingTask) return
                useTemplate()
                viewDialogOpen = false
              }
            ">
            <Icon name="lucide:play" class="mr-2 h-4 w-4" />
            Use This Template
          </UiButton>
        </div>
      </template>
    </UnifiedTaskDialog>

    <!-- Edit Template Overlay (opens on top of detail dialog) -->
    <TemplateEditDialog
      v-model:open="editTemplateOpen"
      :initial-data="editInitialData"
      overlay-class="bg-background/15"
      @save="handleSaveTemplate"
      @close="editTemplateOpen = false" />
  </div>
</template>
