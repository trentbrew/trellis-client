<script setup lang="ts">
import type { DashboardWidget } from '~/composables/useDashboardBuilder'

defineProps<{
  widget: DashboardWidget
  editMode?: boolean
}>()

const emit = defineEmits<{
  edit: [widget: DashboardWidget]
}>()
</script>

<template>
  <div
    class="widget-renderer h-full bg-card border rounded-lg overflow-hidden"
    :class="{ 'cursor-pointer hover:ring-2 hover:ring-primary/50': editMode }"
    @click="editMode && emit('edit', widget)">
    <!-- Widget Header -->
    <div class="px-4 py-3 border-b bg-muted/20">
      <h3 class="text-sm font-medium truncate">{{ widget.title }}</h3>
    </div>

    <!-- Widget Content -->
    <div class="p-4">
      <!-- Number Stat -->
      <div v-if="widget.type === 'stat-number'" class="text-center py-4">
        <div class="text-4xl font-bold">
          {{ widget.config.prefix }}{{ widget.config.value || '—' }}{{ widget.config.suffix }}
        </div>
        <div v-if="widget.config.label" class="text-sm text-muted-foreground mt-1">
          {{ widget.config.label }}
        </div>
      </div>

      <!-- Trend Stat -->
      <div v-else-if="widget.type === 'stat-trend'" class="text-center py-4">
        <div class="text-3xl font-bold">{{ widget.config.value || '—' }}</div>
        <div class="flex items-center justify-center gap-1 mt-2 text-sm">
          <Icon name="lucide:trending-up" class="w-4 h-4 text-green-500" />
          <span class="text-green-500">+12%</span>
          <span class="text-muted-foreground">vs {{ widget.config.comparePeriod || 'last period' }}</span>
        </div>
      </div>

      <!-- Progress Stat -->
      <div v-else-if="widget.type === 'stat-progress'" class="py-4">
        <div class="flex items-end justify-between mb-2">
          <span class="text-2xl font-bold">{{ widget.config.current || 0 }}</span>
          <span class="text-sm text-muted-foreground">/ {{ widget.config.target || 100 }}</span>
        </div>
        <div class="h-2 bg-muted rounded-full overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all"
            :style="{ width: `${Math.min(100, ((widget.config.current || 0) / (widget.config.target || 100)) * 100)}%` }" />
        </div>
      </div>

      <!-- Bar Chart -->
      <div v-else-if="widget.type === 'chart-bar'" class="h-48 flex items-end justify-around gap-2 pt-4">
        <div v-for="i in 6" :key="i" class="flex-1 flex flex-col items-center gap-1">
          <div class="w-full bg-primary/80 rounded-t" :style="{ height: `${20 + Math.random() * 80}%` }" />
          <span class="text-xs text-muted-foreground">{{ i }}</span>
        </div>
      </div>

      <!-- Line Chart -->
      <div v-else-if="widget.type === 'chart-line'" class="h-48 flex items-center justify-center">
        <svg class="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="text-primary"
            points="0,80 30,60 60,70 90,40 120,50 150,30 180,45 200,20" />
        </svg>
      </div>

      <!-- Pie Chart -->
      <div v-else-if="widget.type === 'chart-pie'" class="h-48 flex items-center justify-center">
        <div class="relative w-32 h-32">
          <svg class="w-full h-full -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="4" class="text-primary/20" />
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              stroke-width="4"
              stroke-dasharray="60 100"
              class="text-primary" />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-lg font-bold">60%</span>
          </div>
        </div>
      </div>

      <!-- Area Chart -->
      <div v-else-if="widget.type === 'chart-area'" class="h-48 flex items-center justify-center">
        <svg class="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
          <polygon fill="currentColor" class="text-primary/20" points="0,100 0,80 30,60 60,70 90,40 120,50 150,30 180,45 200,20 200,100" />
          <polyline fill="none" stroke="currentColor" stroke-width="2" class="text-primary" points="0,80 30,60 60,70 90,40 120,50 150,30 180,45 200,20" />
        </svg>
      </div>

      <!-- Data Table -->
      <div v-else-if="widget.type === 'list-table'" class="space-y-1">
        <div v-for="i in Math.min(widget.config.limit || 5, 5)" :key="i" class="flex items-center gap-2 py-1.5 border-b last:border-0">
          <div class="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">{{ i }}</div>
          <span class="flex-1 text-sm truncate">Item {{ i }}</span>
          <span class="text-xs text-muted-foreground">Value</span>
        </div>
      </div>

      <!-- Card List -->
      <div v-else-if="widget.type === 'list-cards'" class="grid grid-cols-2 gap-2">
        <div v-for="i in Math.min(widget.config.limit || 4, 4)" :key="i" class="p-2 bg-muted/50 rounded text-center">
          <div class="text-sm font-medium">Card {{ i }}</div>
          <div class="text-xs text-muted-foreground">Subtitle</div>
        </div>
      </div>

      <!-- Ranked List -->
      <div v-else-if="widget.type === 'list-ranked'" class="space-y-2">
        <div v-for="i in Math.min(widget.config.limit || 5, 5)" :key="i" class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">{{ i }}</span>
          <span class="flex-1 text-sm truncate">Item {{ i }}</span>
          <span class="text-sm font-medium">{{ 100 - i * 15 }}</span>
        </div>
      </div>

      <!-- Activity Feed -->
      <div v-else-if="widget.type === 'activity-feed'" class="space-y-3">
        <div v-for="i in Math.min(widget.config.limit || 5, 5)" :key="i" class="flex gap-3">
          <div class="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm">Activity event {{ i }}</div>
            <div class="text-xs text-muted-foreground">{{ i }} hours ago</div>
          </div>
        </div>
      </div>

      <!-- Activity Calendar (Heatmap) -->
      <div v-else-if="widget.type === 'activity-calendar'" class="flex gap-1 flex-wrap">
        <div
          v-for="i in 52"
          :key="i"
          class="w-3 h-3 rounded-sm"
          :class="Math.random() > 0.6 ? 'bg-primary' : Math.random() > 0.3 ? 'bg-primary/40' : 'bg-muted'" />
      </div>

      <!-- Task Summary -->
      <div v-else-if="widget.type === 'activity-tasks'" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm">Completed</span>
          <span class="text-sm font-medium text-green-500">12</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm">In Progress</span>
          <span class="text-sm font-medium text-amber-500">5</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-sm">Pending</span>
          <span class="text-sm font-medium text-muted-foreground">8</span>
        </div>
      </div>

      <!-- Text Block -->
      <div v-else-if="widget.type === 'custom-text'" class="prose dark:prose-invert prose-sm max-w-none">
        <p>{{ widget.config.content || 'Enter text...' }}</p>
      </div>

      <!-- Embed -->
      <div v-else-if="widget.type === 'custom-embed'">
        <iframe
          v-if="widget.config.url"
          :src="widget.config.url"
          :height="widget.config.height || 200"
          class="w-full border-0 rounded" />
        <div v-else class="h-32 bg-muted rounded flex items-center justify-center text-sm text-muted-foreground">
          Enter URL to embed
        </div>
      </div>

      <!-- Quick Links -->
      <div v-else-if="widget.type === 'custom-links'" class="space-y-1">
        <a
          v-for="(link, i) in (widget.config.links || []).slice(0, 5)"
          :key="i"
          :href="link.url"
          class="flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors">
          <Icon :name="link.icon || 'lucide:link'" class="w-4 h-4" />
          <span class="text-sm">{{ link.label }}</span>
        </a>
        <div v-if="!widget.config.links?.length" class="text-sm text-muted-foreground italic">
          No links configured
        </div>
      </div>

      <!-- Fallback -->
      <div v-else class="h-32 flex items-center justify-center">
        <div class="text-center">
          <Icon name="lucide:puzzle" class="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <div class="text-sm text-muted-foreground">{{ widget.type }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
