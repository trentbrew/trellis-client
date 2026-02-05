<script setup lang="ts">
import type { OntologyPackage, OntologyCategory, InstalledPackage } from '~/composables/useOntologyMarketplace'

const _props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const { packagesByCategory, featuredPackages, categoryMeta, searchPackages, createInstalledPackage } =
  useOntologyMarketplace()

// UI state
const activeCategory = ref<OntologyCategory | 'all' | 'installed'>('all')
const searchQuery = ref('')
const selectedPackage = ref<OntologyPackage | null>(null)
const installedPackages = ref<InstalledPackage[]>([])

const categories: Array<{ id: OntologyCategory | 'all' | 'installed'; label: string; icon: string }> = [
  { id: 'all', label: 'All Packages', icon: 'lucide:grid-3x3' },
  { id: 'installed', label: 'Installed', icon: 'lucide:check-circle' },
  { id: 'crm', label: 'CRM', icon: 'lucide:users' },
  { id: 'project-management', label: 'Projects', icon: 'lucide:folder-kanban' },
  { id: 'inventory', label: 'Inventory', icon: 'lucide:package' },
  { id: 'education', label: 'Education', icon: 'lucide:graduation-cap' },
  { id: 'events', label: 'Events', icon: 'lucide:calendar-days' },
  { id: 'hr', label: 'HR', icon: 'lucide:users-round' },
  { id: 'utilities', label: 'Utilities', icon: 'lucide:wrench' },
]

const currentPackages = computed(() => {
  if (searchQuery.value.trim()) {
    return searchPackages(searchQuery.value)
  }

  if (activeCategory.value === 'all') {
    return featuredPackages.value.concat(
      Object.values(packagesByCategory.value)
        .flat()
        .filter((p) => !p.featured)
    )
  }

  if (activeCategory.value === 'installed') {
    const installedIds = installedPackages.value.map((i) => i.packageId)
    return Object.values(packagesByCategory.value)
      .flat()
      .filter((p) => installedIds.includes(p.id))
  }

  return packagesByCategory.value[activeCategory.value] || []
})

const getPackageStatus = (pkgId: string) => {
  const installed = installedPackages.value.find((i) => i.packageId === pkgId)
  return installed?.status
}

// Handlers
const handleInstall = (pkg: OntologyPackage) => {
  const installed = createInstalledPackage(pkg.id)
  if (installed) {
    installedPackages.value.push(installed)
  }
}

const handleUninstall = (pkg: OntologyPackage) => {
  installedPackages.value = installedPackages.value.filter((i) => i.packageId !== pkg.id)
}

const handleView = (pkg: OntologyPackage) => {
  selectedPackage.value = pkg
}

const handleBack = () => {
  selectedPackage.value = null
}

