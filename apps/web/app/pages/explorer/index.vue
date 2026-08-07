<script setup lang="ts">
  /**
   * /explorer — Finder-like local file explorer.
   *
   * Three-pane layout (like Finder):
   *   - Left: sidebar with the folder tree + quick places
   *   - Middle: current directory listing (name / size / modified columns)
   *   - Right: preview pane for the selected file
   *
   * Backed by GET /api/storage/list which walks the local `~/.nodebook/files/`
   * directory tree. Reads use the existing /api/storage/local-file endpoint.
   */
  import { classifyFile, getFileCategoryMeta } from '~/utils/fileClassification'

  definePageMeta({
    title: 'Explorer',
    icon: 'lucide:folder',
    layout: 'default',
  })

  interface FsItem {
    name: string
    type: 'folder' | 'file'
    size: number
    modifiedAt: string | null
    hidden: boolean
    ext: string | null
  }

  interface FsListing {
    path: string
    parent: string
    items: FsItem[]
  }

  // ── Navigation state ─────────────────────────────────────────────
  const currentPath = ref('')
  const listing = ref<FsListing | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Expanded folder paths in the tree (Set-style array for reactivity)
  const expandedDirs = ref<string[]>([])
  // Lazy tree children cache: path -> FsItem[] (folders only)
  const treeCache = ref<Record<string, FsItem[]>>({})

  const searchQuery = ref('')
  const showHidden = ref(false)
  const selectedItem = ref<FsItem | null>(null)
  const selectedPath = ref<string | null>(null)

  // ── File URL helpers ──────────────────────────────────────────────
  function fileUrl(relativePath: string): string {
    return `/api/storage/local-file?path=${encodeURIComponent(relativePath)}`
  }

  function joinPath(parent: string, name: string): string {
    return parent ? `${parent}/${name}` : name
  }

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchListing = async (path: string) => {
    loading.value = true
    error.value = null
    try {
      const res = await $fetch<FsListing>('/api/storage/list', { query: { path } })
      listing.value = res
      currentPath.value = res.path
      selectedItem.value = null
      selectedPath.value = null
    } catch (err: any) {
      error.value = err?.statusMessage || err?.message || 'Failed to list directory'
      listing.value = null
    } finally {
      loading.value = false
    }
  }

  // Load the root on mount.
  onMounted(() => {
    fetchListing('')
  })

  // ── Navigation ────────────────────────────────────────────────────
  const navigateTo = (path: string) => {
    if (path !== currentPath.value) fetchListing(path)
  }

  const goUp = () => {
    if (listing.value?.parent != null) fetchListing(listing.value.parent)
  }

  const goHome = () => {
    fetchListing('')
  }

  const openItem = (item: FsItem) => {
    const path = joinPath(currentPath.value, item.name)
    if (item.type === 'folder') {
      navigateTo(path)
    } else {
      selectedItem.value = item
      selectedPath.value = path
    }
  }

  const refresh = () => {
    expandedDirs.value = []
    treeCache.value = {}
    fetchListing(currentPath.value)
  }

  // ── Breadcrumb segments ───────────────────────────────────────────
  const breadcrumbs = computed(() => {
    const parts = currentPath.value ? currentPath.value.split('/') : []
    const crumbs = [{ label: 'Files', path: '' }]
    let acc = ''
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part
      crumbs.push({ label: part, path: acc })
    }
    return crumbs
  })

  // ── Filtering / sorting for the main list ────────────────────────
  const filteredItems = computed(() => {
    const items = listing.value?.items ?? []
    const visible = showHidden.value ? items : items.filter((i) => !i.hidden)
    if (!searchQuery.value) return visible
    const q = searchQuery.value.toLowerCase()
    return visible.filter((i) => i.name.toLowerCase().includes(q))
  })

  function formatSize(size: number): string {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  function formatModified(iso: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function itemIcon(item: FsItem): string {
    if (item.type === 'folder') return 'lucide:folder'
    const category = classifyFile(undefined, item.name)
    return getFileCategoryMeta(category).icon
  }

  function itemTint(item: FsItem): string {
    if (item.type === 'folder') return 'text-amber-400'
    const category = classifyFile(undefined, item.name)
    return `text-${getFileCategoryMeta(category).color}-400`
  }

  // ── Tree sidebar ──────────────────────────────────────────────────
  const isExpanded = (path: string) => expandedDirs.value.includes(path)

  const toggleDir = (path: string) => {
    expandedDirs.value = isExpanded(path)
      ? expandedDirs.value.filter((p) => p !== path)
      : [...expandedDirs.value, path]
  }

  const treeChildren = (path: string): FsItem[] => treeCache.value[path] ?? []

  const loadTreeDir = async (path: string) => {
    if (treeCache.value[path]) return
    try {
      const res = await $fetch<FsListing>('/api/storage/list', { query: { path } })
      treeCache.value = { ...treeCache.value, [path]: res.items.filter((i) => i.type === 'folder') }
    } catch {
      treeCache.value = { ...treeCache.value, [path]: [] }
    }
  }

  const onTreeDirClick = async (path: string) => {
    await loadTreeDir(path)
    toggleDir(path)
  }

  const isCurrentDir = (path: string) => currentPath.value === path
  const treeIndent = (depth: number) => ({ paddingLeft: `${8 + depth * 14}px` })

  interface TreeEntry {
    name: string
    path: string
    depth: number
  }

  // Flatten expanded folders into a walkable list for the sidebar.
  const treeFlat = computed<TreeEntry[]>(() => {
    const out: TreeEntry[] = []
    const walk = (path: string, depth: number) => {
      for (const item of treeChildren(path)) {
        const childPath = joinPath(path, item.name)
        out.push({ name: item.name, path: childPath, depth })
        if (isExpanded(childPath)) walk(childPath, depth + 1)
      }
    }
    walk('', 0)
    return out
  })

  // Expand tree along the current path so the active folder is visible.
  watch(currentPath, async (path) => {
    if (!path) return
    const parts = path.split('/')
    let acc = ''
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part
      await loadTreeDir(acc)
      if (!expandedDirs.value.includes(acc)) {
        expandedDirs.value = [...expandedDirs.value, acc]
      }
    }
  })

  // ── Preview ───────────────────────────────────────────────────────
  const selectedKind = computed(() => {
    if (!selectedItem.value) return null
    const category = classifyFile(undefined, selectedItem.value.name)
    if (category === 'image') return 'image'
    if (category === 'video') return 'video'
    if (category === 'audio') return 'audio'
    if (category === 'code' || category === 'data' || category === 'document') return 'text'
    return 'file'
  })

  const textPreview = ref<string | null>(null)
  const previewLoading = ref(false)

  watch([selectedPath, selectedKind], async ([path, kind]) => {
    textPreview.value = null
    if (!path || kind !== 'text') return
    previewLoading.value = true
    try {
      const res = await $fetch(fileUrl(path))
      if (typeof res === 'string') textPreview.value = res.slice(0, 8000)
      else if (res instanceof Blob) textPreview.value = await res.text()
    } catch {
      textPreview.value = null
    } finally {
      previewLoading.value = false
    }
  })

  // ── Sidebar width drag (simple) ───────────────────────────────────
  const sidebarWidth = ref(220)
  let dragging = false
  let startX = 0
  let startW = 0

  function onResizeStart(e: MouseEvent) {
    dragging = true
    startX = e.clientX
    startW = sidebarWidth.value
    window.addEventListener('mousemove', onResizeMove)
    window.addEventListener('mouseup', onResizeEnd)
  }
  function onResizeMove(e: MouseEvent) {
    if (!dragging) return
    sidebarWidth.value = Math.min(360, Math.max(160, startW + e.clientX - startX))
  }
  function onResizeEnd() {
    dragging = false
    window.removeEventListener('mousemove', onResizeMove)
    window.removeEventListener('mouseup', onResizeEnd)
  }
  onBeforeUnmount(onResizeEnd)
</script>

<template>
  <Page
    variant="filesystem"
    title="Explorer"
    subtitle="Local Files"
    description="Browse your local files like Finder."
    icon="lucide:folder">
    <div class="flex h-full w-full min-h-0 overflow-hidden bg-background">
    <!-- Left: folder tree sidebar -->
    <aside
      class="flex shrink-0 flex-col border-r border-border/60 bg-surface-1 min-h-0"
      :style="{ width: `${sidebarWidth}px` }">
      <div class="flex items-center gap-1 px-3 py-2 shrink-0">
        <Icon name="lucide:folder" class="h-4 w-4 text-amber-400" />
        <span class="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Files</span>
      </div>

      <!-- Quick places -->
      <div class="px-2 pb-1 shrink-0">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
          :class="isCurrentDir('') ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'"
          @click="goHome">
          <Icon name="lucide:home" class="h-3.5 w-3.5" />
          <span>All Files</span>
        </button>
      </div>

      <!-- Folder tree -->
      <UiScrollArea class="min-h-0 flex-1">
        <div class="py-1">
          <button
            v-for="entry in treeFlat"
            :key="entry.path"
            type="button"
            class="flex w-full items-center gap-1.5 rounded-md py-1 text-xs transition-colors"
            :class="
              isCurrentDir(entry.path)
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            "
            :style="treeIndent(entry.depth)"
            @click="navigateTo(entry.path)">
            <Icon
              name="lucide:chevron-right"
              class="h-3 w-3 transition-transform"
              :class="isExpanded(entry.path) ? 'rotate-90' : ''"
              @click.stop="onTreeDirClick(entry.path)" />
            <Icon name="lucide:folder" class="h-3.5 w-3.5 text-amber-400" />
            <span class="truncate">{{ entry.name }}</span>
          </button>
          <div v-if="treeFlat.length === 0" class="px-3 py-6 text-center">
            <Icon name="lucide:folder-open" class="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
            <p class="text-[11px] text-muted-foreground/60">No folders yet</p>
          </div>
        </div>
      </UiScrollArea>
    </aside>
    <div class="w-1 shrink-0 cursor-col-resize hover:bg-primary/40 transition-colors" @mousedown.prevent="onResizeStart" />

    <!-- Middle: directory listing -->
    <div class="flex min-w-0 flex-1 flex-col min-h-0">
      <!-- Toolbar -->
      <div class="flex items-center gap-2 border-b border-border/60 px-3 py-2 shrink-0 bg-surface-2">
        <UiButton variant="ghost" size="icon-xs" aria-label="Back" @click="goUp">
          <Icon name="lucide:arrow-up" class="h-3.5 w-3.5" />
        </UiButton>
        <UiButton variant="ghost" size="icon-xs" aria-label="Refresh" @click="refresh">
          <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5" />
        </UiButton>

        <!-- Breadcrumbs -->
        <div class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-xs">
          <template v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
            <template v-if="i > 0"><span class="text-muted-foreground/40">/</span></template>
            <button
              type="button"
              class="truncate rounded px-1.5 py-0.5 transition-colors"
              :class="
                i === breadcrumbs.length - 1
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              "
              @click="navigateTo(crumb.path)">
              {{ crumb.label }}
            </button>
          </template>
        </div>

        <div class="relative w-44 shrink-0">
          <Icon name="lucide:search" class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/50" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search…"
            class="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-6 text-xs outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40" />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            @click="searchQuery = ''">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>

        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiButton
              variant="ghost"
              size="icon-xs"
              :aria-pressed="showHidden"
              :class="showHidden ? 'bg-accent text-foreground' : ''"
              @click="showHidden = !showHidden">
              <Icon name="lucide:eye" class="h-3.5 w-3.5" />
            </UiButton>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" :side-offset="6">Show hidden files</UiTooltipContent>
        </UiTooltip>
      </div>

      <!-- Column headers -->
      <div class="grid grid-cols-[1fr_90px_170px] gap-2 border-b border-border/60 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 shrink-0 bg-surface-2">
        <span>Name</span>
        <span class="text-right">Size</span>
        <span>Modified</span>
      </div>

      <!-- Error state -->
      <div v-if="error" class="flex flex-col items-center justify-center gap-2 py-12 text-sm text-destructive">
        <Icon name="lucide:alert-circle" class="h-6 w-6" />
        <span>{{ error }}</span>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
        Loading…
      </div>

      <!-- Empty -->
      <div v-else-if="filteredItems.length === 0" class="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Icon name="lucide:folder-open" class="h-8 w-8 opacity-30" />
        <span>This folder is empty</span>
      </div>

      <!-- Listing -->
      <UiScrollArea v-else class="min-h-0 flex-1">
        <div class="divide-y divide-border/40">
          <button
            v-for="item in filteredItems"
            :key="`${currentPath}/${item.name}`"
            type="button"
            class="grid w-full grid-cols-[1fr_90px_170px] items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted/50"
            :class="selectedPath === joinPath(currentPath, item.name) ? 'bg-accent/60' : ''"
            @click="openItem(item)"
            @dblclick="item.type === 'folder' && openItem(item)">
            <span class="flex min-w-0 items-center gap-2">
              <Icon :name="itemIcon(item)" class="h-4 w-4 shrink-0" :class="itemTint(item)" />
              <span class="truncate">{{ item.name }}</span>
            </span>
            <span class="text-right font-mono text-[11px] text-muted-foreground">
              {{ item.type === 'folder' ? '—' : formatSize(item.size) }}
            </span>
            <span class="text-[11px] text-muted-foreground/80">{{ formatModified(item.modifiedAt) }}</span>
          </button>
        </div>
      </UiScrollArea>

      <!-- Status bar -->
      <div class="flex items-center justify-between border-t border-border/60 px-3 py-1 text-[10px] text-muted-foreground shrink-0 bg-surface-2">
        <span>{{ filteredItems.length }} item{{ filteredItems.length === 1 ? '' : 's' }}</span>
        <span v-if="currentPath" class="truncate font-mono">~/nodebook/files/{{ currentPath }}</span>
        <span v-else class="font-mono">~/nodebook/files</span>
      </div>
    </div>

    <!-- Right: preview pane -->
    <aside
      class="flex w-72 shrink-0 flex-col border-l border-border/60 bg-surface-1 min-h-0"
      :class="selectedItem ? '' : 'hidden'">
      <div class="flex items-center justify-between border-b border-border/60 px-3 py-2 shrink-0">
        <span class="truncate text-xs font-medium">{{ selectedItem?.name }}</span>
        <button type="button" class="text-muted-foreground hover:text-foreground" @click="selectedItem = null">
          <Icon name="lucide:x" class="h-3.5 w-3.5" />
        </button>
      </div>

      <UiScrollArea class="min-h-0 flex-1">
        <div class="p-3">
          <!-- Image preview -->
          <img
            v-if="selectedKind === 'image' && selectedPath"
            :src="fileUrl(selectedPath)"
            class="w-full rounded-lg border border-border/60 object-contain"
            alt="" />
          <!-- Video preview -->
          <video
            v-else-if="selectedKind === 'video' && selectedPath"
            :src="fileUrl(selectedPath)"
            controls
            class="w-full rounded-lg border border-border/60" />
          <!-- Audio preview -->
          <audio
            v-else-if="selectedKind === 'audio' && selectedPath"
            :src="fileUrl(selectedPath)"
            controls
            class="w-full" />
          <!-- Text preview -->
          <div v-else-if="selectedKind === 'text'" class="space-y-2">
            <div v-if="previewLoading" class="flex items-center gap-2 py-6 text-xs text-muted-foreground">
              <Icon name="lucide:loader-2" class="h-3.5 w-3.5 animate-spin" />
              Loading preview…
            </div>
            <pre v-else-if="textPreview" class="whitespace-pre-wrap break-words rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">{{ textPreview }}</pre>
            <p v-else class="py-6 text-center text-xs text-muted-foreground">No text preview available</p>
          </div>
          <!-- Generic file -->
          <div v-else class="flex flex-col items-center gap-3 py-8 text-center">
            <Icon :name="selectedItem ? itemIcon(selectedItem) : ''" class="h-12 w-12 opacity-40" />
            <p class="text-xs text-muted-foreground">No preview for this file type</p>
            <a
              v-if="selectedPath"
              :href="fileUrl(selectedPath)"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-muted">
              <Icon name="lucide:download" class="h-3.5 w-3.5" />
              Open file
            </a>
          </div>

          <dl class="mt-4 space-y-2 border-t border-border/60 pt-3 text-[11px]">
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Type</dt>
              <dd class="font-mono">{{ selectedItem?.type }}</dd>
            </div>
            <div v-if="selectedItem?.ext" class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Extension</dt>
              <dd class="font-mono">{{ selectedItem.ext }}</dd>
            </div>
            <div v-if="selectedItem?.type === 'file'" class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Size</dt>
              <dd class="font-mono">{{ selectedItem ? formatSize(selectedItem.size) : '' }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-muted-foreground">Modified</dt>
              <dd class="text-right">{{ selectedItem ? formatModified(selectedItem.modifiedAt) : '' }}</dd>
            </div>
          </dl>
        </div>
      </UiScrollArea>
    </aside>
    </div>
  </Page>
</template>
