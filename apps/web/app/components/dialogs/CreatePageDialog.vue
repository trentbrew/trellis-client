<script setup lang="ts">
  import { ENTITY_TYPES } from '~/lib/systemTypes'
  import { useOntologyRegistry } from '~/composables/useOntologyRegistry'

  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    created: [page: { id: string; title: string }]
  }>()

  const { createPage } = usePages()
  const { filteredDynamicTypes: ontologyTypes } = useOntologyRegistry()

  const title = ref('');
  const icon = ref('lucide:file-text')
  const dataSource = ref('')
  const defaultProjection = ref('table')
  const isSubmitting = ref(false)

  // Build data source options grouped by category
  interface DataSourceOption {
    value: string
    label: string
    icon: string
    group: string
  }

  const dataSourceOptions = computed<DataSourceOption[]>(() => {
    // Schema.org entity types (can hold user data)
    const entityOpts: DataSourceOption[] = ENTITY_TYPES.map((t) => ({
      value: t.id.toLowerCase(),
      label: t.name,
      icon: t.icon || 'lucide:box',
      group: 'Entity',
    }))

    // CalendarItem-specific types not in ENTITY_TYPES
    const calendarTypes: DataSourceOption[] = [
      { value: 'task', label: 'Task', icon: 'lucide:check-square', group: 'Entity' },
      { value: 'note', label: 'Note', icon: 'lucide:sticky-note', group: 'Entity' },
      { value: 'project', label: 'Project', icon: 'lucide:folder-kanban', group: 'Entity' },
      { value: 'bookmark', label: 'Bookmark', icon: 'lucide:bookmark', group: 'Entity' },
    ]

    // Custom ontology types
    const customOpts: DataSourceOption[] = (ontologyTypes.value || []).map((t) => ({
      value: t.type,
      label: t.label,
      icon: t.icon || 'lucide:database',
      group: 'Custom',
    }))

    // Deduplicate: calendarTypes may overlap with entityOpts (e.g. 'event')
    const entityIds = new Set(entityOpts.map((o) => o.value))
    const uniqueCalendarTypes = calendarTypes.filter((ct) => !entityIds.has(ct.value))

    return [
      { value: 'all', label: 'All Entities', icon: 'lucide:layers', group: 'General' },
      ...entityOpts,
      ...uniqueCalendarTypes,
      ...customOpts,
    ]
  })

  const projectionOptions = [
    { value: 'table', label: 'Table', icon: 'lucide:table' },
    { value: 'list', label: 'List', icon: 'lucide:list' },
    { value: 'kanban', label: 'Kanban', icon: 'lucide:layout-grid' },
    { value: 'calendar', label: 'Calendar', icon: 'lucide:calendar' },
  ]

  const resetForm = () => {
    title.value = ''
    icon.value = 'lucide:file-text'
    dataSource.value = ''
    defaultProjection.value = 'table'
  }

  const handleSubmit = async () => {
    if (!title.value.trim()) return
    if (!dataSource.value) return

    isSubmitting.value = true
    try {
      const id = await createPage({
        title: title.value.trim(),
        icon: icon.value,
        dataSource: dataSource.value,
        defaultProjection: defaultProjection.value,
      })

      emit('created', { id, title: title.value.trim() })
      emit('update:open', false)
      resetForm()

      // Navigate to the new page
      await navigateTo(`/workspace/pages/${id}`)
    } catch (e) {
      console.error('Failed to create page:', e)
    } finally {
      isSubmitting.value = false
    }
  }

  const handleClose = () => {
    emit('update:open', false)
    resetForm()
  }

  // Auto-suggest title from data source
  watch(dataSource, (ds) => {
    if (title.value) return // Don't overwrite if user already typed
    const opt = dataSourceOptions.value.find((o) => o.value === ds)
    if (opt && opt.value !== 'all') {
      title.value = `My ${opt.label}`
    }
  })
</script>

<template>
  <UiDialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <UiDialogContent
      :hide-close="true"
      class="p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0 w-[min(480px,calc(100vw-4rem))]!">
      <!-- Accessible labels -->
      <UiDialogTitle class="sr-only">Create Page</UiDialogTitle>
      <UiDialogDescription class="sr-only">Create a new page in your workspace</UiDialogDescription>

      <!-- Header -->
      <div class="shrink-0 border-b border-border px-5 py-4 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="lucide:file-plus" class="h-5 w-5 text-muted-foreground" />
          <span class="font-semibold text-sm">New Page</span>
        </div>
        <button class="text-muted-foreground hover:text-foreground" @click="handleClose">
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </div>

      <!-- Form -->
      <div class="flex-1 p-5 space-y-4">
        <!-- Title -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</label>
          <input
            v-model="title"
            type="text"
            placeholder="Untitled"
            autofocus
            class="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring" />
        </div>

        <!-- Data Source -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data Source</label>
          <select
            v-model="dataSource"
            class="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer">
            <option value="" disabled>Select a data source...</option>
            <optgroup
              v-for="group in ['General', 'Entity', 'Custom']"
              :key="group"
              :label="group">
              <option
                v-for="opt in dataSourceOptions.filter((o) => o.group === group)"
                :key="opt.value"
                :value="opt.value">
                {{ opt.label }}
              </option>
            </optgroup>
          </select>
        </div>

        <!-- Default View -->
        <div class="space-y-1.5">
          <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Default View</label>
          <div class="flex gap-2">
            <button
              v-for="proj in projectionOptions"
              :key="proj.value"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              :class="defaultProjection === proj.value
                ? 'bg-foreground text-background'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'"
              @click="defaultProjection = proj.value">
              <Icon :name="proj.icon" class="h-3.5 w-3.5" />
              {{ proj.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-border px-5 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <span class="text-xs text-muted-foreground">
          Pages appear in your workspace sidebar
        </span>
        <div class="flex items-center gap-2">
          <UiButton variant="ghost" size="sm" @click="handleClose">
            Cancel
          </UiButton>
          <UiButton
            size="sm"
            :disabled="!title.trim() || !dataSource || isSubmitting"
            @click="handleSubmit">
            <Icon v-if="isSubmitting" name="lucide:loader-2" class="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Create
          </UiButton>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
