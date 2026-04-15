<script setup lang="ts">
  import { PLATFORM_TYPES } from '~/lib/systemTypes'
  import { useOntologyRegistry } from '~/composables/useOntologyRegistry'
  import { ENTITY_CLASSES } from '~/config/entityRegistry'

  definePageMeta({
    title: 'Database',
    icon: 'lucide:database',
    middleware: ['auth'],
  })

  const { items: allItems } = useEntities()
  const { collections } = useInstantData()
  const { serverTypes, isDynamicType, loading: registryLoading } = useOntologyRegistry()

  // Graph health stats
  const graph = useTrellisGraph()
  const graphHealth = ref<{ status: string; factCount: number; linkCount: number } | null>(null)
  onMounted(async () => {
    try {
      graphHealth.value = await graph.health()
    } catch {
      /* silent */
    }
  })

  // Platform type IDs for deduplication
  const platformTypeIds = new Set(PLATFORM_TYPES.map((t) => t.id.toLowerCase()))

  // All concrete entity types from server ontologies (excludes core structural types and platform duplicates)
  const allEntityTypes = computed(() => {
    return serverTypes.value
      .filter((t) => t.tier !== 'core' && !platformTypeIds.has(t.type.toLowerCase()))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  // Count entities per type (lowercase match against Entity.type)
  const entityCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const item of allItems.value) {
      const type = (item.type || '').toLowerCase()
      counts.set(type, (counts.get(type) || 0) + 1)
    }
    return counts
  })

  // Platform type counts sourced from actual data
  const platformCounts = computed(() => {
    const tagSet = new Set<string>()
    for (const item of allItems.value) {
      if (item.tags) item.tags.forEach((t: string) => tagSet.add(t))
    }
    return new Map<string, number>([
      ['Ontology', allEntityTypes.value.length],
      ['Collection', collections.value?.length || 0],
      ['Tag', tagSet.size],
      ['User', 1],
      ['Projection', 0],
      ['Workflow', 0],
    ])
  })

  function getEntityClassBadge(ec?: string) {
    if (!ec) return null
    const cls = ENTITY_CLASSES[ec as keyof typeof ENTITY_CLASSES]
    return cls ? { label: cls.label, icon: cls.icon } : null
  }

  const isCreating = ref(false)
  const showImportDialog = ref(false)
</script>

<template>
  <Page
    variant="canvas"
    title="Database"
    subtitle="Data"
    description="Browse and manage your data"
    icon="lucide:database"
    :fill-height="true">
    <div class="p-6 space-y-8 max-w-6xl mx-auto">
      <!-- Stats row -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ allEntityTypes.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Entity Types</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ allItems.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Total Records</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ graphHealth?.factCount?.toLocaleString() ?? '—' }}</div>
          <div class="text-xs text-muted-foreground mt-1">Facts</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ graphHealth?.linkCount?.toLocaleString() ?? '—' }}</div>
          <div class="text-xs text-muted-foreground mt-1">Links</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ PLATFORM_TYPES.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Platform Types</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ allEntityTypes.filter((t) => isDynamicType(t.type)).length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Custom Types</div>
        </div>
      </div>

      <!-- Entity Types — flat list of all concrete types from the server -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Entity Types</h2>
          <div class="flex items-center gap-2">
            <UiButton variant="ghost" size="sm" @click="showImportDialog = true">
              <Icon name="lucide:upload" class="mr-1.5 h-3.5 w-3.5" />
              Import
            </UiButton>
            <UiButton variant="ghost" size="sm" @click="isCreating = true">
              <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
              New Type
            </UiButton>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="registryLoading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="i in 6" :key="i" class="rounded-xl border border-border bg-card p-4 animate-pulse">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-lg bg-muted/50" />
              <div class="flex-1 space-y-2">
                <div class="h-4 w-24 rounded bg-muted/50" />
                <div class="h-3 w-16 rounded bg-muted/30" />
              </div>
            </div>
          </div>
        </div>

        <!-- Type grid -->
        <div v-else-if="allEntityTypes.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="entry in allEntityTypes"
            :key="entry.type"
            :to="`/database/${entry.type}`"
            class="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-accent">
              <Icon :name="entry.icon" class="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm truncate">{{ entry.label }}</span>
                <span
                  v-if="isDynamicType(entry.type)"
                  class="inline-flex items-center text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0">
                  custom
                </span>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-muted-foreground">
                  {{ entityCounts.get(entry.type.toLowerCase()) || 0 }} records
                </span>
                <span
                  v-if="getEntityClassBadge(entry.class)"
                  class="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
                  {{ getEntityClassBadge(entry.class)!.label }}
                </span>
                <span
                  v-if="entry.fields?.length"
                  class="text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
                  {{ entry.fields.length }} fields
                </span>
              </div>
            </div>
            <Icon
              name="lucide:chevron-right"
              class="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
          </NuxtLink>
        </div>

        <!-- Empty state -->
        <div v-else class="rounded-xl border border-dashed border-border p-8 text-center">
          <Icon name="lucide:layers" class="text-muted-foreground mx-auto h-12 w-12 mb-3" />
          <h3 class="text-sm font-medium mb-1">No entity types loaded</h3>
          <p class="text-xs text-muted-foreground mb-4">Entity types are loaded from the server ontology registry.</p>
        </div>
      </div>

      <!-- Platform Types -->
      <div>
        <h2 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Platform</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="entry in PLATFORM_TYPES"
            :key="entry.id"
            :to="`/database/${entry.id.toLowerCase()}`"
            class="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-4 hover:bg-accent/30 transition-colors">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/30">
              <Icon
                :name="entry.icon || 'lucide:cog'"
                class="h-5 w-5 text-muted-foreground/60 group-hover:text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm text-muted-foreground group-hover:text-foreground truncate">
                {{ entry.name }}
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-muted-foreground/60">{{ platformCounts.get(entry.id) || 0 }} items</span>
                <span v-if="entry.description" class="text-[11px] text-muted-foreground/50 truncate hidden sm:inline">
                  {{ entry.description }}
                </span>
              </div>
            </div>
            <Icon
              name="lucide:chevron-right"
              class="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <OntologyCreateDialog v-model:open="isCreating" />
    <CollectionImportDialog v-model:open="showImportDialog" />
  </Page>
</template>
