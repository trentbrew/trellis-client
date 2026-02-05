<script setup lang="ts">
  import type { DetailField } from '~/composables/useDetailDialog'
  import {
    useGlobalDetailSheetRefs,
    type EntityDetailVariant,
    type DetailSheetVariant,
  } from '~/composables/useGlobalDetailSheet'
  import { getSchemaForEntityType, getNodeTitle, extractNodeValue } from '~/lib/detailSchema'
  import { useEcmsData } from '~/composables/useEcmsData'
  import UnifiedTaskDialog from './UnifiedTaskDialog.vue'
  import type { TaskData } from './UnifiedTaskDialog.vue'

  const { state, close, setMode, setVariant, updateField } = useGlobalDetailSheetRefs()
  const ecmsData = useEcmsData().loadSeedData()

  const owners = computed(() => {
    const users = ecmsData?.users || []
    const mapped = users.map((u: any) => ({
      id: u.uid || u.id,
      name: u.name || (u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.email || 'Unknown'),
    }))
    return mapped
  })

  const folders = computed(() => {
    const data = (ecmsData?.folders || []).map((f: any) => (typeof f === 'string' ? f : f.name))
    return data
  })

  const templates = computed(() => {
    return (ecmsData?.taskTemplates || []).map((t: any) => ({
      id: t.taskTemplateID,
      name: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
    }))
  })

  // Variant options for the toggle
  const variantOptions: { value: DetailSheetVariant; icon: string; label: string }[] = [
    { value: 'sheet', icon: 'lucide:panel-right', label: 'Side panel' },
    { value: 'dialog', icon: 'lucide:square', label: 'Center dialog' },
    { value: 'fullscreen', icon: 'lucide:maximize-2', label: 'Fullscreen' },
  ]
  const { userRole } = useUserRole()

  // Determine if user can edit (admin only by default)
  const canEdit = computed(() => {
    return state.value.canEdit && ['admin', 'super_admin', 'corporate_admin'].includes(userRole.value)
  })

  // Get schema for current entity type
  const schema = computed(() => {
    return getSchemaForEntityType(state.value.entityType)
  })

  // Resolved title based on mode and item
  const resolvedTitle = computed(() => {
    const node = state.value.currentNode
    const mode = state.value.mode

    if (mode === 'create') return `New ${entityConfig[state.value.entityType]?.title || 'Item'}`
    if (mode === 'edit') return `Edit ${entityConfig[state.value.entityType]?.title || 'Item'}`
    return node ? getNodeTitle(node) : 'Details'
  })

  // Entity config for icons and descriptions
  const entityConfig: Record<EntityDetailVariant, { title: string; icon: string; description?: string }> = {
    task: { title: 'Task', icon: 'lucide:check-square', description: 'Task details and status' },
    event: { title: 'Event', icon: 'lucide:calendar-days', description: 'Event information' },
    payment: { title: 'Payment', icon: 'lucide:credit-card', description: 'Payment details' },
    deadline: { title: 'Deadline', icon: 'lucide:alarm-clock', description: 'Deadline information' },
    reminder: { title: 'Reminder', icon: 'lucide:bell', description: 'Reminder details' },
    permit: { title: 'Permit', icon: 'lucide:file-badge', description: 'Permit information' },
    folder: { title: 'Folder', icon: 'lucide:folder', description: 'Folder details' },
    document: { title: 'Document', icon: 'lucide:file-text', description: 'Document information' },
    default: { title: 'Item', icon: 'lucide:box', description: 'Item details' },
  }

  const currentConfig = computed(() => entityConfig[state.value.entityType] || entityConfig.default)

  // Check if we're in editable moden
  const isEditable = computed(() => state.value.mode !== 'view')

  // Get field value (from formData in edit mode, currentNode in view mode)
  function getFieldValue(field: DetailField<any>) {
    const key = field.key as string
    if (isEditable.value) {
      return state.value.formData[key]
    }
    return extractNodeValue(state.value.currentNode || {}, key)
  }

  // Set field value in form data
  function setFieldValue(field: DetailField<any>, value: any) {
    updateField(field.key as string, value)
  }

  // Render display value for view mode
  function renderDisplayValue(field: DetailField<any>): string {
    const value = extractNodeValue(state.value.currentNode || {}, field.key as string)

    if (field.renderValue) {
      return field.renderValue(value, state.value.currentNode)
    }

    if (field.variant === 'select' && field.options) {
      const option = field.options.find((o) => o.value === value)
      return option?.label || value || '—'
    }

    if (field.variant === 'multiselect' && field.options && Array.isArray(value)) {
      return value.map((v) => field.options?.find((o) => o.value === v)?.label || v).join(', ') || '—'
    }

    if (field.variant === 'checkbox') {
      return value ? 'Yes' : 'No'
    }

    if (field.variant === 'date' && value) {
      return new Date(value).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    return value?.toString() || '—'
  }

  // Get badge color for select fields
  function getBadgeColor(field: DetailField<any>): string {
    const value = extractNodeValue(state.value.currentNode || {}, field.key as string)
    if (field.badgeColor) {
      return field.badgeColor(value)
    }
    if (field.variant === 'select' && field.options) {
      const option = field.options.find((o) => o.value === value)
      return option?.color || 'bg-muted text-muted-foreground'
    }
    return 'bg-muted text-muted-foreground'
  }

  // Handle save
  async function handleSave() {
    // Emit custom event for parent to handle
    const event = new CustomEvent('global-detail-sheet:save', {
      detail: {
        node: state.value.currentNode,
        formData: state.value.formData,
        entityType: state.value.entityType,
        mode: state.value.mode,
      },
    })
    window.dispatchEvent(event)
    close()
  }

  // Handle task save from UnifiedTaskDialog
  async function handleTaskSave(task: TaskData) {
    const event = new CustomEvent('global-detail-sheet:save', {
      detail: {
        node: state.value.currentNode,
        formData: task,
        entityType: state.value.entityType,
        mode: state.value.mode,
      },
    })
    window.dispatchEvent(event)
    close()
  }

  // Handle delete
  async function handleDelete() {
    const event = new CustomEvent('global-detail-sheet:delete', {
      detail: {
        node: state.value.currentNode,
        entityType: state.value.entityType,
      },
    })
    window.dispatchEvent(event)
    close()
  }

  // Filter fields based on mode
  const visibleFields = computed(() => {
    return schema.value.fields.filter((field) => {
      if (state.value.mode === 'create' && field.hideInCreate) return false
      if (state.value.mode === 'view' && field.hideInView) return false
      if (state.value.mode === 'edit' && field.hideInEdit) return false
      return true
    })
  })
</script>

<template>
  <div v-if="state.isOpen">
    <!-- Legacy EntityDetailSheet for non-task entities -->
    <template v-if="state.entityType !== 'task'">
      <!-- ==================== SHEET VARIANT ==================== -->
      <UiSheet v-if="state.variant === 'sheet'" :open="state.isOpen" @update:open="(val) => !val && close()">
        <UiSheetContent
          side="right"
          class="flex flex-col overflow-hidden"
          :is-blurred="false"
          :default-width="50"
          :min-width="30"
          :max-width="80">
          <!-- Hide default close button -->
          <template #close><span /></template>

          <!-- Custom Header -->
          <template #header>
            <div class="flex items-start gap-4 border-b border-border/50 px-6 py-4 bg-background shrink-0">
              <!-- Entity Icon -->
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform hover:scale-105">
                <Icon :name="currentConfig.icon" class="h-6 w-6" />
              </div>

              <div class="flex-1 min-w-0">
                <UiSheetTitle class="text-lg font-semibold truncate">{{ resolvedTitle }}</UiSheetTitle>
                <UiSheetDescription v-if="currentConfig.description" class="text-sm text-muted-foreground mt-0.5">
                  {{ currentConfig.description }}
                </UiSheetDescription>

                <!-- Mode indicator badge -->
                <div class="flex items-center gap-2 mt-2">
                  <span
                    v-if="state.mode === 'edit'"
                    class="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <Icon name="lucide:pencil" class="h-3 w-3" />
                    Editing
                  </span>
                  <span
                    v-else-if="state.mode === 'create'"
                    class="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <Icon name="lucide:plus" class="h-3 w-3" />
                    New
                  </span>
                  <span
                    v-if="!canEdit && state.mode === 'view'"
                    class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    <Icon name="lucide:eye" class="h-3 w-3" />
                    View Only
                  </span>
                </div>
              </div>

              <!-- Variant toggle & Close button -->
              <div class="flex items-center gap-1 shrink-0">
                <div class="flex items-center rounded-md border border-border/50 p-0.5 bg-muted/50">
                  <UiButton
                    v-for="opt in variantOptions"
                    :key="opt.value"
                    variant="ghost"
                    size="icon-sm"
                    class="h-7 w-7 rounded-sm p-0"
                    :class="[
                      state.variant === opt.value
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    ]"
                    :title="opt.label"
                    @click="setVariant(opt.value)">
                    <Icon :name="opt.icon" class="h-3.5 w-3.5" />
                  </UiButton>
                </div>
                <UiButton variant="ghost" size="icon-sm" title="Close" @click="close()">
                  <Icon name="lucide:x" class="h-4 w-4" />
                </UiButton>
              </div>
            </div>
          </template>

          <!-- Content Area -->
          <div class="py-6 px-6">
            <div class="grid gap-6">
              <div
                v-for="field in visibleFields"
                :key="String(field.key)"
                :class="[field.colSpan === 2 ? 'col-span-2' : '']">
                <div class="space-y-1.5">
                  <label
                    class="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Icon v-if="field.icon" :name="field.icon" class="h-3.5 w-3.5" />
                    {{ field.label }}
                  </label>

                  <template v-if="state.mode === 'view'">
                    <div v-if="field.variant === 'badge' || (field.variant === 'select' && field.badgeColor)">
                      <span :class="['inline-flex rounded-full px-3 py-1 text-sm font-medium', getBadgeColor(field)]">
                        {{ renderDisplayValue(field) }}
                      </span>
                    </div>
                    <p v-else class="text-sm text-foreground leading-relaxed">{{ renderDisplayValue(field) }}</p>
                  </template>
                  <template v-else>
                    <UiInput
                      v-if="field.variant === 'text' || field.variant === 'email'"
                      :type="field.variant === 'email' ? 'email' : 'text'"
                      :model-value="getFieldValue(field)"
                      :placeholder="field.placeholder"
                      :disabled="field.readOnly"
                      @update:model-value="setFieldValue(field, $event)" />
                    <UiInput
                      v-else-if="field.variant === 'number'"
                      type="number"
                      :model-value="getFieldValue(field)"
                      :placeholder="field.placeholder"
                      :disabled="field.readOnly"
                      @update:model-value="setFieldValue(field, $event)" />
                    <UiTextarea
                      v-else-if="field.variant === 'textarea'"
                      :model-value="getFieldValue(field)"
                      :placeholder="field.placeholder"
                      :disabled="field.readOnly"
                      :rows="3"
                      @update:model-value="setFieldValue(field, $event)" />
                    <UiInput
                      v-else-if="field.variant === 'date'"
                      type="date"
                      :model-value="getFieldValue(field)"
                      :disabled="field.readOnly"
                      @update:model-value="setFieldValue(field, $event)" />
                    <UiSelect
                      v-else-if="field.variant === 'select'"
                      :model-value="getFieldValue(field)"
                      :disabled="field.readOnly"
                      @update:model-value="setFieldValue(field, $event)">
                      <UiSelectTrigger>
                        <UiSelectValue :placeholder="field.placeholder || 'Select...'" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem v-for="opt in field.options" :key="opt.value" :value="opt.value">
                          <div class="flex items-center gap-2">
                            <span v-if="opt.color" :class="['h-2 w-2 rounded-full', opt.color.split(' ')[0]]" />
                            <Icon v-if="opt.icon" :name="opt.icon" class="h-4 w-4" />
                            {{ opt.label }}
                          </div>
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                    <div v-else-if="field.variant === 'multiselect'" class="flex flex-wrap gap-2">
                      <label
                        v-for="opt in field.options"
                        :key="opt.value"
                        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
                        :class="[
                          (getFieldValue(field) || []).includes(opt.value)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted/50 border-border hover:bg-muted',
                        ]">
                        <input
                          type="checkbox"
                          class="sr-only"
                          :checked="(getFieldValue(field) || []).includes(opt.value)"
                          :disabled="field.readOnly"
                          @change="
                            setFieldValue(
                              field,
                              ($event.target as HTMLInputElement).checked
                                ? [...(getFieldValue(field) || []), opt.value]
                                : (getFieldValue(field) || []).filter((v: string) => v !== opt.value),
                            )
                          " />
                        <span v-if="opt.color" :class="['h-2 w-2 rounded-full', opt.color.split(' ')[0]]" />
                        <Icon v-if="opt.icon" :name="opt.icon" class="h-3.5 w-3.5" />
                        <span class="text-sm">{{ opt.label }}</span>
                      </label>
                    </div>
                    <div v-else-if="field.variant === 'checkbox'" class="flex items-center gap-2">
                      <UiCheckbox
                        :checked="getFieldValue(field)"
                        :disabled="field.readOnly"
                        @update:checked="setFieldValue(field, $event)" />
                      <span class="text-sm text-muted-foreground">{{ field.description }}</span>
                    </div>
                    <p
                      v-if="field.description && field.variant !== 'checkbox'"
                      class="text-xs text-muted-foreground mt-1">
                      {{ field.description }}
                    </p>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <template #footer>
            <div
              class="flex flex-row items-center justify-between border-t border-border/50 px-6 py-4 bg-background shrink-0">
              <template v-if="state.mode === 'view'">
                <UiButton variant="destructive" size="sm" :disabled="state.isLoading" @click="handleDelete">
                  <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                  Delete
                </UiButton>
                <div class="flex items-center gap-2">
                  <UiButton variant="outline" @click="close()">Close</UiButton>
                  <UiButton v-if="canEdit" @click="setMode('edit')">
                    <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                    Edit
                  </UiButton>
                </div>
              </template>
              <template v-else>
                <div />
                <div class="flex items-center gap-2">
                  <UiButton variant="outline" @click="state.mode === 'create' ? close() : setMode('view')">
                    Cancel
                  </UiButton>
                  <UiButton :disabled="state.isLoading" @click="handleSave">
                    <Icon v-if="state.isLoading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
                    <Icon v-else name="lucide:check" class="mr-2 h-4 w-4" />
                    {{ state.mode === 'create' ? 'Create' : 'Save Changes' }}
                  </UiButton>
                </div>
              </template>
            </div>
          </template>
        </UiSheetContent>
      </UiSheet>

      <!-- ==================== DIALOG VARIANT ==================== -->
      <UiDialog v-else-if="state.variant === 'dialog'" :open="state.isOpen" @update:open="(val) => !val && close()">
        <UiDialogContent class="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden" :hide-close="true">
          <!-- Custom Header -->
          <div class="flex items-start gap-4 border-b border-border/50 px-6 py-4 bg-background shrink-0">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform hover:scale-105">
              <Icon :name="currentConfig.icon" class="h-6 w-6" />
            </div>
            <div class="flex-1 min-w-0">
              <UiDialogTitle class="text-lg font-semibold truncate">{{ resolvedTitle }}</UiDialogTitle>
              <UiDialogDescription v-if="currentConfig.description" class="text-sm text-muted-foreground mt-0.5">
                {{ currentConfig.description }}
              </UiDialogDescription>

              <!-- Mode indicator badge -->
              <div class="flex items-center gap-2 mt-2">
                <span
                  v-if="state.mode === 'edit'"
                  class="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <Icon name="lucide:pencil" class="h-3 w-3" />
                  Editing
                </span>
                <span
                  v-else-if="state.mode === 'create'"
                  class="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <Icon name="lucide:plus" class="h-3 w-3" />
                  New
                </span>
                <span
                  v-if="!canEdit && state.mode === 'view'"
                  class="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <Icon name="lucide:eye" class="h-3 w-3" />
                  View Only
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <div class="flex items-center rounded-md border border-border/50 p-0.5 bg-muted/50">
                <UiButton
                  v-for="opt in variantOptions"
                  :key="opt.value"
                  variant="ghost"
                  size="icon-sm"
                  class="h-7 w-7 rounded-sm p-0"
                  :class="[
                    state.variant === opt.value
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  ]"
                  :title="opt.label"
                  @click="setVariant(opt.value)">
                  <Icon :name="opt.icon" class="h-3.5 w-3.5" />
                </UiButton>
              </div>
              <UiButton variant="ghost" size="icon-sm" title="Close" @click="close()">
                <Icon name="lucide:x" class="h-4 w-4" />
              </UiButton>
            </div>
          </div>
          <!-- Content Area -->
          <div class="flex-1 overflow-y-auto py-6 px-6">
            <div class="grid gap-6">
              <div
                v-for="field in visibleFields"
                :key="String(field.key)"
                :class="[field.colSpan === 2 ? 'col-span-2' : '']">
                <div class="space-y-1.5">
                  <label
                    class="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Icon v-if="field.icon" :name="field.icon" class="h-3.5 w-3.5" />
                    {{ field.label }}
                  </label>

                  <template v-if="state.mode === 'view'">
                    <div v-if="field.variant === 'badge' || (field.variant === 'select' && field.badgeColor)">
                      <span :class="['inline-flex rounded-full px-3 py-1 text-sm font-medium', getBadgeColor(field)]">
                        {{ renderDisplayValue(field) }}
                      </span>
                    </div>
                    <p v-else class="text-sm text-foreground leading-relaxed">{{ renderDisplayValue(field) }}</p>
                  </template>
                  <template v-else>
                    <UiInput
                      v-if="field.variant === 'text' || field.variant === 'email'"
                      :type="field.variant === 'email' ? 'email' : 'text'"
                      :model-value="getFieldValue(field)"
                      :placeholder="field.placeholder"
                      :disabled="field.readOnly"
                      @update:model-value="setFieldValue(field, $event)" />
                    <UiInput
                      v-else-if="field.variant === 'number'"
                      type="number"
                      :model-value="getFieldValue(field)"
                      :placeholder="field.placeholder"
                      :disabled="field.readOnly"
                      @update:model-value="setFieldValue(field, $event)" />
                    <UiTextarea
                      v-else-if="field.variant === 'textarea'"
                      :model-value="getFieldValue(field)"
                      :placeholder="field.placeholder"
                      :disabled="field.readOnly"
                      :rows="3"
                      @update:model-value="setFieldValue(field, $event)" />
                    <UiInput
                      v-else-if="field.variant === 'date'"
                      type="date"
                      :model-value="getFieldValue(field)"
                      :disabled="field.readOnly"
                      @update:model-value="setFieldValue(field, $event)" />
                    <UiSelect
                      v-else-if="field.variant === 'select'"
                      :model-value="getFieldValue(field)"
                      :disabled="field.readOnly"
                      @update:model-value="setFieldValue(field, $event)">
                      <UiSelectTrigger>
                        <UiSelectValue :placeholder="field.placeholder || 'Select...'" />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem v-for="opt in field.options" :key="opt.value" :value="opt.value">
                          <div class="flex items-center gap-2">
                            <span v-if="opt.color" :class="['h-2 w-2 rounded-full', opt.color.split(' ')[0]]" />
                            <Icon v-if="opt.icon" :name="opt.icon" class="h-4 w-4" />
                            {{ opt.label }}
                          </div>
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>
                    <div v-else-if="field.variant === 'multiselect'" class="flex flex-wrap gap-2">
                      <label
                        v-for="opt in field.options"
                        :key="opt.value"
                        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors"
                        :class="[
                          (getFieldValue(field) || []).includes(opt.value)
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted/50 border-border hover:bg-muted',
                        ]">
                        <input
                          type="checkbox"
                          class="sr-only"
                          :checked="(getFieldValue(field) || []).includes(opt.value)"
                          :disabled="field.readOnly"
                          @change="
                            setFieldValue(
                              field,
                              ($event.target as HTMLInputElement).checked
                                ? [...(getFieldValue(field) || []), opt.value]
                                : (getFieldValue(field) || []).filter((v: string) => v !== opt.value),
                            )
                          " />
                        <span v-if="opt.color" :class="['h-2 w-2 rounded-full', opt.color.split(' ')[0]]" />
                        <Icon v-if="opt.icon" :name="opt.icon" class="h-3.5 w-3.5" />
                        <span class="text-sm">{{ opt.label }}</span>
                      </label>
                    </div>
                    <div v-else-if="field.variant === 'checkbox'" class="flex items-center gap-2">
                      <UiCheckbox
                        :checked="getFieldValue(field)"
                        :disabled="field.readOnly"
                        @update:checked="setFieldValue(field, $event)" />
                      <span class="text-sm text-muted-foreground">{{ field.description }}</span>
                    </div>
                    <p
                      v-if="field.description && field.variant !== 'checkbox'"
                      class="text-xs text-muted-foreground mt-1">
                      {{ field.description }}
                    </p>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <div
            class="flex flex-row items-center justify-between border-t border-border/50 px-6 py-4 bg-background shrink-0">
            <template v-if="state.mode === 'view'">
              <UiButton variant="destructive" size="sm" :disabled="state.isLoading" @click="handleDelete">
                <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                Delete
              </UiButton>
              <div class="flex items-center gap-2">
                <UiButton variant="outline" @click="close()">Close</UiButton>
                <UiButton v-if="canEdit" @click="setMode('edit')">
                  <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                  Edit
                </UiButton>
              </div>
            </template>
            <template v-else>
              <div />
              <div class="flex items-center gap-2">
                <UiButton variant="outline" @click="state.mode === 'create' ? close() : setMode('view')">
                  Cancel
                </UiButton>
                <UiButton :disabled="state.isLoading" @click="handleSave">
                  <Icon v-if="state.isLoading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
                  <Icon v-else name="lucide:check" class="mr-2 h-4 w-4" />
                  {{ state.mode === 'create' ? 'Create' : 'Save Changes' }}
                </UiButton>
              </div>
            </template>
          </div>
        </UiDialogContent>
      </UiDialog>

      <!-- ==================== FULLSCREEN VARIANT ==================== -->
      <Teleport v-else-if="state.variant === 'fullscreen'" to="body">
        <div class="fixed inset-0 z-100 bg-background flex flex-col overflow-hidden">
          <!-- Custom Header -->
          <div class="flex items-start gap-4 border-b border-border/50 px-8 py-4 bg-background shrink-0">
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform hover:scale-105">
              <Icon :name="currentConfig.icon" class="h-6 w-6" />
            </div>
            <div class="flex-1 min-w-0">
              <h2 class="text-2xl font-bold truncate">{{ resolvedTitle }}</h2>
              <p v-if="currentConfig.description" class="text-muted-foreground mt-1">
                {{ currentConfig.description }}
              </p>

              <!-- Mode indicator badge -->
              <div class="flex items-center gap-2 mt-3">
                <span
                  v-if="state.mode === 'edit'"
                  class="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-3 py-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                  <Icon name="lucide:pencil" class="h-4 w-4" />
                  Editing
                </span>
                <span
                  v-else-if="state.mode === 'create'"
                  class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <Icon name="lucide:plus" class="h-4 w-4" />
                  New
                </span>
                <span
                  v-if="!canEdit && state.mode === 'view'"
                  class="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                  <Icon name="lucide:eye" class="h-4 w-4" />
                  View Only
                </span>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <div class="flex items-center rounded-md border border-border/50 p-0.5 bg-muted/50">
                <UiButton
                  v-for="opt in variantOptions"
                  :key="opt.value"
                  variant="ghost"
                  size="icon-sm"
                  class="h-8 w-8 rounded-sm p-0"
                  :class="[
                    state.variant === opt.value
                      ? 'bg-background shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  ]"
                  :title="opt.label"
                  @click="setVariant(opt.value)">
                  <Icon :name="opt.icon" class="h-4 w-4" />
                </UiButton>
              </div>
              <UiButton variant="ghost" size="icon" class="ml-2" title="Close" @click="close()">
                <Icon name="lucide:x" class="h-6 w-6" />
              </UiButton>
            </div>
          </div>
          <!-- Content Area -->
          <div class="flex-1 overflow-y-auto py-12 px-8">
            <div class="max-w-4xl mx-auto">
              <div class="grid grid-cols-2 gap-12">
                <div
                  v-for="field in visibleFields"
                  :key="String(field.key)"
                  :class="[field.colSpan === 2 ? 'col-span-2' : '']">
                  <div class="space-y-3">
                    <label
                      class="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Icon v-if="field.icon" :name="field.icon" class="h-4 w-4" />
                      {{ field.label }}
                    </label>

                    <template v-if="state.mode === 'view'">
                      <div v-if="field.variant === 'badge' || (field.variant === 'select' && field.badgeColor)">
                        <span
                          :class="['inline-flex rounded-full px-4 py-1.5 text-base font-medium', getBadgeColor(field)]">
                          {{ renderDisplayValue(field) }}
                        </span>
                      </div>
                      <p v-else class="text-xl leading-relaxed">{{ renderDisplayValue(field) }}</p>
                    </template>
                    <template v-else>
                      <UiInput
                        v-if="field.variant === 'text' || field.variant === 'email'"
                        :type="field.variant === 'email' ? 'email' : 'text'"
                        class="text-lg h-12"
                        :model-value="getFieldValue(field)"
                        :placeholder="field.placeholder"
                        :disabled="field.readOnly"
                        @update:model-value="setFieldValue(field, $event)" />
                      <UiInput
                        v-else-if="field.variant === 'number'"
                        type="number"
                        class="text-lg h-12"
                        :model-value="getFieldValue(field)"
                        :placeholder="field.placeholder"
                        :disabled="field.readOnly"
                        @update:model-value="setFieldValue(field, $event)" />
                      <UiTextarea
                        v-else-if="field.variant === 'textarea'"
                        class="text-lg"
                        :model-value="getFieldValue(field)"
                        :placeholder="field.placeholder"
                        :disabled="field.readOnly"
                        :rows="4"
                        @update:model-value="setFieldValue(field, $event)" />
                      <UiInput
                        v-else-if="field.variant === 'date'"
                        type="date"
                        class="text-lg h-12"
                        :model-value="getFieldValue(field)"
                        :disabled="field.readOnly"
                        @update:model-value="setFieldValue(field, $event)" />
                      <UiSelect
                        v-else-if="field.variant === 'select'"
                        :model-value="getFieldValue(field)"
                        :disabled="field.readOnly"
                        @update:model-value="setFieldValue(field, $event)">
                        <UiSelectTrigger class="text-lg h-12">
                          <UiSelectValue :placeholder="field.placeholder || 'Select...'" />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem v-for="opt in field.options" :key="opt.value" :value="opt.value">
                            <div class="flex items-center gap-2 text-lg py-1">
                              <span v-if="opt.color" :class="['h-3 w-3 rounded-full', opt.color.split(' ')[0]]" />
                              <Icon v-if="opt.icon" :name="opt.icon" class="h-5 w-5" />
                              {{ opt.label }}
                            </div>
                          </UiSelectItem>
                        </UiSelectContent>
                      </UiSelect>
                      <div v-else-if="field.variant === 'multiselect'" class="flex flex-wrap gap-3">
                        <label
                          v-for="opt in field.options"
                          :key="opt.value"
                          class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors"
                          :class="[
                            (getFieldValue(field) || []).includes(opt.value)
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted/50 border-border hover:bg-muted',
                          ]">
                          <input
                            type="checkbox"
                            class="sr-only"
                            :checked="(getFieldValue(field) || []).includes(opt.value)"
                            :disabled="field.readOnly"
                            @change="
                              setFieldValue(
                                field,
                                ($event.target as HTMLInputElement).checked
                                  ? [...(getFieldValue(field) || []), opt.value]
                                  : (getFieldValue(field) || []).filter((v: string) => v !== opt.value),
                              )
                            " />
                          <span v-if="opt.color" :class="['h-3 w-3 rounded-full', opt.color.split(' ')[0]]" />
                          <Icon v-if="opt.icon" :name="opt.icon" class="h-4 w-4" />
                          <span class="text-base">{{ opt.label }}</span>
                        </label>
                      </div>
                      <div v-else-if="field.variant === 'checkbox'" class="flex items-center gap-3">
                        <UiCheckbox
                          class="h-6 w-6"
                          :checked="getFieldValue(field)"
                          :disabled="field.readOnly"
                          @update:checked="setFieldValue(field, $event)" />
                        <span class="text-lg text-muted-foreground">{{ field.description }}</span>
                      </div>
                      <p
                        v-if="field.description && field.variant !== 'checkbox'"
                        class="text-sm text-muted-foreground mt-2">
                        {{ field.description }}
                      </p>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="border-t border-border/50 px-8 py-6 bg-background shrink-0">
            <div class="max-w-4xl mx-auto flex items-center justify-between">
              <template v-if="state.mode === 'view'">
                <UiButton variant="destructive" size="lg" :disabled="state.isLoading" @click="handleDelete">
                  <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                  Delete
                </UiButton>
                <div class="flex items-center gap-4">
                  <UiButton variant="outline" size="lg" @click="close()">Close</UiButton>
                  <UiButton v-if="canEdit" size="lg" @click="setMode('edit')">
                    <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                    Edit
                  </UiButton>
                </div>
              </template>
              <template v-else>
                <div />
                <div class="flex items-center gap-4">
                  <UiButton variant="outline" size="lg" @click="state.mode === 'create' ? close() : setMode('view')">
                    Cancel
                  </UiButton>
                  <UiButton :disabled="state.isLoading" size="lg" @click="handleSave">
                    <Icon v-if="state.isLoading" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
                    <Icon v-else name="lucide:check" class="mr-2 h-4 w-4" />
                    {{ state.mode === 'create' ? 'Create' : 'Save Changes' }}
                  </UiButton>
                </div>
              </template>
            </div>
          </div>
        </div>
      </Teleport>
    </template>

    <!-- Unified Task Dialog for task entities -->
    <UnifiedTaskDialog
      v-if="state.entityType === 'task'"
      :open="state.isOpen"
      :mode="state.mode === 'create' ? 'create' : 'edit'"
      task-type="standard"
      :task="state.currentNode as TaskData"
      :owners="owners"
      :folders="folders"
      :templates="templates"
      @update:open="(val) => !val && close()"
      @close="close"
      @save="handleTaskSave" />
  </div>
</template>
