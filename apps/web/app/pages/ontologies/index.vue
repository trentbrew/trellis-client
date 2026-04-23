<script setup lang="ts">
  /**
   * /ontologies — top-level list of all entity schemas.
   *
   * Groups schemas by tier: Custom (editable) / System (built-in) / Core
   * (kernel-managed). Each card links to `/ontologies/[type]` for the
   * schema editor. Record browsing lives in `/collections/[type]`.
   */
  import { useOntologyRegistry } from '~/composables/useOntologyRegistry'
  import { ENTITY_CLASSES } from '~/config/entityRegistry'

  definePageMeta({
    title: 'Ontologies',
    icon: 'lucide:shapes',
    middleware: ['auth'],
  })

  const { items: allItems } = useEntities()
  const { serverTypes, loading: registryLoading } = useOntologyRegistry()

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

  // All schemas, split by tier. `core` is kernel-structural and rare in UI.
  const userSchemas = computed(() =>
    serverTypes.value
      .filter((t) => t.tier === 'user')
      .sort((a, b) => a.label.localeCompare(b.label)),
  )
  const systemSchemas = computed(() =>
    serverTypes.value
      .filter((t) => t.tier === 'system')
      .sort((a, b) => a.label.localeCompare(b.label)),
  )
  const coreSchemas = computed(() =>
    serverTypes.value
      .filter((t) => t.tier === 'core')
      .sort((a, b) => a.label.localeCompare(b.label)),
  )

  // Count entities per type (lowercase match against Entity.type)
  const entityCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const item of allItems.value) {
      const type = (item.type || '').toLowerCase()
      counts.set(type, (counts.get(type) || 0) + 1)
    }
    return counts
  })

  function getEntityClassBadge(ec?: string) {
    if (!ec) return null
    const cls = ENTITY_CLASSES[ec as keyof typeof ENTITY_CLASSES]
    return cls ? { label: cls.label, icon: cls.icon } : null
  }

  const isCreating = ref(false)
</script>

<template>
  <Page
    variant="canvas"
    title="Ontologies"
    subtitle="Schemas"
    description="Define the shape of your data — types, fields, and relationships."
    icon="lucide:shapes"
    :fill-height="true">
    <div class="p-6 space-y-8 max-w-6xl mx-auto">
      <!-- Stats row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ userSchemas.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Custom Types</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ systemSchemas.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">System Types</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ allItems.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Total Records</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ graphHealth?.factCount?.toLocaleString() ?? '—' }}</div>
          <div class="text-xs text-muted-foreground mt-1">Facts</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your schemas</h2>
          <p class="text-[11px] text-muted-foreground/70 mt-0.5">
            Click a type to edit its fields, rename it, or change its icon.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/ontologies/graph">
            <UiButton variant="ghost" size="sm">
              <Icon name="lucide:git-branch" class="mr-1.5 h-3.5 w-3.5" />
              Graph view
            </UiButton>
          </NuxtLink>
          <UiButton size="sm" @click="isCreating = true">
            <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
            New type
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

      <!-- Custom types (user tier) -->
      <div v-else>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <Icon name="lucide:blocks" class="h-3.5 w-3.5 text-blue-400" />
            <h2 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom</h2>
            <span class="text-[10px] text-muted-foreground/60">{{ userSchemas.length }}</span>
          </div>
        </div>

        <div v-if="userSchemas.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="entry in userSchemas"
            :key="entry.type"
            :to="`/ontologies/${entry.type}`"
            class="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-accent">
              <Icon :name="entry.icon" class="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm truncate">{{ entry.label }}</span>
                <span
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

        <div v-else class="rounded-xl border border-dashed border-border p-8 text-center">
          <Icon name="lucide:blocks" class="text-muted-foreground mx-auto h-10 w-10 mb-3" />
          <h3 class="text-sm font-medium mb-1">No custom types yet</h3>
          <p class="text-xs text-muted-foreground mb-4">
            Create your first custom schema to extend Trellis with your own entities.
          </p>
          <UiButton size="sm" @click="isCreating = true">
            <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
            Create a type
          </UiButton>
        </div>
      </div>

      <!-- System types -->
      <div v-if="systemSchemas.length > 0">
        <div class="flex items-center gap-2 mb-3">
          <Icon name="lucide:lock" class="h-3.5 w-3.5 text-muted-foreground" />
          <h2 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">System</h2>
          <span class="text-[10px] text-muted-foreground/60">{{ systemSchemas.length }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="entry in systemSchemas"
            :key="entry.type"
            :to="`/ontologies/${entry.type}`"
            class="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-4 hover:bg-accent/30 transition-colors">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/40">
              <Icon :name="entry.icon" class="h-5 w-5 text-muted-foreground/70 group-hover:text-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm text-muted-foreground group-hover:text-foreground truncate">
                {{ entry.label }}
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-muted-foreground/60">
                  {{ entityCounts.get(entry.type.toLowerCase()) || 0 }} records
                </span>
                <span
                  v-if="entry.fields?.length"
                  class="text-[10px] text-muted-foreground/50 bg-muted/30 px-1.5 py-0.5 rounded">
                  {{ entry.fields.length }} fields
                </span>
              </div>
            </div>
            <Icon
              name="lucide:chevron-right"
              class="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
          </NuxtLink>
        </div>
      </div>

      <!-- Core types (rare) -->
      <details v-if="coreSchemas.length > 0" class="group">
        <summary class="flex items-center gap-2 mb-3 cursor-pointer text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground uppercase tracking-wide">
          <Icon name="lucide:chevron-right" class="h-3 w-3 group-open:rotate-90 transition-transform" />
          <Icon name="lucide:shield" class="h-3.5 w-3.5" />
          Core (kernel)
          <span class="text-[10px] opacity-60">{{ coreSchemas.length }}</span>
        </summary>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          <NuxtLink
            v-for="entry in coreSchemas"
            :key="entry.type"
            :to="`/ontologies/${entry.type}`"
            class="group flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-4 hover:bg-accent/20 transition-colors">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/30">
              <Icon :name="entry.icon" class="h-5 w-5 text-muted-foreground/50" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm text-muted-foreground/80 truncate">{{ entry.label }}</div>
              <div class="text-xs text-muted-foreground/50">{{ entry.fields?.length || 0 }} fields</div>
            </div>
          </NuxtLink>
        </div>
      </details>
    </div>

    <OntologyCreateDialog v-model:open="isCreating" />
  </Page>
</template>
