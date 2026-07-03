<script lang="ts" setup>
  import type { Entity, ProjectStatus } from '~/types/entity'
  import { CATEGORY_OPTIONS } from '~/types/entity'
  import { useEntityDialog } from '~/composables/useEntityDialog'

  const props = withDefaults(
    defineProps<{
      open: boolean
      mode?: 'view' | 'create' | 'edit'
      item?: Entity | null
      canNavigatePrev?: boolean
      canNavigateNext?: boolean
      owners?: { id: string; name: string }[]
    }>(),
    {
      mode: 'edit',
      item: null,
      canNavigatePrev: false,
      canNavigateNext: false,
      owners: () => [],
    },
  )

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    save: [item: Entity]
    delete: [item: Entity]
    edit: []
    navigatePrev: []
    navigateNext: []
  }>()

  // ── Shared dialog logic ──────────────────────────────────────────
  const {
    mode,
    isViewMode,
    isCreateMode,
    isEditMode,
    editableItem,
    hasField,
    isFormValid,
    displayActivity,
    commentsLoading,
    newComment,
    handleAddComment,
    saveStatus,
    formatLastSaved,
    entitySummary,
    isGeneratingSummary,
    regenerateSummary,
    entityPickerOpen,
    entityPickerFilterType,
    handleAddEntityRef,
    handleCreatedEntityRef,
    handleCreateEntityOfType,
    handleRemoveRef,
    handleOpenEntityRef,
    rightSidebarW,
    rightSidebarCollapsed,
    isResizingSidebar,
    startRightSidebarResize,
    ownerSearch,
    owners,
    filteredOwners,
    currentCategory,
    closeDialog,
    handleSave,
    handleDelete,
  } = useEntityDialog(props as any, emit as any, {
    defaultType: 'project',
    afterInitBlank: (item: any) => {
      item.children = []
      item.status = 'active'
    },
  })

  // ── Project-specific UI state ────────────────────────────────────
  const categoryOpen = ref(false)
  const ownerOpen = ref(false)
  const involvedOpen = ref(false)
  const involvedSearch = ref('')
  const statusOpen = ref(false)
  const filteredInvolvedOwners = computed(() => {
    if (!involvedSearch.value) return owners.value
    const s = involvedSearch.value.toLowerCase()
    return owners.value.filter((o: { id: string; name: string }) => o.name.toLowerCase().includes(s))
  })

  // Status options
  const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: string; color: string }[] = [
    {
      value: 'active',
      label: 'Active',
      icon: 'lucide:play',
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      value: 'on-hold',
      label: 'On Hold',
      icon: 'lucide:pause',
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      value: 'completed',
      label: 'Completed',
      icon: 'lucide:check-circle',
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      value: 'archived',
      label: 'Archived',
      icon: 'lucide:archive',
      color: 'text-zinc-600 bg-zinc-100 dark:bg-zinc-900/30 dark:text-zinc-400',
    },
  ]

  const currentStatus = computed(() => PROJECT_STATUS_OPTIONS.find((s) => s.value === editableItem.status))

  // People
  const toggleInvolvedUser = (uid: string) => {
    const i = editableItem.involved.indexOf(uid)
    if (i === -1) editableItem.involved.push(uid)
    else editableItem.involved.splice(i, 1)
  }

  // Status selection handler
  function handleStatusSelect(status: ProjectStatus) {
    editableItem.status = status
    statusOpen.value = false
  }
</script>

