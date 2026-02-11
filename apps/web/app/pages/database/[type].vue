<script setup lang="ts">
  import { ENTITY_TYPES, PLATFORM_TYPES } from '~/lib/systemTypes'
  import { useOntologyRegistry } from '~/composables/useOntologyRegistry'
  import { ENTITY_CLASSES } from '~/config/entityRegistry'
  import { useBrowse, type BrowseViewMode } from '~/composables/useBrowse'

  definePageMeta({
    title: 'Type Explorer',
    icon: 'lucide:database',
    middleware: ['auth'],
  })

  const route = useRoute()
  const typeSlug = computed(() => (route.params.type as string) || '')

  const { items: allItems } = useCalendarItems()
  const { filteredDynamicTypes: ontologyTypes } = useOntologyRegistry()

  // Resolve type info from entity types, platform types, or ontology registry
  const entityType = computed(() => {
    return ENTITY_TYPES.find((t) => t.id.toLowerCase() === typeSlug.value.toLowerCase())
  })

  const platformType = computed(() => {
    return PLATFORM_TYPES.find((t) => t.id.toLowerCase() === typeSlug.value.toLowerCase())
  })

  const systemType = computed(() => entityType.value || platformType.value)

  const ontologyType = computed(() => {
    return (ontologyTypes.value || []).find((t) => t.type.toLowerCase() === typeSlug.value.toLowerCase())
  })

  const typeLabel = computed(() => {
    if (systemType.value) return systemType.value.name
    if (ontologyType.value) return ontologyType.value.label
    return typeSlug.value
  })

  const typeIcon = computed(() => {
    if (systemType.value) return systemType.value.icon || 'lucide:box'
    if (ontologyType.value) return ontologyType.value.icon || 'lucide:database'
    return 'lucide:database'
  })

  const typeDescription = computed(() => {
    if (systemType.value) return systemType.value.description || ''
    if (ontologyType.value) return (ontologyType.value as any).description || ''
    return ''
  })

  const isEntity = computed(() => !!entityType.value)
  const isPlatform = computed(() => !!platformType.value)
  const isSystem = computed(() => !!systemType.value)
  const isFound = computed(() => !!systemType.value || !!ontologyType.value)

  // Get entity class info
  const entityClassName = computed(() => {
    if (systemType.value) {
      const id = systemType.value.id.toLowerCase()
      if (['person', 'organization'].includes(id)) return 'actor'
      if (['document', 'place'].includes(id)) return 'document'
      return 'temporal'
    }
    if (ontologyType.value) return (ontologyType.value as any).entityClass || 'temporal'
    return null
  })

  const entityClassConfig = computed(() => {
    if (!entityClassName.value) return null
    return ENTITY_CLASSES[entityClassName.value as keyof typeof ENTITY_CLASSES] || null
  })

  // Filter entities by type
  const typeItems = computed(() => {
    const slug = typeSlug.value.toLowerCase()
    return allItems.value.filter((item) => {
      const itemType = (item.type || '').toLowerCase()
      return itemType === slug
    })
  })

  // Derive table rows
  const tableRows = computed(() =>
    typeItems.value.map((item) => ({
      id: item.id,
      title: item.title || 'Untitled',
      type: item.type,
      status: (item as any).taskStatus || (item as any).status || '',
      priority: (item as any).priority || '',
      startDate: item.startDate || '',
      createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
    })),
  )

  // Browse composable for search/filter/sort
  const { browseState, filteredItems } = useBrowse({
    items: tableRows,
    searchFields: ['title'] as (keyof (typeof tableRows.value)[0])[],
    defaultViewMode: 'table' as BrowseViewMode,
    sortOptions: [
      { value: 'title', label: 'Title' },
      { value: 'startDate', label: 'Date' },
      { value: 'createdAt', label: 'Created' },
    ],
  })

  // Schema fields for ontology types
  const schemaFields = computed(() => {
    if (ontologyType.value?.fields) {
      return ontologyType.value.fields.map((f) => ({
        name: f.name,
        type: f.valueType,
        required: f.required || false,
        description: f.description || '',
      }))
    }
    return []
  })

  // Active tab
  const activeTab = ref<'data' | 'schema'>('data')

  // Dialog for entity detail
  const selectedItemId = ref<string | null>(null)
  const dialogOpen = ref(false)

  const openItem = (id: string) => {
    selectedItemId.value = id
    dialogOpen.value = true
  }
</script>

