<script setup lang="ts">
  import { BUILTIN_TEMPLATES } from '~/lib/workspaceTemplates'
  import type { WorkspaceTemplate } from '~/types/workspace-template'

  const search = ref('')
  const selectedCategory = ref<string | null>(null)
  const installDialogOpen = ref(false)
  const selectedTemplate = ref<WorkspaceTemplate | null>(null)

  const { installTemplate, installing, progress } = useTemplateInstaller()

  const categories = computed(() => {
    const cats = new Map<string, { label: string; icon: string; count: number }>()
    for (const t of BUILTIN_TEMPLATES) {
      if (!cats.has(t.category)) {
        cats.set(t.category, { label: t.category, icon: t.icon, count: 0 })
      }
      cats.get(t.category)!.count++
    }
    return Array.from(cats.entries()).map(([key, val]) => ({ key, ...val }))
  })

  const filteredTemplates = computed(() => {
    let templates = [...BUILTIN_TEMPLATES]

    if (selectedCategory.value) {
      templates = templates.filter((t) => t.category === selectedCategory.value)
    }

    if (search.value) {
      const q = search.value.toLowerCase()
      templates = templates.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }

    return templates
  })

  const featuredTemplates = computed(() => BUILTIN_TEMPLATES.filter((t) => t.featured))

  function openInstallDialog(template: WorkspaceTemplate) {
    selectedTemplate.value = template
    installDialogOpen.value = true
  }

  async function handleInstall(mode: 'new-world' | 'merge') {
    if (!selectedTemplate.value) return

    const result = await installTemplate(selectedTemplate.value, {
      mode,
      worldName: selectedTemplate.value.name,
    })

    if (result.success) {
      installDialogOpen.value = false
    }
  }
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Marketplace"
    description="Browse and install workspace templates to create new Worlds.">
    <div class="space-y-6">
      <!-- Search + Category Filters -->
      <div class="flex flex-col gap-3">
        <UiInput v-model="search" placeholder="Search templates..." class="max-w-md">
          <template #prefix>
            <Icon name="lucide:search" class="w-4 h-4 text-muted-foreground" />
          </template>
        </UiInput>

        <div class="flex gap-1.5 flex-wrap">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            :class="!selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'"
            @click="selectedCategory = null">
            <Icon name="lucide:layout-grid" class="w-3.5 h-3.5" />
            All Templates
          </button>
          <button
            v-for="cat in categories"
            :key="cat.key"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors"
            :class="selectedCategory === cat.key ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'"
            @click="selectedCategory = selectedCategory === cat.key ? null : cat.key">
            <Icon :name="cat.icon" class="w-3.5 h-3.5" />
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Featured Section (only when no filter active) -->
      <div v-if="!search && !selectedCategory && featuredTemplates.length">
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Featured</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="template in featuredTemplates"
            :key="template.id"
            class="group relative cursor-pointer rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-md"
            @click="openInstallDialog(template)">
            <div class="mb-3 flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-lg"
                :class="`bg-${template.color || 'blue'}-500/10`">
                <Icon :name="template.icon" class="h-5 w-5" :class="`text-${template.color || 'blue'}-500`" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium truncate">{{ template.name }}</h3>
                <span v-if="template.tier === 'official'" class="text-xs text-muted-foreground">
                  by {{ template.author.name }}
                </span>
              </div>
              <span
                v-if="template.featured"
                class="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 shrink-0">
                Featured
              </span>
            </div>
            <p class="mb-3 text-sm text-muted-foreground line-clamp-2">{{ template.description }}</p>
            <div class="flex items-center gap-3 text-xs text-muted-foreground">
              <span class="flex items-center gap-1">
                <Icon name="lucide:layers" class="h-3 w-3" />
                {{ template.entityTypes.length }} types
              </span>
              <span class="flex items-center gap-1">
                <Icon name="lucide:sidebar" class="h-3 w-3" />
                {{ template.sidebarTree?.length || 0 }} sections
              </span>
              <span v-if="template.rating" class="flex items-center gap-1">
                <Icon name="lucide:star" class="h-3 w-3 text-amber-500" />
                {{ template.rating }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-1">
              <span
                v-for="tag in template.tags.slice(0, 4)"
                :key="tag"
                class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- All Templates -->
      <div>
        <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          {{ selectedCategory ? `${selectedCategory} Templates` : 'All Templates' }}
        </h2>

        <div v-if="filteredTemplates.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="group cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
            @click="openInstallDialog(template)">
            <div class="mb-2 flex items-center gap-2">
              <Icon :name="template.icon" class="h-4 w-4 text-muted-foreground" />
              <h3 class="text-sm font-medium truncate">{{ template.name }}</h3>
              <span
                v-if="template.featured"
                class="ml-auto rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 shrink-0">
                Featured
              </span>
            </div>
            <p class="text-xs text-muted-foreground line-clamp-2">{{ template.description }}</p>
            <div class="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{{ template.entityTypes.length }} types</span>
              <span>&middot;</span>
              <span>{{ template.sidebarTree?.length || 0 }} sections</span>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Icon name="lucide:search-x" class="mb-2 h-8 w-8" />
          <p class="text-sm">No templates match your search</p>
        </div>
      </div>
    </div>

    <!-- Install Dialog -->
    <UiDialog v-model:open="installDialogOpen">
      <UiDialogContent class="max-w-md">
        <UiDialogHeader>
          <UiDialogTitle class="flex items-center gap-2">
            <Icon v-if="selectedTemplate" :name="selectedTemplate.icon" class="h-5 w-5" />
            Install {{ selectedTemplate?.name }}
          </UiDialogTitle>
          <UiDialogDescription>Choose how to install this template</UiDialogDescription>
        </UiDialogHeader>

        <div v-if="!installing" class="space-y-3 py-4">
          <button
            class="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
            @click="handleInstall('new-world')">
            <Icon name="lucide:plus-circle" class="h-5 w-5 text-primary" />
            <div>
              <p class="text-sm font-medium">Create New World</p>
              <p class="text-xs text-muted-foreground">
                Start fresh with a new workspace based on this template
              </p>
            </div>
          </button>
          <button
            class="flex w-full items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/50"
            @click="handleInstall('merge')">
            <Icon name="lucide:merge" class="h-5 w-5 text-blue-500" />
            <div>
              <p class="text-sm font-medium">Add to Current World</p>
              <p class="text-xs text-muted-foreground">
                Merge the template's types and sidebar into your current workspace
              </p>
            </div>
          </button>
        </div>

        <div v-else class="flex flex-col items-center gap-3 py-8">
          <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-primary" />
          <p class="text-sm text-muted-foreground">{{ progress }}</p>
        </div>
      </UiDialogContent>
    </UiDialog>
  </Page>
</template>
