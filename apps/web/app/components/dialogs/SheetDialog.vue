<script lang="ts" setup>
  import type { Entity } from '~/types/entity'
  import { CATEGORY_OPTIONS } from '~/types/entity'
  import { useEntityDialog } from '~/composables/useEntityDialog'
  import { useSheetProjection } from '~/composables/useSheetProjection'
  import { sheetPathFromEntityId } from '~/lib/sheet-routes'
  import EntityRightSidebar from '~/components/entity/EntityRightSidebar.vue'

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

  const { wpNavigate } = useWorkspacePath()

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
    defaultType: 'sheet',
  })

  const sheetEntityId = computed(() => editableItem.id || '')
  const { columns, rows, sheetLoading, rowsLoading } = useSheetProjection(sheetEntityId)

  const categoryOpen = ref(false)
  const ownerOpen = ref(false)

  const hasSheetId = computed(() => !!editableItem.id?.trim())
  const columnCount = computed(() => columns.value.length)
  const rowCount = computed(() => rows.value.length)
  const projectionLoading = computed(
    () => hasSheetId.value && (sheetLoading.value || rowsLoading.value),
  )

  function openEditor() {
    if (!hasSheetId.value) return
    closeDialog()
    void wpNavigate(sheetPathFromEntityId(editableItem.id))
  }
</script>

<template>
  <DocumentDialogShell
    :open="open"
    :title="editableItem.title"
    :description="editableItem.description"
    :mode="mode"
    :type-badge="{ icon: 'lucide:table-2', label: 'Sheet' }"
    title-placeholder="Sheet title…"
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :dialog-title="isCreateMode ? 'New sheet' : editableItem.title || 'Sheet'"
    :dialog-description="isCreateMode ? 'Create a live TQL sheet.' : 'Sheet metadata and shortcuts.'"
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
    <template v-if="!isCreateMode && hasSheetId" #header-actions>
      <RightSidebarToggle v-model:collapsed="rightSidebarCollapsed" />
    </template>
    <template #properties>
      <div
        v-if="hasSheetId"
        class="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 text-[10px]">
        <Icon name="lucide:table-2" class="h-3.5 w-3.5" />
        <span v-if="projectionLoading">Loading sheet…</span>
        <span v-else>{{ columnCount }} col{{ columnCount === 1 ? '' : 's' }} · {{ rowCount }} row{{ rowCount === 1 ? '' : 's' }}</span>
      </div>

      <UiPopover v-if="hasField('category')" v-model:open="categoryOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 transition-colors hover:bg-muted">
            <Icon :name="currentCategory?.icon || 'lucide:tag'" class="h-3.5 w-3.5" />
            <span>{{ currentCategory?.label || editableItem.category || 'Category' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
            @click="
              () => {
                editableItem.category = opt.value
                categoryOpen = false
              }
            ">
            <Icon :name="opt.icon" class="h-3.5 w-3.5" />
            {{ opt.label }}
          </button>
        </UiPopoverContent>
      </UiPopover>

      <UiPopover v-if="hasField('owner')" v-model:open="ownerOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 transition-colors hover:bg-muted">
            <Icon name="lucide:user" class="h-3.5 w-3.5" />
            <span>{{ owners.find((o) => o.id === editableItem.owner)?.name || 'Owner' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-52 p-1">
          <UiInput v-model="ownerSearch" placeholder="Search…" class="mb-1 h-7 text-xs" />
          <button
            v-for="o in filteredOwners"
            :key="o.id"
            class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
            @click="
              () => {
                editableItem.owner = o.id
                ownerOpen = false
              }
            ">
            {{ o.name }}
          </button>
        </UiPopoverContent>
      </UiPopover>
    </template>

    <div class="flex min-h-0 flex-1 overflow-hidden">
      <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 p-8">
        <div
          class="flex aspect-video w-full max-w-md flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
          <Icon name="lucide:table-2" class="h-10 w-10 text-emerald-400/80" />
          <p class="text-sm text-muted-foreground">
            <template v-if="isCreateMode">Save to create the sheet, then open the editor to configure columns.</template>
            <template v-else-if="projectionLoading">Loading sheet projection…</template>
            <template v-else-if="columnCount === 0">No columns yet — open the editor to set up your query.</template>
            <template v-else>{{ columnCount }} column{{ columnCount === 1 ? '' : 's' }} · {{ rowCount }} row{{ rowCount === 1 ? '' : 's' }}.</template>
          </p>
          <div v-if="hasSheetId && !isViewMode" class="flex flex-wrap justify-center gap-2">
            <UiButton size="sm" class="gap-1.5" @click="openEditor">
              <Icon name="lucide:pencil" class="h-4 w-4" />
              Open editor
            </UiButton>
          </div>
        </div>
      </div>

      <ResizableRightPanel
        v-if="!isCreateMode && hasSheetId"
        v-model:collapsed="rightSidebarCollapsed"
        v-model:width="rightSidebarW"
        class="hidden md:block">
        <EntityRightSidebar
          v-model:collapsed="rightSidebarCollapsed"
          :references="editableItem.references"
          :is-view-mode="isViewMode"
          :is-create-mode="isCreateMode"
          :display-activity="displayActivity"
          :comments-loading="commentsLoading"
          :new-comment="newComment"
          entity-label="sheet"
          :updated-at="editableItem.updatedAt"
          :created-at="editableItem.createdAt"
          :show-properties="false"
          default-tab="references"
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
      </ResizableRightPanel>
    </div>

    <template #footer-left>
      <span v-if="isEditMode && saveStatus" class="text-[10px] text-muted-foreground">
        {{ formatLastSaved }}
      </span>
    </template>

    <template #footer-right>
      <UiButton v-if="isViewMode && hasSheetId" variant="secondary" size="sm" class="gap-1.5" @click="emit('edit')">
        <Icon name="lucide:pencil" class="h-4 w-4" />
        Edit
      </UiButton>
      <UiButton v-if="isViewMode && hasSheetId" size="sm" class="gap-1.5" @click="openEditor">
        <Icon name="lucide:external-link" class="h-4 w-4" />
        Open editor
      </UiButton>
      <UiButton v-if="!isViewMode && isCreateMode" size="sm" :disabled="!isFormValid" @click="handleSave">Create</UiButton>
      <template v-if="isEditMode">
        <UiButton variant="ghost" size="sm" class="text-destructive" @click="handleDelete">Delete</UiButton>
        <UiButton size="sm" :disabled="!isFormValid" @click="handleSave">Save</UiButton>
      </template>
    </template>
  </DocumentDialogShell>
</template>