const installedCount = computed(() => installedPackages.value.length)
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent class="w-[90vw] max-w-[1400px] h-[90vh] flex flex-col p-0">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b shrink-0">
        <div class="flex items-center gap-3">
          <Icon name="lucide:store" class="w-5 h-5 text-primary" />
          <div>
            <h2 class="text-lg font-semibold">Ontology Marketplace</h2>
            <p class="text-sm text-muted-foreground">
              {{ installedCount }} installed · Browse and install vertical modules
            </p>
          </div>
        </div>
        <UiButton variant="ghost" size="icon" @click="emit('update:open', false)">
          <Icon name="lucide:x" class="w-4 h-4" />
        </UiButton>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Category Sidebar -->
        <div class="w-52 border-r bg-muted/20 p-3 overflow-y-auto shrink-0">
          <!-- Search -->
          <div class="mb-4">
            <UiInput
              v-model="searchQuery"
              placeholder="Search packages..."
              class="h-9">
              <template #prefix>
                <Icon name="lucide:search" class="w-4 h-4 text-muted-foreground" />
              </template>
            </UiInput>
          </div>

          <nav class="space-y-1">
            <button
              v-for="cat in categories"
              :key="cat.id"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors text-sm"
              :class="activeCategory === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'"
              @click="activeCategory = cat.id; selectedPackage = null">
              <Icon :name="cat.icon" class="w-4 h-4" />
              <span class="flex-1">{{ cat.label }}</span>
              <span
                v-if="cat.id === 'installed'"
                class="text-xs px-1.5 py-0.5 rounded-full"
                :class="activeCategory === cat.id ? 'bg-primary-foreground/20' : 'bg-muted'">
                {{ installedCount }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Package List / Detail -->
        <div class="flex-1 overflow-y-auto">
          <!-- Package Detail View -->
          <div v-if="selectedPackage" class="p-6">
            <button
              class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
              @click="handleBack">
              <Icon name="lucide:arrow-left" class="w-4 h-4" />
              Back to packages
            </button>

            <!-- Package Header -->
            <div class="flex items-start gap-4 mb-6">
              <div class="p-4 rounded-xl" :class="categoryMeta[selectedPackage.category]?.label ? 'bg-primary/10' : 'bg-muted'">
                <Icon :name="selectedPackage.icon" class="w-10 h-10 text-primary" />
              </div>
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <h2 class="text-2xl font-bold">{{ selectedPackage.name }}</h2>
                  <span
                    v-if="getPackageStatus(selectedPackage.id) === 'installed'"
                    class="flex items-center gap-1 text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                    <Icon name="lucide:check-circle" class="w-3 h-3" />
                    Installed
                  </span>
                </div>
                <p class="text-muted-foreground mt-1">{{ selectedPackage.description }}</p>
                <div class="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span>v{{ selectedPackage.version }}</span>
                  <span>by {{ selectedPackage.author.name }}</span>
                  <span v-if="selectedPackage.downloads" class="flex items-center gap-1">
                    <Icon name="lucide:download" class="w-3.5 h-3.5" />
                    {{ selectedPackage.downloads.toLocaleString() }} downloads
                  </span>
                  <span v-if="selectedPackage.rating" class="flex items-center gap-1">
                    <Icon name="lucide:star" class="w-3.5 h-3.5 text-amber-500" />
                    {{ selectedPackage.rating }}
                  </span>
                </div>
              </div>
              <div>
                <UiButton
                  v-if="getPackageStatus(selectedPackage.id) === 'installed'"
                  variant="outline"
                  class="text-destructive hover:text-destructive"
                  @click="handleUninstall(selectedPackage)">
                  Uninstall
                </UiButton>
                <UiButton v-else @click="handleInstall(selectedPackage)">
                  <Icon name="lucide:download" class="w-4 h-4 mr-2" />
                  Install
                </UiButton>
              </div>
            </div>

            <!-- Package Details -->
            <div class="grid grid-cols-2 gap-6">
              <!-- Entity Types -->
              <div>
                <h3 class="font-semibold mb-3 flex items-center gap-2">
                  <Icon name="lucide:layers" class="w-4 h-4" />
                  Entity Types ({{ selectedPackage.entityTypes.length }})
                </h3>
                <div class="space-y-2">
                  <div
                    v-for="entity in selectedPackage.entityTypes"
                    :key="entity.id"
                    class="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Icon :name="entity.icon" class="w-5 h-5 text-muted-foreground" />
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-sm">{{ entity.name }}</div>
                      <div class="text-xs text-muted-foreground">{{ entity.fields.length }} fields</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Views & Widgets -->
              <div class="space-y-6">
                <div>
                  <h3 class="font-semibold mb-3 flex items-center gap-2">
                    <Icon name="lucide:layout-grid" class="w-4 h-4" />
                    Views ({{ selectedPackage.views.length }})
                  </h3>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="view in selectedPackage.views"
                      :key="view.id"
                      class="text-sm px-3 py-1.5 bg-muted rounded-lg">
                      {{ view.name }}
                    </span>
                  </div>
                </div>

                <div v-if="selectedPackage.widgets.length">
                  <h3 class="font-semibold mb-3 flex items-center gap-2">
                    <Icon name="lucide:pie-chart" class="w-4 h-4" />
                    Widgets ({{ selectedPackage.widgets.length }})
                  </h3>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="widget in selectedPackage.widgets"
                      :key="widget.id"
                      class="text-sm px-3 py-1.5 bg-muted rounded-lg">
                      {{ widget.name }}
                    </span>
                  </div>
                </div>

                <!-- Tags -->
                <div>
                  <h3 class="font-semibold mb-3">Tags</h3>
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="tag in selectedPackage.tags"
                      :key="tag"
                      class="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Package List View -->
          <div v-else class="p-6">
            <div v-if="currentPackages.length === 0" class="text-center py-16">
              <Icon name="lucide:package-open" class="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p class="text-muted-foreground">
                {{ searchQuery ? 'No packages found matching your search' : 'No packages in this category' }}
              </p>
            </div>

            <div v-else class="grid gap-4">
              <OntologyCard
                v-for="pkg in currentPackages"
                :key="pkg.id"
                :pkg="pkg"
                :status="getPackageStatus(pkg.id)"
                @install="handleInstall"
                @uninstall="handleUninstall"
                @view="handleView" />
            </div>
          </div>
        </div>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
