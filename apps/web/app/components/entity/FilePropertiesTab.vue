<script lang="ts" setup>
  /**
   * FilePropertiesTab — Sidebar properties for file entities.
   * Title, description, and enriched metadata live here so the center
   * column stays preview-first (mirrors BookmarkPropertiesTab).
   */
  import type { PropertyFieldId } from '~/types/entity'
  import { getFileCategoryMeta, type FileCategory } from '~/utils/fileClassification'

  const editableItem = defineModel<any>('editableItem', { required: true })
  const selectedRepeat = defineModel<string>('selectedRepeat', { default: 'none' })

  const props = defineProps<{
    hasField: (_fieldId: PropertyFieldId) => boolean
    isViewMode: boolean
    isDark: boolean
    owners: { id: string; name: string }[]
    folders: string[]
    scheduleDescription: {
      scheduleText: string
      statusText: string
      isOverdue: boolean
      isRecurring: boolean
    }
    summary?: string
    isGeneratingSummary?: boolean
  }>()

  const emit = defineEmits<{
    regenerateSummary: []
  }>()

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const fileMeta = computed(() => {
    const cat = (editableItem.value?.fileCategory as FileCategory) || 'other'
    return getFileCategoryMeta(cat)
  })

  const formatTimestamp = (raw: string | number | undefined) => {
    if (!raw) return null
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const createdAtFormatted = computed(() => formatTimestamp(editableItem.value?.createdAt))
  const updatedAtFormatted = computed(() => formatTimestamp(editableItem.value?.updatedAt))
</script>

<template>
  <div class="flex flex-col min-h-0">
    <div class="flex flex-col pt-3 divide-y divide-border/50">
      <!-- Title -->
      <div class="px-3 py-3 space-y-1.5">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
          <Icon name="lucide:type" class="h-3 w-3" />
          Title
        </span>
        <input
          v-if="!isViewMode"
          v-model="editableItem.title"
          type="text"
          placeholder="File name..."
          spellcheck="false"
          class="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50" />
        <p v-else class="text-sm px-0.5">{{ editableItem.title || 'Untitled' }}</p>
      </div>

      <!-- Description -->
      <div class="px-3 py-3">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1 mb-2">
          <Icon name="lucide:align-left" class="h-3 w-3" />
          Description
        </span>
        <EntityDescriptionBlock
          :description="editableItem.description || ''"
          :summary="summary || ''"
          :is-generating-summary="isGeneratingSummary"
          :mode="isViewMode ? 'view' : 'edit'"
          :entity-id="editableItem.id"
          placeholder="Add notes about this file..."
          editor-class="text-sm min-h-[4rem]"
          @update:description="editableItem.description = $event"
          @regenerate-summary="emit('regenerateSummary')" />
      </div>

      <!-- Category -->
      <div
        v-if="editableItem.fileCategory"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2"
        :title="'From file classification'">
        <Icon :name="fileMeta.icon" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Category</span>
        <span
          :class="[
            'inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium',
            `bg-${fileMeta.color}-500/10 text-${fileMeta.color}-600 dark:text-${fileMeta.color}-400`,
          ]">
          {{ fileMeta.label }}
        </span>
      </div>

      <!-- Extension -->
      <div
        v-if="editableItem.fileExtension"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:file-type" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Extension</span>
        <span class="text-xs font-mono text-muted-foreground uppercase">{{ editableItem.fileExtension }}</span>
      </div>

      <!-- AI-enriched fields -->
      <div
        v-if="editableItem.documentAuthor"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:user-pen" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Author</span>
        <span class="text-xs text-muted-foreground truncate">{{ editableItem.documentAuthor }}</span>
      </div>
      <div
        v-if="editableItem.codeLanguage"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:code" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Language</span>
        <span class="text-xs text-muted-foreground">{{ editableItem.codeLanguage }}</span>
      </div>
      <div
        v-if="editableItem.pageCount"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:files" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Pages</span>
        <span class="text-xs text-muted-foreground">{{ editableItem.pageCount }}</span>
      </div>
      <div
        v-if="editableItem.lineCount"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:list" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Lines</span>
        <span class="text-xs text-muted-foreground">{{ editableItem.lineCount }}</span>
      </div>
      <div
        v-if="editableItem.artist"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:mic" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Artist</span>
        <span class="text-xs text-muted-foreground truncate">{{ editableItem.artist }}</span>
      </div>
      <div
        v-if="editableItem.album"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:disc-3" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Album</span>
        <span class="text-xs text-muted-foreground truncate">{{ editableItem.album }}</span>
      </div>
      <div
        v-if="editableItem.genre"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:music" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Genre</span>
        <span class="text-xs text-muted-foreground">{{ editableItem.genre }}</span>
      </div>

      <!-- AI tags -->
      <div
        v-if="editableItem.aiTags?.length"
        class="grid grid-cols-[20px_1fr] items-start gap-x-2 gap-y-1 px-3 py-2">
        <Icon name="lucide:sparkles" class="h-3.5 w-3.5 text-amber-500 mt-0.5" />
        <div class="min-w-0 space-y-1.5">
          <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">AI tags</span>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="tag in editableItem.aiTags"
              :key="tag"
              class="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <OntologyPropertiesTab
      v-model:editable-item="editableItem"
      v-model:selected-repeat="selectedRepeat"
      :has-field="hasField"
      :is-view-mode="isViewMode"
      :is-dark="isDark"
      :owners="owners"
      :folders="folders"
      :schedule-description="scheduleDescription" />
  </div>
</template>
