<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'

  interface Folder {
    id: string
    name: string
    icon: string
    color: string
    itemCount: number
    lastModified: string
  }

  interface FolderNode extends Folder {
    children?: FolderNode[]
  }

  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const { currentOrganization } = useOrganizations()

  useHead(() => ({
    title: `Folders | ${currentFacility.value?.name || 'Facility'}`,
  }))

  const { open: openDetail } = useGlobalDetailSheet()

  const folders = ref([
    {
      id: '1',
      name: 'Air Quality',
      icon: 'lucide:wind',
      color: 'text-blue-500',
      itemCount: 24,
      lastModified: '2025-01-20',
    },
    {
      id: '2',
      name: 'Stormwater',
      icon: 'lucide:cloud-rain',
      color: 'text-cyan-500',
      itemCount: 18,
      lastModified: '2025-01-18',
    },
    {
      id: '3',
      name: 'Hazardous Waste',
      icon: 'lucide:flask-conical',
      color: 'text-amber-500',
      itemCount: 32,
      lastModified: '2025-01-22',
    },
    {
      id: '4',
      name: 'Safety & Training',
      icon: 'lucide:hard-hat',
      color: 'text-emerald-500',
      itemCount: 15,
      lastModified: '2025-01-15',
    },
    {
      id: '5',
      name: 'Permits & Licenses',
      icon: 'lucide:file-badge',
      color: 'text-purple-500',
      itemCount: 8,
      lastModified: '2025-01-10',
    },
    {
      id: '6',
      name: 'Inspections',
      icon: 'lucide:clipboard-check',
      color: 'text-rose-500',
      itemCount: 45,
      lastModified: '2025-01-21',
    },
    {
      id: '7',
      name: 'Emergency Response',
      icon: 'lucide:siren',
      color: 'text-red-500',
      itemCount: 12,
      lastModified: '2025-01-19',
    },
    {
      id: '8',
      name: 'Wastewater',
      icon: 'lucide:droplets',
      color: 'text-indigo-500',
      itemCount: 28,
      lastModified: '2025-01-17',
    },
    {
      id: '9',
      name: 'Noise Monitoring',
      icon: 'lucide:volume-2',
      color: 'text-orange-500',
      itemCount: 9,
      lastModified: '2025-01-14',
    },
    {
      id: '10',
      name: 'Spill Prevention',
      icon: 'lucide:alert-triangle',
      color: 'text-yellow-600',
      itemCount: 16,
      lastModified: '2025-01-23',
    },
    {
      id: '11',
      name: 'Chemical Inventory',
      icon: 'lucide:beaker',
      color: 'text-teal-500',
      itemCount: 42,
      lastModified: '2025-01-22',
    },
    {
      id: '12',
      name: 'Compliance Reports',
      icon: 'lucide:file-text',
      color: 'text-slate-500',
      itemCount: 67,
      lastModified: '2025-01-24',
    },
  ])

  const stats = computed<PageStat[]>(() => [
    { label: 'Total Folders', value: folders.value.length, icon: 'lucide:folder' },
    {
      label: 'Total Items',
      value: folders.value.reduce((sum, f) => sum + f.itemCount, 0),
      icon: 'lucide:file',
      color: 'text-blue-500',
    },
  ])

  const folderEntityTypes = ref<string[]>(['Tasks', 'PDFs'])
  const folderEntityLabel = computed<string>(() => folderEntityTypes.value.join(', '))
  const folderEntityPlural = computed<string>(() => {
    if (!folderEntityTypes.value.length) return 'Items'
    if (folderEntityTypes.value.length === 1) return folderEntityTypes.value[0] ?? 'Items'
    return 'Items'
  })
  const folderEntitySamples = computed(() => {
    const types = folderEntityTypes.value.length ? folderEntityTypes.value : ['Items']
    return types.map((type) => {
      const normalized = type.toLowerCase()
      if (normalized === 'tasks' || normalized === 'task') {
        return { type, singular: 'Task', icon: 'lucide:check-square' }
      }
      if (normalized === 'pdfs' || normalized === 'pdf') {
        return { type, singular: 'PDF', icon: 'lucide:file-text' }
      }
      const singular = type.endsWith('s') ? type.slice(0, -1) : type
      return { type, singular, icon: 'lucide:file' }
    })
  })
  const folderEntitySingular = computed<string>(() => folderEntitySamples.value[0]?.singular ?? 'Item')
  const folderEntityPluralLower = computed<string>(() => folderEntityPlural.value.toLowerCase())
  const folderActionLabel = computed<string>(() => {
    if (!folderEntityTypes.value.length) return 'Add Item'
    if (folderEntityTypes.value.length === 1) return `Add ${folderEntitySingular.value}`
    return 'Add Items'
  })

  const treeSearch = ref('')
  const expandedFolderIds = ref<string[]>(['group-compliance', 'group-operations', 'group-safety'])
  const selectedNode = ref<FolderNode | undefined>(folders.value[0])

  const folderGroups = computed<FolderNode[]>(() => [
    {
      id: 'group-compliance',
      name: 'Compliance',
      icon: 'lucide:folder-tree',
      color: 'text-muted-foreground',
      itemCount: 0,
      lastModified: '',
      children: folders.value.slice(0, 4),
    },
    {
      id: 'group-operations',
      name: 'Operations',
      icon: 'lucide:folder-tree',
      color: 'text-muted-foreground',
      itemCount: 0,
      lastModified: '',
      children: folders.value.slice(4, 8),
    },
    {
      id: 'group-safety',
      name: 'Safety',
      icon: 'lucide:folder-tree',
      color: 'text-muted-foreground',
      itemCount: 0,
      lastModified: '',
      children: folders.value.slice(8),
    },
  ])

  const filteredFolderTree = computed<FolderNode[]>(() => {
    const query = treeSearch.value.trim().toLowerCase()
    if (!query) return folderGroups.value

    return folderGroups.value
      .map((group) => {
        const groupMatch = group.name.toLowerCase().includes(query)
        if (groupMatch) return group
        const children = (group.children || []).filter((child) => child.name.toLowerCase().includes(query))
        if (!children.length) return null
        return { ...group, children }
      })
      .filter(Boolean) as FolderNode[]
  })

  const selectedFolder = computed<Folder | null>(() => {
    const node = selectedNode.value
    if (!node || node.children?.length) return null
    return node
  })

  const getTreeKey = (node: Record<string, any>) => (node as FolderNode).id ?? 'unknown'

  const folderContents = computed(() => {
    const folder = selectedFolder.value
    if (!folder || folder.itemCount === 0) return []
    const count = Math.min(6, folder.itemCount)
    const samples = folderEntitySamples.value.length
      ? folderEntitySamples.value
      : [{ type: 'Items', singular: 'Item', icon: 'lucide:file' }]
    return Array.from({ length: count }, (_, index) => {
      const sample = samples[index % samples.length]
      return {
        id: `${folder.id}-item-${index + 1}`,
        name: `${folder.name} ${sample.singular} ${index + 1}`,
        icon: sample.icon,
        meta: `${sample.singular} · Updated ${folder.lastModified}`,
      }
    })
  })

  const folderHeaderSummary = computed(() => {
    const folder = selectedFolder.value
    if (!folder) return 'Choose a folder from the explorer to see its details.'
    return `${folder.itemCount} ${folderEntityPlural.value} · Updated ${folder.lastModified}`
  })

  const folderOverviewDescription = computed(() => {
    if (!selectedFolder.value) return 'Select a folder to see its summary.'
    const entityLabel = folderEntityLabel.value || folderEntityPlural.value
    return `Track ${entityLabel} stored in this folder.`
  })

  const folderOverviewStats = computed(() => {
    const folder = selectedFolder.value
    if (!folder) return []
    return [
      { label: 'Items', value: folder.itemCount },
      { label: 'Last Updated', value: folder.lastModified },
      { label: 'Entities', value: folderEntityLabel.value || folderEntityPlural.value },
      { label: 'Status', value: 'Active' },
    ]
  })

  const headerBackground = computed(
    () =>
      "linear-gradient(to bottom, rgba(30, 41, 59, 0.7), rgba(30, 41, 59, 0.8)), url('/assets/backgrounds/chemical-plant.png')",
  )

  const iconOptions = [
    { value: 'lucide:wind', label: 'Wind', icon: 'lucide:wind' },
    { value: 'lucide:cloud-rain', label: 'Cloud Rain', icon: 'lucide:cloud-rain' },
    { value: 'lucide:flask-conical', label: 'Flask', icon: 'lucide:flask-conical' },
    { value: 'lucide:hard-hat', label: 'Hard Hat', icon: 'lucide:hard-hat' },
    { value: 'lucide:file-badge', label: 'File Badge', icon: 'lucide:file-badge' },
    { value: 'lucide:clipboard-check', label: 'Clipboard', icon: 'lucide:clipboard-check' },
    { value: 'lucide:siren', label: 'Siren', icon: 'lucide:siren' },
    { value: 'lucide:droplets', label: 'Droplets', icon: 'lucide:droplets' },
    { value: 'lucide:volume-2', label: 'Volume', icon: 'lucide:volume-2' },
    { value: 'lucide:alert-triangle', label: 'Alert', icon: 'lucide:alert-triangle' },
    { value: 'lucide:beaker', label: 'Beaker', icon: 'lucide:beaker' },
    { value: 'lucide:file-text', label: 'File Text', icon: 'lucide:file-text' },
  ]

  const colorOptions = [
    { value: 'text-blue-500', label: 'Blue', color: 'bg-blue-500' },
    { value: 'text-cyan-500', label: 'Cyan', color: 'bg-cyan-500' },
    { value: 'text-amber-500', label: 'Amber', color: 'bg-amber-500' },
    { value: 'text-emerald-500', label: 'Emerald', color: 'bg-emerald-500' },
    { value: 'text-purple-500', label: 'Purple', color: 'bg-purple-500' },
    { value: 'text-rose-500', label: 'Rose', color: 'bg-rose-500' },
    { value: 'text-red-500', label: 'Red', color: 'bg-red-500' },
    { value: 'text-indigo-500', label: 'Indigo', color: 'bg-indigo-500' },
  ]

  // Listen for global detail sheet events
  onMounted(() => {
    window.addEventListener('global-detail-sheet:save', ((e: CustomEvent) => {
      const { node, formData, mode } = e.detail
      if (e.detail.entityType !== 'folder') return

      if (mode === 'create') {
        const newFolder: Folder = {
          id: crypto.randomUUID(),
          name: formData.name || '',
          icon: formData.icon || 'lucide:folder',
          color: formData.color || 'text-blue-500',
          itemCount: 0,
          lastModified: new Date().toISOString().slice(0, 10),
        }
        folders.value.push(newFolder)
      } else {
        const index = folders.value.findIndex((f) => f.id === node.id)
        if (index !== -1) folders.value[index] = { ...folders.value[index], ...formData }
      }
    }) as EventListener)

    window.addEventListener('global-detail-sheet:delete', ((e: CustomEvent) => {
      const { node } = e.detail
      if (e.detail.entityType !== 'folder') return
      folders.value = folders.value.filter((f) => f.id !== node.id)
    }) as EventListener)
  })