<template>
  <Page
    variant="canvas"
    :title="typeLabel"
    subtitle="Database"
    :description="typeDescription"
    :icon="typeIcon"
    :fill-height="true">
    <!-- Not found -->
    <div v-if="!isFound" class="flex h-full flex-col items-center justify-center">
      <Icon name="lucide:database-x" class="text-muted-foreground mb-4 h-12 w-12" />
      <h2 class="text-lg font-semibold">Type not found</h2>
      <p class="text-muted-foreground text-sm mt-1">
        No type matching "{{ typeSlug }}" was found in the registry.
      </p>
      <NuxtLink to="/database" class="mt-4">
        <UiButton variant="outline" size="sm">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Back to Database
        </UiButton>
      </NuxtLink>
    </div>

    <!-- Found -->
    <div v-else class="flex h-full flex-col">
      <!-- Type header info bar -->
      <div class="shrink-0 border-b border-border px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span
                v-if="isEntity"
                class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                <Icon name="lucide:box" class="h-3 w-3" />
                Entity
              </span>
              <span
                v-else-if="isPlatform"
                class="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-full">
                <Icon name="lucide:lock" class="h-3 w-3" />
                System
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1 text-[10px] bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">
                <Icon name="lucide:blocks" class="h-3 w-3" />
                Custom
              </span>
              <span
                v-if="entityClassConfig"
                class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                <Icon :name="entityClassConfig.icon" class="h-3 w-3" />
                {{ entityClassConfig.label }}
              </span>
            </div>
            <span class="text-xs text-muted-foreground">
              {{ typeItems.length }} {{ typeItems.length === 1 ? 'entity' : 'entities' }}
            </span>
          </div>

          <!-- Tab switcher -->
          <div class="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
            <button
              class="px-3 py-1 text-xs rounded-md transition-colors"
              :class="activeTab === 'data' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'data'">
              Data
            </button>
            <button
              class="px-3 py-1 text-xs rounded-md transition-colors"
              :class="activeTab === 'schema' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'schema'">
              Schema
            </button>
          </div>
        </div>
      </div>

      <!-- Data tab -->
      <div v-if="activeTab === 'data'" class="flex-1 overflow-auto">
        <!-- Search bar -->
        <div class="px-6 py-3 border-b border-border">
          <div class="relative max-w-md">
            <Icon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              v-model="browseState.searchQuery.value"
              type="text"
              placeholder="Search..."
              class="w-full rounded-lg border border-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="filteredItems.length === 0" class="flex flex-col items-center justify-center py-16">
          <Icon name="lucide:inbox" class="text-muted-foreground h-10 w-10 mb-3" />
          <p class="text-sm text-muted-foreground">
            {{ browseState.hasSearch.value ? 'No matching entities found.' : `No ${typeLabel} entities yet.` }}
          </p>
        </div>

        <!-- Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border bg-muted/30">
                <th class="text-left px-6 py-2 text-xs font-medium text-muted-foreground">Title</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Priority</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                <th class="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in filteredItems"
                :key="row.id"
                class="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                @click="openItem(row.id)">
                <td class="px-6 py-2.5 font-medium">{{ row.title }}</td>
                <td class="px-4 py-2.5">
                  <span v-if="row.status" class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-muted/50 text-muted-foreground">
                    {{ row.status }}
                  </span>
                </td>
                <td class="px-4 py-2.5">
                  <span v-if="row.priority" class="text-xs text-muted-foreground">{{ row.priority }}</span>
                </td>
                <td class="px-4 py-2.5 text-xs text-muted-foreground">{{ row.startDate }}</td>
                <td class="px-4 py-2.5 text-xs text-muted-foreground">{{ row.createdAt }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Schema tab -->
      <div v-else-if="activeTab === 'schema'" class="flex-1 overflow-auto p-6">
        <!-- System type: read-only schema display -->
        <div v-if="isSystem" class="max-w-2xl space-y-4">
          <div class="rounded-xl border border-border bg-card p-4">
            <div class="flex items-center gap-2 mb-3">
              <Icon name="lucide:lock" class="h-4 w-4 text-muted-foreground" />
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">System Type — Read Only</span>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground w-20">Name:</span>
                <span class="font-medium">{{ systemType?.name }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground w-20">ID:</span>
                <code class="text-xs bg-muted/50 px-1.5 py-0.5 rounded">{{ systemType?.id }}</code>
              </div>
              <div v-if="typeDescription" class="flex items-start gap-2">
                <span class="text-muted-foreground w-20 shrink-0">Description:</span>
                <span>{{ typeDescription }}</span>
              </div>
              <div v-if="entityClassConfig" class="flex items-center gap-2">
                <span class="text-muted-foreground w-20">Class:</span>
                <span class="inline-flex items-center gap-1">
                  <Icon :name="entityClassConfig.icon" class="h-3.5 w-3.5" />
                  {{ entityClassConfig.label }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Custom type: show fields -->
        <div v-else-if="schemaFields.length > 0" class="max-w-2xl space-y-4">
          <div class="rounded-xl border border-border bg-card">
            <div class="px-4 py-3 border-b border-border">
              <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fields ({{ schemaFields.length }})
              </span>
            </div>
            <div class="divide-y divide-border">
              <div
                v-for="field in schemaFields"
                :key="field.name"
                class="flex items-center gap-3 px-4 py-2.5">
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium">{{ field.name }}</div>
                  <div v-if="field.description" class="text-xs text-muted-foreground mt-0.5">{{ field.description }}</div>
                </div>
                <code class="text-[11px] bg-muted/50 px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                  {{ field.type }}
                </code>
                <span v-if="field.required" class="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                  required
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- No schema -->
        <div v-else class="flex flex-col items-center justify-center py-16">
          <Icon name="lucide:file-question" class="text-muted-foreground h-10 w-10 mb-3" />
          <p class="text-sm text-muted-foreground">No schema information available for this type.</p>
        </div>
      </div>
    </div>
  </Page>
</template>
