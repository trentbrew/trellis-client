<script setup lang="ts">
import type { OntologyPackage, PackageStatus } from '~/composables/useOntologyMarketplace'

const props = defineProps<{
  pkg: OntologyPackage
  status?: PackageStatus
  compact?: boolean
}>()

const emit = defineEmits<{
  install: [pkg: OntologyPackage]
  uninstall: [pkg: OntologyPackage]
  view: [pkg: OntologyPackage]
}>()

const categoryColors: Record<string, { bg: string; text: string }> = {
  crm: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
  'project-management': { bg: 'bg-purple-500/10', text: 'text-purple-600' },
  inventory: { bg: 'bg-orange-500/10', text: 'text-orange-600' },
  education: { bg: 'bg-green-500/10', text: 'text-green-600' },
  healthcare: { bg: 'bg-red-500/10', text: 'text-red-600' },
  'real-estate': { bg: 'bg-cyan-500/10', text: 'text-cyan-600' },
  events: { bg: 'bg-pink-500/10', text: 'text-pink-600' },
  hr: { bg: 'bg-indigo-500/10', text: 'text-indigo-600' },
  finance: { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
  utilities: { bg: 'bg-gray-500/10', text: 'text-gray-600' },
}

const defaultColors = { bg: 'bg-gray-500/10', text: 'text-gray-600' }
const colors = computed(() => categoryColors[props.pkg.category] ?? defaultColors)

const statusConfig: Record<PackageStatus, { label: string; color: string; icon: string }> = {
  available: { label: 'Available', color: 'text-muted-foreground', icon: 'lucide:circle' },
  installed: { label: 'Installed', color: 'text-green-500', icon: 'lucide:check-circle' },
  updating: { label: 'Updating', color: 'text-amber-500', icon: 'lucide:refresh-cw' },
  error: { label: 'Error', color: 'text-red-500', icon: 'lucide:alert-circle' },
}

const currentStatus = computed(() => statusConfig[props.status || 'available'])

const formattedDownloads = computed(() => {
  const d = props.pkg.downloads || 0
  if (d >= 1000) return `${(d / 1000).toFixed(1)}k`
  return d.toString()
})
</script>

<template>
  <div
    class="group relative bg-card border rounded-lg overflow-hidden transition-all hover:shadow-md cursor-pointer"
    :class="[status === 'installed' ? 'ring-2 ring-green-500/20' : '']"
    @click="emit('view', pkg)">
    <!-- Featured Badge -->
    <div
      v-if="pkg.featured"
      class="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded-full">
      Featured
    </div>

    <!-- Card Content -->
    <div class="p-4">
      <div class="flex items-start gap-3">
        <!-- Icon -->
        <div class="shrink-0 p-3 rounded-xl" :class="colors.bg">
          <Icon :name="pkg.icon" class="w-6 h-6" :class="colors.text" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-foreground">{{ pkg.name }}</h3>
            <span v-if="status" class="flex items-center gap-1 text-xs" :class="currentStatus.color">
              <Icon :name="currentStatus.icon" class="w-3 h-3" />
            </span>
          </div>
          <p class="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {{ pkg.description }}
          </p>
        </div>
      </div>

      <!-- Tags -->
      <div v-if="!compact && pkg.tags.length > 0" class="mt-3 flex flex-wrap gap-1">
        <span
          v-for="tag in pkg.tags.slice(0, 3)"
          :key="tag"
          class="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {{ tag }}
        </span>
        <span v-if="pkg.tags.length > 3" class="text-xs px-2 py-0.5 text-muted-foreground">
          +{{ pkg.tags.length - 3 }}
        </span>
      </div>

      <!-- Entity Types -->
      <div v-if="!compact" class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span class="flex items-center gap-1">
          <Icon name="lucide:layers" class="w-3.5 h-3.5" />
          {{ pkg.entityTypes.length }} types
        </span>
        <span class="flex items-center gap-1">
          <Icon name="lucide:layout-grid" class="w-3.5 h-3.5" />
          {{ pkg.views.length }} views
        </span>
        <span v-if="pkg.widgets.length" class="flex items-center gap-1">
          <Icon name="lucide:pie-chart" class="w-3.5 h-3.5" />
          {{ pkg.widgets.length }} widgets
        </span>
      </div>
    </div>

    <!-- Card Footer -->
    <div class="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
      <div class="flex items-center gap-3 text-xs text-muted-foreground">
        <span>v{{ pkg.version }}</span>
        <span v-if="pkg.downloads" class="flex items-center gap-1">
          <Icon name="lucide:download" class="w-3 h-3" />
          {{ formattedDownloads }}
        </span>
        <span v-if="pkg.rating" class="flex items-center gap-1">
          <Icon name="lucide:star" class="w-3 h-3 text-amber-500" />
          {{ pkg.rating }}
        </span>
      </div>

      <div class="flex items-center gap-2" @click.stop>
        <UiButton
          v-if="status === 'installed'"
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive"
          @click="emit('uninstall', pkg)">
          Uninstall
        </UiButton>
        <UiButton v-else variant="outline" size="sm" @click="emit('install', pkg)">
          Install
        </UiButton>
      </div>
    </div>
  </div>
</template>