</script>

<template>
  <Page
    variant="filesystem"
    title="Folders"
    :subtitle="currentOrganization?.name"
    description="Organize and manage your compliance documents and tasks by category."
    icon="lucide:folder"
    icon-class="text-amber-300"
    :stats="stats">
    <UiSplitter auto-save-id="folders-explorer" direction="horizontal" class="h-full">
      <UiSplitterPanel
        :default-size="28"
        :min-size="18"
        :max-size="40"
        class="flex h-full flex-col border-r border-border bg-card/30">
        <div class="border-b border-border bg-card/40 px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Icon name="lucide:folder-tree" class="h-4 w-4 text-muted-foreground" />
              Explorer
            </div>
            <UiButton variant="ghost" size="xs" @click="openDetail(null, { entityType: 'folder', mode: 'create' })">
              <Icon name="lucide:folder-plus" class="h-4 w-4" />
            </UiButton>
          </div>
          <div class="relative mt-3">
            <Icon
              name="lucide:search"
              class="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <UiInput v-model="treeSearch" placeholder="Search folders..." class="h-8 pl-8" />
          </div>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <UiTree
            v-model="selectedNode"
            v-model:expanded="expandedFolderIds"
            :items="filteredFolderTree"
            :get-key="getTreeKey"
            :get-children="(node) => node.children"
            selection-behavior="replace">
            <template #default="{ flattenItems }">
              <ul class="space-y-1">
                <UiTreeItem
                  v-for="item in flattenItems"
                  :key="item._id"
                  v-bind="item.bind"
                  class="group flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 data-[selected]:bg-accent/60 data-[selected]:text-foreground"
                  :style="{ paddingLeft: `${(item.level - 1) * 16 + 8}px` }">
                  <template #default="{ isExpanded }">
                    <Icon
                      v-if="item.hasChildren"
                      :name="isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                      class="h-3.5 w-3.5 text-muted-foreground" />
                    <Icon :name="item.value.icon || 'lucide:folder'" :class="['h-4 w-4', item.value.color]" />
                    <span class="truncate">{{ item.value.name }}</span>
                    <span v-if="!item.hasChildren" class="ml-auto text-xs text-muted-foreground/70">
                      {{ item.value.itemCount }}
                    </span>
                  </template>
                </UiTreeItem>
              </ul>
            </template>
          </UiTree>
        </div>
      </UiSplitterPanel>
      <UiSplitterHandle with-handle />
      <UiSplitterPanel :default-size="72" :min-size="45" class="flex h-full flex-col">
        <div class="border-b border-border bg-background p-6">
          <div
            class="relative overflow-hidden rounded-lg px-6 py-6 text-white"
            :style="{
              backgroundImage: headerBackground,
              backgroundSize: 'cover',
              backgroundRepeat: 'no-repeat',
            }">
            <div class="relative z-10 flex flex-col gap-6">
              <div class="flex flex-wrap items-start justify-between gap-6">
                <div class="min-w-0">
                  <div class="inline-flex items-center gap-2">
                    <Icon
                      :name="selectedFolder?.icon || 'lucide:folder'"
                      :class="['h-4 w-4', selectedFolder?.color || 'text-white/70']" />
                    <p class="text-xs uppercase tracking-wide text-white/70">{{ currentOrganization?.name }}</p>
                  </div>
                  <h1 class="mt-2 text-2xl font-semibold">{{ selectedFolder?.name || 'Select a folder' }}</h1>
                  <p class="mt-2 max-w-2xl text-sm text-white/70">{{ folderHeaderSummary }}</p>
                  <p class="mt-1 max-w-2xl text-sm text-white/60">{{ folderOverviewDescription }}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <UiButton
                    variant="outline"
                    size="sm"
                    :disabled="!selectedFolder"
                    class="border-white/30 text-white hover:bg-white/10"
                    @click="selectedFolder && openDetail(selectedFolder, { entityType: 'folder' })">
                    <Icon name="lucide:eye" class="mr-2 h-4 w-4" />
                    View Details
                  </UiButton>
                  <UiButton
                    size="sm"
                    class="bg-white/10 text-white hover:bg-white/20"
                    @click="openDetail(null, { entityType: 'folder', mode: 'create' })">
                    <Icon name="lucide:folder-plus" class="mr-2 h-4 w-4" />
                    New Folder
                  </UiButton>
                </div>
              </div>
              <div v-if="folderOverviewStats.length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  v-for="stat in folderOverviewStats"
                  :key="stat.label"
                  class="flex flex-col gap-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                  <p class="text-xs font-medium uppercase tracking-wider text-white/70">{{ stat.label }}</p>
                  <p class="text-lg font-semibold text-white">{{ stat.value }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          <template v-if="selectedFolder">
            <UiCard class="p-6">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-base font-semibold">Folder Contents</h3>
                  <p class="text-sm text-muted-foreground">Recent {{ folderEntityPluralLower }} inside this folder.</p>
                </div>
                <UiButton variant="ghost" size="sm">
                  <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
                  {{ folderActionLabel }}
                </UiButton>
              </div>
              <div v-if="folderContents.length" class="mt-4 space-y-2">
                <div
                  v-for="item in folderContents"
                  :key="item.id"
                  class="flex items-center gap-3 rounded-lg border border-border bg-card/40 px-3 py-2">
                  <div class="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                    <Icon :name="item.icon" class="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">{{ item.name }}</p>
                    <p class="text-xs text-muted-foreground">{{ item.meta }}</p>
                  </div>
                  <UiButton variant="ghost" size="icon">
                    <Icon name="lucide:more-vertical" class="h-4 w-4" />
                  </UiButton>
                </div>
              </div>
              <div v-else class="mt-4 rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                <p class="text-sm text-muted-foreground">
                  No {{ folderEntityPluralLower }} yet. {{ folderActionLabel }} to populate this folder.
                </p>
              </div>
            </UiCard>
          </template>
          <div
            v-else
            class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
            <Icon name="lucide:folder-open" class="h-10 w-10 text-muted-foreground" />
            <h3 class="mt-4 text-lg font-semibold">Select a folder</h3>
            <p class="mt-2 text-sm text-muted-foreground">Choose a folder from the explorer to preview its contents.</p>
            <UiButton class="mt-4" @click="openDetail(null, { entityType: 'folder', mode: 'create' })">
              <Icon name="lucide:folder-plus" class="mr-2 h-4 w-4" />
              Create Folder
            </UiButton>
          </div>
        </div>
      </UiSplitterPanel>
    </UiSplitter>

    <!-- Results count -->
    <div class="text-xs text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing all {{ folders.length }} folders
    </div>
  </Page>
</template>
