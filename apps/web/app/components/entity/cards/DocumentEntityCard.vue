<script setup lang="ts">
  import type { Entity } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { stripHtml } from '~/utils/stripHtml'

  const props = defineProps<{
    item: Entity
  }>()

  defineEmits<{
    click: []
  }>()

  const config = computed(() => getEntityTypeConfig(props.item.type as any))

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    personal: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    general: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  const formatDate = (d: string) => {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    catch { return d }
  }

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace('www.', '') }
    catch { return url }
  }

  const isBookmark = computed(() => props.item.type === 'bookmark')
  const isNote = computed(() => props.item.type === 'note')
  const isFile = computed(() => props.item.type === 'file')

  const contentPreview = computed(() => {
    const content = (props.item as any).content
    if (!content) return ''
    return stripHtml(content).slice(0, 300)
  })

  const mimeIconMap: Record<string, { icon: string; color: string }> = {
    'application/pdf': { icon: 'lucide:file-text', color: 'text-red-500' },
    'image/': { icon: 'lucide:image', color: 'text-purple-500' },
    'video/': { icon: 'lucide:video', color: 'text-blue-500' },
    'audio/': { icon: 'lucide:music', color: 'text-pink-500' },
    'text/': { icon: 'lucide:file-code', color: 'text-emerald-500' },
    'application/vnd': { icon: 'lucide:file-spreadsheet', color: 'text-green-500' },
  }

  const fileMeta = computed(() => {
    const mime = (props.item as any).mimeType || ''
    for (const [prefix, meta] of Object.entries(mimeIconMap)) {
      if (mime.startsWith(prefix)) return meta
    }
    return { icon: 'lucide:file', color: 'text-muted-foreground' }
  })

  const formatBytes = (bytes: number | undefined) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
</script>

<template>
  <UiCard
    class="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group border-border/50"
    :class="{ 'hover:border-purple-500/30': isNote }"
    @click="$emit('click')">

    <!-- Pinned indicator -->
    <div v-if="(item as any).pinned" class="absolute top-3 right-3 z-10">
      <div class="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/10 backdrop-blur-sm">
        <Icon name="lucide:pin" class="h-3 w-3 text-amber-500" />
      </div>
    </div>

    <!-- Bookmark thumbnail area -->
    <div v-if="isBookmark" class="h-32 bg-muted/50 flex items-center justify-center border-b border-border overflow-hidden">
      <img
        v-if="(item as any).thumbnail"
        :src="(item as any).thumbnail"
        :alt="item.title"
        class="w-full h-full object-cover" />
      <div v-else class="flex flex-col items-center gap-2 text-muted-foreground/50">
        <Icon name="lucide:globe" class="h-8 w-8" />
        <span class="text-xs font-mono">{{ getDomain((item as any).url || '') }}</span>
      </div>
    </div>

    <!-- File icon area -->
    <div v-else-if="isFile" class="h-24 bg-muted/50 flex items-center justify-center border-b border-border">
      <Icon :name="fileMeta.icon" :class="['h-10 w-10', fileMeta.color]" />
    </div>

    <!-- Header -->
    <UiCardHeader class="pb-2">
      <div class="flex items-center gap-2 mb-1">
        <div v-if="!isBookmark && !isFile" :class="['flex h-7 w-7 items-center justify-center rounded-lg', `bg-${config.color}-500/10`]">
          <Icon :name="config.icon" :class="['h-3.5 w-3.5', `text-${config.color}-500`]" />
        </div>
        <!-- Bookmark: favicon + site name -->
        <template v-if="isBookmark">
          <img
            v-if="(item as any).favicon"
            :src="(item as any).favicon"
            :alt="(item as any).siteName || ''"
            class="h-4 w-4 shrink-0 rounded-sm"
            @error="($event.target as HTMLImageElement).style.display = 'none'" />
          <Icon v-else name="lucide:bookmark" class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="text-xs text-muted-foreground truncate">{{ (item as any).siteName || getDomain((item as any).url || '') }}</span>
        </template>
        <span
          v-if="(item as any).category"
          :class="['rounded-full px-1.5 py-0.5 text-[10px] font-medium', categoryColors[(item as any).category] || 'bg-muted text-muted-foreground']">
          {{ (item as any).category }}
        </span>
      </div>
      <UiCardTitle class="text-base line-clamp-2 group-hover:text-primary transition-colors">
        {{ item.title }}
      </UiCardTitle>
    </UiCardHeader>

    <!-- Content -->
    <UiCardContent class="pt-0 pb-0 space-y-2">
      <!-- Description -->
      <p v-if="item.description" class="text-sm text-muted-foreground line-clamp-2">{{ item.description }}</p>

      <!-- Note: rendered content preview with gradient mask -->
      <div v-if="isNote && (item as any).content" class="relative">
        <div class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-card pointer-events-none rounded-lg z-10" />
        <div
          class="prose prose-sm dark:prose-invert max-w-none line-clamp-4 text-xs leading-relaxed bg-muted/30 rounded-lg p-3 border border-border/30 overflow-hidden"
          v-html="(item as any).content" />
      </div>

      <!-- Bookmark/other: plain text preview -->
      <p v-else-if="contentPreview && !isNote" class="text-sm text-muted-foreground line-clamp-2">
        {{ contentPreview }}
      </p>

      <!-- File size -->
      <p v-if="isFile && (item as any).sizeBytes" class="text-xs text-muted-foreground">
        {{ formatBytes((item as any).sizeBytes) }}
      </p>
    </UiCardContent>

    <!-- Footer -->
    <div class="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 px-4 py-3 mt-2 bg-muted/20">
      <div class="flex items-center gap-1.5">
        <Icon name="lucide:calendar" class="h-3 w-3 text-muted-foreground/60" />
        <span v-if="(item as any).startDate">{{ formatDate((item as any).startDate) }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <template v-if="(item.tags || []).length">
          <span v-for="tag in item.tags.slice(0, 2)" :key="tag" class="bg-muted/80 px-1.5 py-0.5 rounded-md text-[10px] font-medium">
            #{{ tag }}
          </span>
          <span v-if="item.tags.length > 2" class="text-[10px] text-muted-foreground/60">
            +{{ item.tags.length - 2 }}
          </span>
        </template>
      </div>
    </div>
  </UiCard>
</template>