<template>
  <ContainerDialogShell
    :open="open"
    :title="editableItem.title"
    :description="editableItem.description"
    :mode="mode"
    :type-badge="{ icon: 'lucide:folder-kanban', label: 'Project' }"
    title-placeholder="Project name..."
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :item-count="editableItem.children?.length || 0"
    :dialog-title="isCreateMode ? 'New Project' : editableItem.title || 'Project'"
    :dialog-description="isCreateMode ? 'Create a new project.' : 'View and edit project details.'"
    :entity-id="editableItem.id || undefined"
    :summary="entitySummary"
    :is-generating-summary="isGeneratingSummary"
    @update:open="emit('update:open', $event)"
    @update:title="editableItem.title = $event"
    @update:description="editableItem.description = $event"
    @close="closeDialog"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')"
    @regenerate-summary="regenerateSummary">
    <!-- Properties Row -->
    <template #properties>
      <!-- Status -->
      <UiPopover v-if="hasField('status')" v-model:open="statusOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
            :class="currentStatus?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentStatus?.icon || 'lucide:circle-dot'" class="h-3.5 w-3.5" />
            <span>{{ currentStatus?.label || 'Status' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in PROJECT_STATUS_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="handleStatusSelect(opt.value)">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.status === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Category -->
      <UiPopover v-if="hasField('category')" v-model:open="categoryOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <Icon :name="currentCategory?.icon || 'lucide:tag'" class="h-3.5 w-3.5" />
            <span>{{ currentCategory?.label || editableItem.category || 'Category' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="
              () => {
                editableItem.category = opt.value
                categoryOpen = false
              }
            ">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.category === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>

      <!-- Owner -->
      <UiPopover v-if="hasField('owner')" v-model:open="ownerOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.owner
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:user" class="h-3.5 w-3.5" />
            <span>{{ owners?.find((o) => o.id === editableItem.owner)?.name || 'Owner' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
          <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
            <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-model="ownerSearch"
              type="text"
              placeholder="Search..."
              class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div class="overflow-y-auto max-h-52">
            <button
              v-if="editableItem.owner"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
              @click="
                () => {
                  editableItem.owner = undefined
                  ownerOpen = false
                  ownerSearch = ''
                }
              ">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
              No owner
            </button>
            <button
              v-for="o in filteredOwners"
              :key="o.id"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="
                () => {
                  editableItem.owner = o.id
                  ownerOpen = false
                  ownerSearch = ''
                }
              ">
              <div
                class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">
                {{ o.name.slice(0, 2).toUpperCase() }}
              </div>
              <span class="flex-1">{{ o.name }}</span>
              <Icon v-if="editableItem.owner === o.id" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>

      <!-- Involved -->
      <UiPopover v-if="hasField('involved')" v-model:open="involvedOpen">
        <UiPopoverTrigger as-child>
          <button
            :class="[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
              !editableItem.involved?.length
                ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
                : 'bg-muted/50 hover:bg-muted',
            ]">
            <Icon name="lucide:users" class="h-3.5 w-3.5" />
            <span>{{ editableItem.involved?.length ? `Team (${editableItem.involved.length})` : 'Team' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-56 p-1 max-h-64 overflow-hidden">
          <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
            <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-model="involvedSearch"
              type="text"
              placeholder="Search..."
              class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div class="overflow-y-auto max-h-52">
            <button
              v-for="o in filteredInvolvedOwners"
              :key="o.id"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="toggleInvolvedUser(o.id)">
              <Icon
                :name="editableItem.involved?.includes(o.id) ? 'lucide:check-square' : 'lucide:square'"
                class="h-3.5 w-3.5"
                :class="editableItem.involved?.includes(o.id) ? 'text-primary' : 'text-muted-foreground'" />
              <span class="flex-1 truncate">{{ o.name }}</span>
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>

      <!-- Tags -->
      <span v-if="hasField('tags')" class="w-px h-4 bg-border/60 mx-0.5 shrink-0" />
      <div
        v-if="hasField('tags')"
        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/30 border border-border/40">
        <TagsSection v-model="editableItem.tags" :readonly="isViewMode" inline />
      </div>
    </template>

    <!-- Content: Center + Right Sidebar -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Center Content -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
        <UiRichTextEditor
          v-if="!isViewMode"
          v-model="editableItem.description"
          placeholder="Project overview..."
          class="flex-1 min-h-0 border-none! rounded-none!"
          fill-height
          mentions
          tasklist
          images
          embeds
          tables
          mathematics
          collaborative
          :entity-id="editableItem.id" />
        <div
          v-else-if="editableItem.description"
          class="prose prose-sm max-w-none text-sm text-foreground flex-1 p-4 overflow-y-auto"
          v-html="editableItem.description" />
        <p v-else class="text-sm text-muted-foreground/50 italic flex-1 p-4">No overview</p>
      </div>

      <!-- Right Sidebar -->
      <aside
        class="shrink-0 border-l border-border overflow-hidden md:flex hidden flex-col relative transition-[width] duration-150"
        :class="isResizingSidebar ? 'select-none' : ''"
        :style="{ width: rightSidebarCollapsed ? '40px' : rightSidebarW + 'px' }">
        <div
          v-if="!rightSidebarCollapsed"
          class="absolute inset-y-0 left-0 w-1 cursor-ew-resize z-10 hover:bg-primary/20 transition-colors"
          @pointerdown="startRightSidebarResize($event)" />
        <EntityRightSidebar
          v-model:collapsed="rightSidebarCollapsed"
          :references="editableItem.references"
          :is-view-mode="isViewMode"
          :is-create-mode="isCreateMode"
          :display-activity="displayActivity"
          :comments-loading="commentsLoading"
          :new-comment="newComment"
          entity-label="project"
          :updated-at="editableItem.updatedAt"
          :created-at="editableItem.createdAt"
          @update:references="editableItem.references = $event"
          @update:new-comment="newComment = $event"
          @open-entity="handleOpenEntityRef"
          @remove-ref="handleRemoveRef"
          @add-entity="
            () => {
              entityPickerFilterType = undefined
              entityPickerOpen = true
            }
          "
          @add-entity-of-type="
            (type: string) => {
              entityPickerFilterType = type
              entityPickerOpen = true
            }
          "
          @create-entity="handleCreateEntityOfType"
          @add-comment="handleAddComment" />
      </aside>
    </div>

    <!-- Footer -->
    <template #footer-left>
      <div class="flex items-center gap-2 min-w-0 overflow-hidden">
        <Icon name="lucide:info" class="h-3.5 w-3.5 shrink-0" />
        <EntityFooterId v-if="editableItem.id && !isCreateMode" :id="editableItem.id" />
        <span v-else>New project</span>
      </div>
    </template>

    <template #footer-right>
      <template v-if="isViewMode">
        <UiButton size="sm" @click="emit('edit')">
          <Icon name="lucide:pencil" class="h-3.5 w-3.5 mr-1.5" />
          Edit
        </UiButton>
      </template>
      <template v-else-if="isEditMode">
        <span class="text-[11px] text-muted-foreground flex items-center gap-1 mr-2 h-4 overflow-hidden">
          <Transition name="save-fade" mode="out-in">
            <span v-if="saveStatus === 'saving'" key="saving" class="flex items-center gap-1">
              <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
              Saving…
            </span>
            <span v-else-if="saveStatus === 'error'" key="error" class="flex items-center gap-1 text-destructive">
              <Icon name="lucide:alert-circle" class="h-3 w-3" />
              Error
            </span>
            <span v-else-if="formatLastSaved" key="saved" class="flex items-center gap-1">
              <Icon name="lucide:check" class="h-3 w-3 text-emerald-500" />
              Last saved at {{ formatLastSaved }}
            </span>
          </Transition>
        </span>
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <UiButton variant="ghost" size="icon" class="h-8 w-8">
              <Icon name="lucide:more-horizontal" class="h-4 w-4" />
            </UiButton>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="w-40">
            <UiDropdownMenuItem icon="lucide:share" title="Share" />
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem icon="lucide:trash-2" title="Delete" variant="destructive" @click="handleDelete" />
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </template>
      <template v-else-if="isCreateMode">
        <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">Create</UiButton>
        <UiButton variant="ghost" size="sm" @click="closeDialog">Cancel</UiButton>
      </template>
    </template>
  </ContainerDialogShell>

  <!-- Entity Reference Picker -->
  <EntityReferencePicker
    v-model:open="entityPickerOpen"
    :exclude-id="editableItem.id"
    :filter-type="entityPickerFilterType"
    @select="handleAddEntityRef"
    @created="handleCreatedEntityRef" />
</template>
