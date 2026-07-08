<script lang="ts" setup>
  import type { Entity } from '~/types/entity'
  import { CATEGORY_OPTIONS } from '~/types/entity'
  import { useEntityDialog } from '~/composables/useEntityDialog'
  import { useDeckProjection } from '~/composables/useDeckProjection'
  import { deckEditorPathFromEntityId, deckPresentPathFromEntityId } from '~/lib/deck-routes'
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
    defaultType: 'slide_deck',
  })

  const deckEntityId = computed(() => editableItem.id || '')
  const { slides, slidesLoading, deckLoading } = useDeckProjection(deckEntityId)

  const categoryOpen = ref(false)
  const ownerOpen = ref(false)

  const hasDeckId = computed(() => !!editableItem.id?.trim())
  const slideCount = computed(() => slides.value.length)
  const projectionLoading = computed(() => hasDeckId.value && (deckLoading.value || slidesLoading.value))

  function openEditor() {
    if (!hasDeckId.value) return
    closeDialog()
    void wpNavigate(deckEditorPathFromEntityId(editableItem.id))
  }

  function openPresent() {
    if (!hasDeckId.value) return
    closeDialog()
    void wpNavigate(deckPresentPathFromEntityId(editableItem.id))
  }
</script>

<template>
  <DocumentDialogShell
    :open="open"
    :title="editableItem.title"
    :description="editableItem.description"
    :mode="mode"
    :type-badge="{ icon: 'lucide:presentation', label: 'Deck' }"
    title-placeholder="Deck title…"
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :dialog-title="isCreateMode ? 'New deck' : editableItem.title || 'Deck'"
    :dialog-description="isCreateMode ? 'Create a slide deck.' : 'Deck metadata and shortcuts.'"
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
    <template v-if="!isCreateMode && hasDeckId" #header-actions>
      <RightSidebarToggle v-model:collapsed="rightSidebarCollapsed" />
    </template>
    <template #properties>
      <div
        v-if="hasDeckId"
        class="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 text-[10px]">
        <Icon name="lucide:layers" class="h-3.5 w-3.5" />
        <span v-if="projectionLoading">Loading slides…</span>
        <span v-else>{{ slideCount }} slide{{ slideCount === 1 ? '' : 's' }}</span>
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
          class="flex aspect-video w-full max-w-md flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-6 text-center">
          <Icon name="lucide:presentation" class="h-10 w-10 text-violet-400/80" />
          <p class="text-sm text-muted-foreground">
            <template v-if="isCreateMode">Save to create the deck, then open the editor to add slides.</template>
            <template v-else-if="projectionLoading">Loading deck projection…</template>
            <template v-else-if="slideCount === 0">No slides yet — open the editor to add your first slide.</template>
            <template v-else>{{ slideCount }} slide{{ slideCount === 1 ? '' : 's' }} in this deck.</template>
          </p>
          <div v-if="hasDeckId && !isViewMode" class="flex flex-wrap justify-center gap-2">
            <UiButton size="sm" class="gap-1.5" @click="openEditor">
              <Icon name="lucide:pencil" class="h-4 w-4" />
              Open editor
            </UiButton>
            <UiButton v-if="slideCount > 0" size="sm" variant="secondary" class="gap-1.5" @click="openPresent">
              <Icon name="lucide:play" class="h-4 w-4" />
              Present
            </UiButton>
          </div>
        </div>
      </div>

      <ResizableRightPanel
        v-if="!isCreateMode && hasDeckId"
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
          entity-label="deck"
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
      <UiButton v-if="isViewMode && hasDeckId" variant="secondary" size="sm" class="gap-1.5" @click="emit('edit')">
        <Icon name="lucide:pencil" class="h-4 w-4" />
        Edit
      </UiButton>
      <UiButton v-if="isViewMode && hasDeckId" size="sm" class="gap-1.5" @click="openEditor">
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
