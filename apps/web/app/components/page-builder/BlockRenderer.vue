<script setup lang="ts">
import type { PageBlock } from '~/composables/usePageBuilder'

const props = defineProps<{
  block: PageBlock
  editMode?: boolean
}>()

const emit = defineEmits<{
  edit: [block: PageBlock]
}>()

const calloutStyles: Record<string, { bg: string; border: string; icon: string }> = {
  info: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', icon: 'lucide:info' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: 'lucide:alert-triangle' },
  success: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', icon: 'lucide:check-circle' },
  error: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: 'lucide:x-circle' },
}

const getCalloutStyle = (type: string) => calloutStyles[type] || calloutStyles.info
</script>

<template>
  <div
    class="block-renderer relative"
    :class="{ 'cursor-pointer hover:ring-2 hover:ring-primary/50 rounded-lg': editMode }"
    @click="editMode && emit('edit', block)">
    <!-- Heading Block -->
    <component
      :is="'h' + (block.config.level || 1)"
      v-if="block.type === 'heading'"
      class="font-bold"
      :class="{
        'text-3xl': block.config.level === 1,
        'text-2xl': block.config.level === 2,
        'text-xl': block.config.level === 3,
      }">
      {{ block.config.text || 'Heading' }}
    </component>

    <!-- Text Block -->
    <div v-else-if="block.type === 'text'" class="prose dark:prose-invert max-w-none">
      <p>{{ block.config.content || 'Enter text...' }}</p>
    </div>

    <!-- Image Block -->
    <figure v-else-if="block.type === 'image'" class="space-y-2">
      <img
        v-if="block.config.src"
        :src="block.config.src"
        :alt="block.config.alt || ''"
        class="rounded-lg max-w-full h-auto" />
      <div v-else class="bg-muted rounded-lg h-48 flex items-center justify-center">
        <Icon name="lucide:image" class="w-12 h-12 text-muted-foreground" />
      </div>
      <figcaption v-if="block.config.caption" class="text-sm text-muted-foreground text-center">
        {{ block.config.caption }}
      </figcaption>
    </figure>

    <!-- Divider Block -->
    <hr v-else-if="block.type === 'divider'" class="border-t border-border my-4" />

    <!-- Callout Block -->
    <div
      v-else-if="block.type === 'callout'"
      class="p-4 rounded-lg border"
      :class="[getCalloutStyle(block.config.type).bg, getCalloutStyle(block.config.type).border]">
      <div class="flex gap-3">
        <Icon :name="getCalloutStyle(block.config.type).icon" class="w-5 h-5 shrink-0 mt-0.5" />
        <div class="space-y-1">
          <div v-if="block.config.title" class="font-medium">{{ block.config.title }}</div>
          <div class="text-sm">{{ block.config.content || 'Callout content...' }}</div>
        </div>
      </div>
    </div>

    <!-- Collection View Block -->
    <div v-else-if="block.type === 'collection-view'" class="border rounded-lg p-4">
      <div class="flex items-center gap-2 mb-3">
        <Icon name="lucide:database" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium">Collection View</span>
      </div>
      <div v-if="block.config.collectionId" class="text-sm text-muted-foreground">
        Displaying {{ block.config.viewType }} view of collection
      </div>
      <div v-else class="text-sm text-muted-foreground italic">
        Select a collection to display
      </div>
    </div>

    <!-- Chart Block -->
    <div v-else-if="block.type === 'chart'" class="border rounded-lg p-4">
      <div class="flex items-center gap-2 mb-3">
        <Icon name="lucide:bar-chart-2" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium">Chart</span>
      </div>
      <div class="bg-muted rounded h-48 flex items-center justify-center">
        <span class="text-muted-foreground text-sm">{{ block.config.chartType || 'bar' }} chart preview</span>
      </div>
    </div>

    <!-- Embed/Iframe Block -->
    <div v-else-if="block.type === 'iframe'" class="border rounded-lg overflow-hidden">
      <iframe
        v-if="block.config.url"
        :src="block.config.url"
        :height="block.config.height || 400"
        class="w-full border-0"
        loading="lazy" />
      <div v-else class="bg-muted h-48 flex items-center justify-center">
        <span class="text-muted-foreground text-sm">Enter URL to embed</span>
      </div>
    </div>

    <!-- Video Block -->
    <div v-else-if="block.type === 'video'" class="border rounded-lg overflow-hidden">
      <div class="bg-muted aspect-video flex items-center justify-center">
        <Icon name="lucide:play-circle" class="w-12 h-12 text-muted-foreground" />
      </div>
    </div>

    <!-- Map Block -->
    <div v-else-if="block.type === 'map'" class="border rounded-lg overflow-hidden">
      <div class="bg-muted h-64 flex items-center justify-center">
        <Icon name="lucide:map" class="w-12 h-12 text-muted-foreground" />
      </div>
    </div>

    <!-- Columns Block -->
    <div
      v-else-if="block.type === 'columns'"
      class="grid gap-4"
      :class="{
        'grid-cols-2': block.config.count === 2,
        'grid-cols-3': block.config.count === 3,
        'grid-cols-4': block.config.count === 4,
      }">
      <div
        v-for="i in (block.config.count || 2)"
        :key="i"
        class="bg-muted/50 border border-dashed rounded-lg p-4 min-h-[100px] flex items-center justify-center">
        <span class="text-xs text-muted-foreground">Column {{ i }}</span>
      </div>
    </div>

    <!-- Tabs Block -->
    <div v-else-if="block.type === 'tabs'" class="border rounded-lg">
      <div class="flex border-b">
        <button
          v-for="(tab, i) in (block.config.tabs || [{ id: '1', label: 'Tab 1' }])"
          :key="tab.id"
          class="px-4 py-2 text-sm"
          :class="i === 0 ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'">
          {{ tab.label }}
        </button>
      </div>
      <div class="p-4 text-sm text-muted-foreground">Tab content area</div>
    </div>

    <!-- Stat Card Block -->
    <div v-else-if="block.type === 'stat-card'" class="border rounded-lg p-4">
      <div class="text-sm text-muted-foreground">{{ block.config.title || 'Metric' }}</div>
      <div class="text-3xl font-bold mt-1">{{ block.config.value || '—' }}</div>
    </div>

    <!-- Recent Activity Block -->
    <div v-else-if="block.type === 'recent-activity'" class="border rounded-lg p-4">
      <div class="flex items-center gap-2 mb-3">
        <Icon name="lucide:activity" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium">Recent Activity</span>
      </div>
      <div class="space-y-2">
        <div v-for="i in 3" :key="i" class="flex items-center gap-2 text-sm text-muted-foreground">
          <div class="w-2 h-2 rounded-full bg-muted-foreground/30" />
          <span>Activity item {{ i }}</span>
        </div>
      </div>
    </div>

    <!-- Quick Links Block -->
    <div v-else-if="block.type === 'quick-links'" class="border rounded-lg p-4">
      <div class="flex items-center gap-2 mb-3">
        <Icon name="lucide:link" class="w-4 h-4 text-muted-foreground" />
        <span class="text-sm font-medium">Quick Links</span>
      </div>
      <div class="text-sm text-muted-foreground italic">Add links to configure</div>
    </div>

    <!-- Fallback for unknown block types -->
    <div v-else class="border border-dashed rounded-lg p-4 text-center">
      <Icon name="lucide:puzzle" class="w-8 h-8 text-muted-foreground mx-auto mb-2" />
      <div class="text-sm text-muted-foreground">Unknown block: {{ block.type }}</div>
    </div>
  </div>
</template>
