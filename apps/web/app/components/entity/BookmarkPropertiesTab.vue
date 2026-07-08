<script lang="ts" setup>
  /**
   * BookmarkPropertiesTab — Sidebar properties for bookmark entities.
   * Title, description, URL, and unfurl metadata live here so the center
   * column can stay preview-first.
   */

  const editableItem = defineModel<any>('editableItem', { required: true })

  const props = defineProps<{
    isViewMode: boolean
    summary?: string
    isGeneratingSummary?: boolean
  }>()

  const emit = defineEmits<{
    regenerateSummary: []
  }>()

  const domain = computed(() => {
    const url = editableItem.value?.url || ''
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  })

  const faviconSrc = computed(() => {
    if (editableItem.value?.favicon) return editableItem.value.favicon
    if (!domain.value) return null
    return `https://www.google.com/s2/favicons?domain=${domain.value}&sz=64`
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

  const createdAtFormatted = computed(() => formatTimestamp(editableItem.value.createdAt))
  const updatedAtFormatted = computed(() => formatTimestamp(editableItem.value.updatedAt))
</script>

<template>
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
        placeholder="Bookmark title..."
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
        placeholder="Add notes about this bookmark..."
        editor-class="text-sm min-h-[4rem]"
        @update:description="editableItem.description = $event"
        @regenerate-summary="emit('regenerateSummary')" />
    </div>

    <!-- URL -->
    <div class="grid grid-cols-[20px_1fr] items-start gap-x-2 gap-y-1 px-3 py-2">
      <Icon name="lucide:link" class="h-3.5 w-3.5 text-muted-foreground mt-2" />
      <div class="min-w-0 space-y-1">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">URL</span>
        <input
          v-if="!isViewMode"
          v-model="editableItem.url"
          type="url"
          placeholder="https://..."
          class="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50" />
        <a
          v-else-if="editableItem.url"
          :href="editableItem.url"
          target="_blank"
          rel="noopener noreferrer"
          class="block text-xs font-mono text-primary hover:underline truncate">
          {{ editableItem.url }}
        </a>
        <span v-else class="text-xs text-muted-foreground">—</span>
      </div>
    </div>

    <!-- Site / domain (from unfurl) -->
    <div
      v-if="editableItem.siteName || domain"
      class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2"
      :title="'From page metadata'">
      <img
        v-if="faviconSrc"
        :src="faviconSrc"
        alt=""
        class="h-3.5 w-3.5 rounded-sm object-contain" />
      <Icon v-else name="lucide:globe" class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Site
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="max-w-fit text-xs text-muted-foreground truncate">
        {{ editableItem.siteName || domain }}
      </span>
    </div>

    <!-- Excerpt (from unfurl) -->
    <div
      v-if="editableItem.excerpt"
      class="grid grid-cols-[20px_1fr] items-start gap-x-2 gap-y-1 px-3 py-2"
      :title="'From page metadata'">
      <Icon name="lucide:quote" class="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
      <div class="min-w-0 space-y-1">
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
          Excerpt
          <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
        </span>
        <p class="text-xs text-muted-foreground leading-relaxed line-clamp-4">{{ editableItem.excerpt }}</p>
      </div>
    </div>

    <!-- System fields -->
    <div class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2" :title="'Read-only'">
      <Icon name="lucide:calendar-plus" class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Created at
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="text-xs text-muted-foreground truncate">{{ createdAtFormatted || '—' }}</span>
    </div>

    <div
      class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2 border-b border-border/50"
      :title="'Read-only'">
      <Icon name="lucide:history" class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Last edited
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="text-xs text-muted-foreground truncate">{{ updatedAtFormatted || '—' }}</span>
    </div>
  </div>
</template>
