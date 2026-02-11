<script setup lang="ts">
  import { ENTITY_TYPES, PLATFORM_TYPES } from '~/lib/systemTypes'
  import { useOntologyRegistry } from '~/composables/useOntologyRegistry'
  import { ENTITY_CLASSES } from '~/config/entityRegistry'

  definePageMeta({
    title: 'Database',
    icon: 'lucide:database',
    middleware: ['auth'],
  })

  const { items: allItems } = useCalendarItems()
  const { collections, currentApp } = useInstantData()
  const { filteredDynamicTypes: ontologyTypes } = useOntologyRegistry()

  // Build a unified list of all types
  interface TypeEntry {
    id: string
    label: string
    icon: string
    description?: string
    category: 'entity' | 'custom' | 'system'
    entityClass?: string
    fieldCount?: number
    route: string
  }

  const entityTypeEntries = computed<TypeEntry[]>(() => {
    return ENTITY_TYPES.map((t) => ({
      id: t.id,
      label: t.name,
      description: t.description,
      icon: t.icon || 'lucide:box',
      category: 'entity' as const,
      entityClass: inferEntityClass(t.id),
      route: `/database/${t.id.toLowerCase()}`,
    }))
  })

  const platformTypeEntries = computed<TypeEntry[]>(() => {
    return PLATFORM_TYPES.map((t) => ({
      id: t.id,
      label: t.name,
      description: t.description,
      icon: t.icon || 'lucide:cog',
      category: 'system' as const,
      route: `/database/${t.id.toLowerCase()}`,
    }))
  })

  const ontologyTypeEntries = computed<TypeEntry[]>(() => {
    return (ontologyTypes.value || []).map((t) => ({
      id: t.type,
      label: t.label,
      icon: t.icon || 'lucide:database',
      category: 'custom' as const,
      entityClass: (t as any).entityClass || 'temporal',
      fieldCount: t.fields?.length,
      route: `/database/${t.type}`,
    }))
  })

  const collectionEntries = computed<TypeEntry[]>(() => {
    const appId = currentApp.value?.id
    if (!appId) return []
    return (collections.value || [])
      .filter((c) => !c.parentId)
      .map((c) => ({
        id: c.id,
        label: c.title,
        icon: c.icon || 'lucide:database',
        category: 'custom' as const,
        entityClass: 'document',
        route: `/database/collections/${c.slug}`,
      }))
  })

  const _allTypes = computed(() => [
    ...entityTypeEntries.value,
    ...ontologyTypeEntries.value,
    ...collectionEntries.value,
    ...platformTypeEntries.value,
  ])

  // Count entities per type (lowercase match against CalendarItem.type)
  const entityCounts = computed(() => {
    const counts = new Map<string, number>()
    for (const item of allItems.value) {
      const type = (item.type || '').toLowerCase()
      counts.set(type, (counts.get(type) || 0) + 1)
    }
    return counts
  })

  function inferEntityClass(typeId: string): string {
    const id = typeId.toLowerCase()
    if (['person', 'organization'].includes(id)) return 'actor'
    if (['document', 'place'].includes(id)) return 'document'
    if (['event', 'thing'].includes(id)) return 'temporal'
    return 'temporal'
  }

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
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ platformTypeEntries.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">System Types</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ entityTypeEntries.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Entity Types</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ ontologyTypeEntries.length + collectionEntries.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Custom Types</div>
        </div>
        <div class="rounded-xl border border-border bg-card p-4">
          <div class="text-2xl font-bold">{{ allItems.length }}</div>
          <div class="text-xs text-muted-foreground mt-1">Total Entities</div>
        </div>
      </div>

      <!-- System (Platform) Types -->
      <div>
        <h2 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">System</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="entry in platformTypeEntries"
            :key="entry.id"
            :to="entry.route"
            class="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 p-4 hover:bg-accent/30 transition-colors">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/30">
              <Icon :name="entry.icon" class="h-5 w-5 text-muted-foreground/60 group-hover:text-muted-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm text-muted-foreground group-hover:text-foreground truncate">{{ entry.label }}</div>
              <div v-if="entry.description" class="text-[11px] text-muted-foreground/60 mt-0.5 truncate">{{ entry.description }}</div>
            </div>
            <Icon name="lucide:chevron-right" class="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0" />
          </NuxtLink>
        </div>
      </div>

      <!-- Entity Types -->
      <div>
        <h2 class="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Entities</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="entry in entityTypeEntries"
            :key="entry.id"
            :to="entry.route"
            class="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-accent">
              <Icon :name="entry.icon" class="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm truncate">{{ entry.label }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-muted-foreground">
                  {{ entityCounts.get(entry.id.toLowerCase()) || 0 }} entities
                </span>
                <span
                  v-if="getEntityClassBadge(entry.entityClass)"
                  class="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
                  {{ getEntityClassBadge(entry.entityClass)!.label }}
                </span>
              </div>
            </div>
            <Icon name="lucide:chevron-right" class="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
          </NuxtLink>
        </div>
      </div>

      <!-- Custom Types & Collections -->
      <div v-if="ontologyTypeEntries.length > 0 || collectionEntries.length > 0">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custom</h2>
          <div class="flex items-center gap-2">
            <UiButton variant="ghost" size="sm" @click="showImportDialog = true">
              <Icon name="lucide:upload" class="mr-1.5 h-3.5 w-3.5" />
              Import
            </UiButton>
            <UiButton variant="ghost" size="sm" @click="isCreating = true">
              <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
              New Table
            </UiButton>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <NuxtLink
            v-for="entry in [...ontologyTypeEntries, ...collectionEntries]"
            :key="entry.id"
            :to="entry.route"
            class="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/50 group-hover:bg-accent">
              <Icon :name="entry.icon" class="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-sm truncate">{{ entry.label }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-muted-foreground">
                  {{ entityCounts.get(entry.id.toLowerCase()) || 0 }} entities
                </span>
                <span
                  v-if="entry.fieldCount"
                  class="text-[10px] text-muted-foreground/70 bg-muted/30 px-1.5 py-0.5 rounded">
                  {{ entry.fieldCount }} fields
                </span>
              </div>
            </div>
            <Icon name="lucide:chevron-right" class="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0" />
          </NuxtLink>
        </div>
      </div>

      <!-- Empty state for custom types -->
      <div v-else class="rounded-xl border border-dashed border-border p-8 text-center">
        <Icon name="lucide:layers" class="text-muted-foreground mx-auto h-12 w-12 mb-3" />
        <h3 class="text-sm font-medium mb-1">No custom types yet</h3>
        <p class="text-xs text-muted-foreground mb-4">Create a collection or define a custom ontology to extend your database.</p>
        <div class="flex gap-2 justify-center">
          <UiButton size="sm" @click="isCreating = true">
            <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
            New Table
          </UiButton>
          <UiButton variant="outline" size="sm" @click="showImportDialog = true">
            <Icon name="lucide:upload" class="mr-1.5 h-3.5 w-3.5" />
            Import
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Dialogs -->
    <CollectionCreateDialog v-model:open="isCreating" />
    <CollectionImportDialog v-model:open="showImportDialog" />
  </Page>
</template>
