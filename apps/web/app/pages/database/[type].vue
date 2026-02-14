<script setup lang="ts">
  import { PLATFORM_TYPES } from '~/lib/systemTypes'
  import { useOntologyRegistry, type DynamicEntityTypeConfig } from '~/composables/useOntologyRegistry'
  import { ENTITY_CLASSES } from '~/config/entityRegistry'
  import { useBrowsePage } from '~/composables/useBrowsePage'
  import type { Entity } from '~/types/entity'

  definePageMeta({
    title: 'Type Explorer',
    icon: 'lucide:database',
    middleware: ['auth'],
  })

  const route = useRoute()
  const typeSlug = computed(() => (route.params.type as string) || '')

  const { getEntityConfig, isDynamicType } = useOntologyRegistry()

  // Resolve type from ontology registry (covers both system entity types + user-created)
  const resolvedConfig = computed(() => {
    return getEntityConfig(typeSlug.value) as DynamicEntityTypeConfig | null
  })

  // Platform types (structural, not in the ontology registry as entity types)
  const platformType = computed(() => {
    return PLATFORM_TYPES.find((t) => t.id.toLowerCase() === typeSlug.value.toLowerCase())
  })

  // Has schema fields from server?
  const hasServerSchema = computed(() => {
    return resolvedConfig.value && 'fields' in resolvedConfig.value && (resolvedConfig.value as DynamicEntityTypeConfig).fields?.length > 0
  })

  // The ontology type config (for components that expect DynamicEntityTypeConfig)
  const ontologyType = computed<DynamicEntityTypeConfig | undefined>(() => {
    if (hasServerSchema.value) return resolvedConfig.value as DynamicEntityTypeConfig
    return undefined
  })

  const typeLabel = computed(() => {
    if (resolvedConfig.value) return resolvedConfig.value.label
    if (platformType.value) return platformType.value.name
    return typeSlug.value
  })

  const typeIcon = computed(() => {
    if (resolvedConfig.value) return resolvedConfig.value.icon || 'lucide:box'
    if (platformType.value) return platformType.value.icon || 'lucide:cog'
    return 'lucide:database'
  })

  const typeDescription = computed(() => {
    if (resolvedConfig.value) return (resolvedConfig.value as any).description || ''
    if (platformType.value) return platformType.value.description || ''
    return ''
  })

  const isPlatform = computed(() => !!platformType.value && !resolvedConfig.value)
  const isDynamic = computed(() => isDynamicType(typeSlug.value))
  const isFound = computed(() => !!resolvedConfig.value || !!platformType.value)

  // Get entity class info
  const entityClassName = computed(() => {
    if (resolvedConfig.value) return resolvedConfig.value.class || null
    return null
  })

  const entityClassConfig = computed(() => {
    if (!entityClassName.value) return null
    return ENTITY_CLASSES[entityClassName.value as keyof typeof ENTITY_CLASSES] || null
  })

  // ── Schema-driven columns ──────────────────────────────────────────

  interface TableColumn {
    key: string
    label: string
    valueType: string
    align: 'left' | 'right'
    isTitle: boolean
  }

  // Derive columns from schema fields for ALL types that have them
  const tableColumns = computed<TableColumn[]>(() => {
    if (hasServerSchema.value && ontologyType.value?.fields?.length) {
      return ontologyType.value.fields
        .filter((f) => f.valueType !== 'rich_text' && f.valueType !== 'files')
        .map((f) => ({
          key: f.name,
          label: titleCase(f.name),
          valueType: f.valueType,
          align: (f.valueType === 'number' ? 'right' : 'left') as 'left' | 'right',
          isTitle: f.valueType === 'title',
        }))
    }

    // Fallback: minimal columns for platform types or types without server schema
    return [
      { key: 'title', label: 'Title', valueType: 'title', align: 'left', isTitle: true },
      { key: 'taskStatus', label: 'Status', valueType: 'status', align: 'left', isTitle: false },
      { key: 'priority', label: 'Priority', valueType: 'select', align: 'left', isTitle: false },
      { key: 'startDate', label: 'Date', valueType: 'date', align: 'left', isTitle: false },
    ]
  })

  function titleCase(str: string): string {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim()
  }

  // ── Browse page composable ─────────────────────────────────────────

  const searchFields = computed(() => {
    if (ontologyType.value?.searchFields) return ontologyType.value.searchFields
    return ['title', 'description']
  })

  const {
    items: typeItems,
    filteredItems,
    browseState,
    viewOpen,
    viewingItem,
    openDetail,
    handleNewItem,
    canPrev,
    canNext,
    navPrev,
    navNext,
    handleUpdate,
    handleDelete,
  } = useBrowsePage({
    entityType: typeSlug,
    searchFields: searchFields.value,
    defaultViewMode: 'table',
    sortOptions: [
      { value: 'title', label: 'Title' },
      { value: 'startDate', label: 'Date' },
      { value: 'createdAt', label: 'Created' },
    ],
  })

  const viewMode = computed(() => browseState.viewMode.value)

  const viewModeOptions = [
    { mode: 'table' as const, label: 'Table', icon: 'lucide:table' },
    { mode: 'grid' as const, label: 'Grid', icon: 'lucide:grid-3x3' },
    { mode: 'list' as const, label: 'List', icon: 'lucide:list' },
  ]

  // ── Cell formatting ────────────────────────────────────────────────

  function getCellValue(item: Entity, col: TableColumn): string {
    const raw = (item as any)[col.key]
    if (raw === undefined || raw === null || raw === '') return ''

    switch (col.valueType) {
      case 'date':
        try {
          return new Date(raw).toLocaleDateString()
        } catch {
          return String(raw)
        }
      case 'number':
        return typeof raw === 'number' ? raw.toLocaleString() : String(raw)
      case 'checkbox':
        return raw ? '✓' : ''
      case 'url':
      case 'email':
        return String(raw)
      default:
        return String(raw)
    }
  }

  // ── Create new entity ──────────────────────────────────────────────

  const handleCreateNew = () => {
    handleNewItem()
  }

  // ── Detail panel toggle ────────────────────────────────────────────

  const detailPanelOpen = ref(true)

  // Persist per-type preference
  const storageKey = computed(() => `trellis:detailPanel:${typeSlug.value}`)
  watch(detailPanelOpen, (v) => {
    if (import.meta.client) localStorage.setItem(storageKey.value, v ? '1' : '0')
  })
  onMounted(() => {
    if (import.meta.client) {
      const saved = localStorage.getItem(storageKey.value)
      detailPanelOpen.value = saved === null ? true : saved === '1'
    }
  })
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
      <!-- Toolbar -->
      <div class="shrink-0 border-b border-border px-6 py-2.5">
        <div class="flex items-center justify-between gap-4">
          <!-- Left: view mode + badges + count + search -->
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <!-- View mode switcher -->
            <div class="flex items-center rounded-lg border border-border bg-card/25 p-0.5 shrink-0">
              <button
                v-for="opt in viewModeOptions"
                :key="opt.mode"
                type="button"
                class="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors"
                :class="viewMode === opt.mode
                  ? 'bg-sidebar-background/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'"
                @click="browseState.setViewMode(opt.mode)">
                <Icon :name="opt.icon" class="h-3.5 w-3.5" />
                <span class="hidden sm:inline">{{ opt.label }}</span>
              </button>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <span
                v-if="isPlatform"
                class="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-full">
                <Icon name="lucide:lock" class="h-3 w-3" />
                Platform
              </span>
              <span
                v-else-if="isDynamic"
                class="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                <Icon name="lucide:blocks" class="h-3 w-3" />
                Custom
              </span>
              <span
                v-else-if="resolvedConfig"
                class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                <Icon name="lucide:box" class="h-3 w-3" />
                Entity
              </span>
              <span
                v-if="entityClassConfig"
                class="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                <Icon :name="entityClassConfig.icon" class="h-3 w-3" />
                {{ entityClassConfig.label }}
              </span>
              <span class="text-[11px] text-muted-foreground">
                {{ typeItems.length }} {{ typeItems.length === 1 ? 'record' : 'records' }}
              </span>
            </div>

            <!-- Inline search -->
            <div class="relative max-w-xs flex-1">
              <Icon name="lucide:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                v-model="browseState.searchQuery.value"
                type="text"
                placeholder="Search..."
                class="w-full rounded-md border border-border bg-transparent py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-ring" />
            </div>
          </div>

          <!-- Right: actions -->
          <div class="flex items-center gap-1.5 shrink-0">
            <!-- Import -->
            <UiButton variant="ghost" size="icon-sm" class="h-7 w-7" title="Import">
              <Icon name="lucide:upload" class="h-3.5 w-3.5" />
            </UiButton>
            <!-- Export -->
            <UiButton variant="ghost" size="icon-sm" class="h-7 w-7" title="Export">
              <Icon name="lucide:download" class="h-3.5 w-3.5" />
            </UiButton>
            <!-- Detail panel toggle -->
            <UiButton
              v-if="hasServerSchema && ontologyType"
              variant="ghost"
              size="icon-sm"
              class="h-7 w-7"
              :class="detailPanelOpen ? 'bg-muted' : ''"
              title="Toggle schema panel"
              @click="detailPanelOpen = !detailPanelOpen">
              <Icon name="lucide:panel-right" class="h-3.5 w-3.5" />
            </UiButton>
            <!-- New entity -->
            <UiButton v-if="resolvedConfig" size="sm" @click="handleCreateNew">
              <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
              New {{ typeLabel }}
            </UiButton>
          </div>
        </div>
      </div>

      <!-- Content + optional detail panel -->
      <div class="flex-1 flex min-h-0">
        <!-- Main content area -->
        <div class="flex-1 overflow-auto">

          <!-- Empty state -->
          <div v-if="filteredItems.length === 0" class="flex flex-col items-center justify-center py-16">
            <Icon name="lucide:inbox" class="text-muted-foreground h-10 w-10 mb-3" />
            <p class="text-sm text-muted-foreground mb-4">
              {{ browseState.hasSearch.value ? 'No matching entities found.' : `No ${typeLabel} entities yet.` }}
            </p>
            <UiButton v-if="resolvedConfig && !browseState.hasSearch.value" size="sm" @click="handleCreateNew">
              <Icon name="lucide:plus" class="mr-1.5 h-3.5 w-3.5" />
              Add first {{ typeLabel }}
            </UiButton>
          </div>

          <!-- ================= GRID VIEW ================= -->
          <div v-else-if="viewMode === 'grid'" class="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <EntityCard
              v-for="item in filteredItems"
              :key="item.id"
              :item="item"
              layout="grid"
              @click="openDetail(item)" />
          </div>

          <!-- ================= LIST VIEW ================= -->
          <div v-else-if="viewMode === 'list'" class="flex flex-col gap-1 p-4">
            <EntityCard
              v-for="item in filteredItems"
              :key="item.id"
              :item="item"
              layout="list"
              @click="openDetail(item)" />
          </div>

          <!-- ================= TABLE VIEW ================= -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border bg-muted/30">
                  <th
                    v-for="col in tableColumns"
                    :key="col.key"
                    class="py-2 text-xs font-medium text-muted-foreground"
                    :class="[
                      col.isTitle ? 'px-6' : 'px-4',
                      col.align === 'right' ? 'text-right' : 'text-left',
                    ]">
                    {{ col.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in filteredItems"
                  :key="item.id"
                  class="border-b border-border/50 hover:bg-accent/30 cursor-pointer transition-colors"
                  @click="openDetail(item)">
                  <td
                    v-for="col in tableColumns"
                    :key="col.key"
                    :class="[
                      col.isTitle ? 'px-6 font-medium' : 'px-4',
                      col.align === 'right' ? 'text-right' : '',
                      'py-2.5',
                    ]">
                    <!-- Title column -->
                    <span v-if="col.isTitle">{{ item.title || 'Untitled' }}</span>

                    <!-- Status/select badge -->
                    <span
                      v-else-if="(col.valueType === 'status' || col.valueType === 'select') && getCellValue(item, col)"
                      class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-muted/50 text-muted-foreground">
                      {{ getCellValue(item, col) }}
                    </span>

                    <!-- Checkbox -->
                    <span v-else-if="col.valueType === 'checkbox'" class="text-muted-foreground">
                      <Icon
                        :name="(item as any)[col.key] ? 'lucide:check-square' : 'lucide:square'"
                        class="h-4 w-4" />
                    </span>

                    <!-- URL -->
                    <a
                      v-else-if="col.valueType === 'url' && getCellValue(item, col)"
                      :href="getCellValue(item, col)"
                      class="text-xs text-primary hover:underline truncate max-w-[200px] inline-block"
                      target="_blank"
                      @click.stop>
                      {{ getCellValue(item, col) }}
                    </a>

                    <!-- Default text -->
                    <span v-else class="text-xs text-muted-foreground">
                      {{ getCellValue(item, col) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Detail panel (right side) -->
        <Transition name="panel">
          <DatabaseDetailPanel
            v-if="detailPanelOpen && hasServerSchema && ontologyType"
            :type-config="ontologyType"
            :entity-count="typeItems.length"
            :is-platform="isPlatform"
            :is-dynamic="isDynamic"
            :entity-class-config="entityClassConfig"
            :type-description="typeDescription" />
        </Transition>
      </div>
    </div>

    <!-- Dynamic entity dialog (for custom ontology types) -->
    <DynamicEntityDialog
      v-if="isDynamic && ontologyType && viewingItem"
      :open="viewOpen"
      :item="viewingItem"
      mode="edit"
      :type-config="ontologyType"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      @update:open="(v) => { viewOpen = v }"
      @close="viewOpen = false"
      @save="handleUpdate($event)"
      @delete="handleDelete"
      @navigate-prev="navPrev"
      @navigate-next="navNext" />

    <!-- Standard entity dialog (for system entity types) -->
    <EntityDialog
      v-else-if="viewingItem && !isDynamic"
      :open="viewOpen"
      :item="viewingItem"
      mode="edit"
      :can-navigate-prev="canPrev"
      :can-navigate-next="canNext"
      @update:open="(v) => { viewOpen = v }"
      @close="viewOpen = false"
      @save="handleUpdate($event)"
      @delete="handleDelete"
      @navigate-prev="navPrev"
      @navigate-next="navNext" />
  </Page>
</template>

<style scoped>
  .panel-enter-active,
  .panel-leave-active {
    transition: all 0.2s ease;
  }

  .panel-enter-from,
  .panel-leave-to {
    opacity: 0;
    transform: translateX(16px);
    width: 0;
    min-width: 0;
    overflow: hidden;
  }
</style>
