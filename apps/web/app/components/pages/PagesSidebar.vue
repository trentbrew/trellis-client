<script setup lang="ts">
  import Sortable from 'sortablejs'

  const {
    ungroupedPages,
    pagesByFolder,
    folders,
    createPage,
    renamePage,
    deletePage,
    moveToFolder,
    reorderPages,
    renameFolder,
    deleteFolder,
    loading,
    livePageTitle,
  } = usePageNotes()
  const { getViewers } = usePagePresence()
  const { wp } = useWorkspacePath()

  function isTyping(pageId: string): boolean {
    return getViewers(pageId).some((v) => !!v.editingField)
  }

  function typingColor(pageId: string): string {
    return getViewers(pageId).find((v) => !!v.editingField)?.color ?? 'bg-muted-foreground'
  }
  const { $toast } = useNuxtApp()

  const route = useRoute()
  const activePageId = computed(() => route.params.id as string | undefined)
  function isActive(id: string) {
    return activePageId.value === id
  }

  // ── Create ────────────────────────────────────────────────────────
  const creating = ref(false)

  async function handleCreate(folder?: string) {
    if (creating.value) return
    creating.value = true
    try {
      const id = await createPage({ title: '', folder })
      if (id) navigateTo(wp(`/pages/${id}`))
    } catch {
      ;($toast as any)?.error('Failed to create page')
    } finally {
      creating.value = false
    }
  }

  // ── Rename page ───────────────────────────────────────────────────
  const renamingId = ref<string | null>(null)
  const renameValue = ref('')

  function startRename(page: { id: string; title?: string }) {
    renamingId.value = page.id
    renameValue.value = page.title || ''
    nextTick(() => {
      const el = document.getElementById(`rename-page-${page.id}`) as HTMLInputElement | null
      el?.focus()
      el?.select()
    })
  }

  async function commitRename() {
    const id = renamingId.value
    const title = renameValue.value.trim()
    renamingId.value = null
    if (!id || !title) return
    try {
      await renamePage(id, title)
    } catch {
      ;($toast as any)?.error('Failed to rename page')
    }
  }

  // ── Rename folder ─────────────────────────────────────────────────
  const renamingFolder = ref<string | null>(null)
  const renameFolderValue = ref('')

  function startRenameFolder(name: string) {
    renamingFolder.value = name
    renameFolderValue.value = name
    nextTick(() => {
      const el = document.getElementById(`rename-folder-${name}`) as HTMLInputElement | null
      el?.focus()
      el?.select()
    })
  }

  async function commitRenameFolder() {
    const oldName = renamingFolder.value
    const newName = renameFolderValue.value.trim()
    renamingFolder.value = null
    if (!oldName || !newName || oldName === newName) return
    try {
      await renameFolder(oldName, newName)
    } catch {
      ;($toast as any)?.error('Failed to rename folder')
    }
  }

  // ── Folders collapse ──────────────────────────────────────────────
  const collapsedFolders = ref(new Set<string>())
  function toggleFolder(name: string) {
    if (collapsedFolders.value.has(name)) collapsedFolders.value.delete(name)
    else collapsedFolders.value.add(name)
  }
  const isFolderOpen = (name: string) => !collapsedFolders.value.has(name)

  // ── New folder (header button) ────────────────────────────────────
  const newFolderInputOpen = ref(false)
  const newFolderHeaderName = ref('')
  const creatingFolderHeader = ref(false)

  function openNewFolderInput() {
    newFolderInputOpen.value = true
    newFolderHeaderName.value = ''
    nextTick(() => document.getElementById('new-folder-header-input')?.focus())
  }

  async function commitNewFolderFromHeader() {
    const name = newFolderHeaderName.value.trim()
    if (!name || creatingFolderHeader.value) return
    creatingFolderHeader.value = true
    try {
      const id = await createPage({ title: '', folder: name })
      if (id) navigateTo(wp(`/pages/${id}`))
    } catch {
      ;($toast as any)?.error('Failed to create folder')
    } finally {
      creatingFolderHeader.value = false
      newFolderInputOpen.value = false
      newFolderHeaderName.value = ''
    }
  }

  // ── New folder (from page context menu) ───────────────────────────
  const newFolderForId = ref<string | null>(null)
  const newFolderForIdName = ref('')
  const creatingFolderForId = ref(false)

  function promptNewFolder(pageId: string) {
    newFolderForId.value = pageId
    newFolderForIdName.value = ''
    nextTick(() => document.getElementById('new-page-folder-input')?.focus())
  }

  async function commitNewFolder() {
    const pageId = newFolderForId.value
    const name = newFolderForIdName.value.trim()
    if (!pageId || !name || creatingFolderForId.value) return
    creatingFolderForId.value = true
    try {
      await moveToFolder(pageId, name)
    } catch {
      ;($toast as any)?.error('Failed to create folder')
    } finally {
      creatingFolderForId.value = false
      newFolderForId.value = null
      newFolderForIdName.value = ''
    }
  }

  async function handleMoveToFolder(pageId: string, folder: string | null) {
    try {
      await moveToFolder(pageId, folder)
    } catch {
      ;($toast as any)?.error('Failed to move page')
    }
  }

  async function handleDeleteFolder(name: string) {
    try {
      await deleteFolder(name)
    } catch {
      ;($toast as any)?.error('Failed to delete folder')
    }
  }

  // ── Delete page ───────────────────────────────────────────────────
  const deleteTargetId = ref<string | null>(null)
  const deleteTargetTitle = ref('')
  const deleting = ref(false)

  function promptDelete(page: { id: string; title?: string }) {
    deleteTargetId.value = page.id
    deleteTargetTitle.value = page.title || 'Untitled'
  }

  async function confirmDelete() {
    const id = deleteTargetId.value
    if (!id || deleting.value) return
    deleting.value = true
    try {
      await deletePage(id)
      if (isActive(id)) navigateTo(wp('/pages'))
    } catch {
      ;($toast as any)?.error('Failed to delete page')
    } finally {
      deleting.value = false
      deleteTargetId.value = null
    }
  }

  // ── Label helper ──────────────────────────────────────────────────
  function pageLabel(page: { id: string; title?: string }) {
    if (livePageTitle.value?.id === page.id) return livePageTitle.value.title || 'Untitled'
    return page.title || 'Untitled'
  }

  // ── Drag-to-reorder (Sortable.js) ─────────────────────────────────
  const sortableInstances = ref<Sortable[]>([])

  function destroySortables() {
    sortableInstances.value.forEach((s) => s.destroy())
    sortableInstances.value = []
  }

  function initSortables() {
    destroySortables()
    if (!import.meta.client) return
    nextTick(() => {
      const lists = document.querySelectorAll<HTMLElement>('[data-pages-sortable]')
      lists.forEach((list) => {
        const instance = Sortable.create(list, {
          animation: 150,
          ghostClass: 'pages-sortable-ghost',
          chosenClass: 'pages-sortable-chosen',
          forceFallback: true,
          fallbackOnBody: true,
          delay: 120,
          group: { name: 'pages', pull: true, put: true },
          onEnd: async (evt) => {
            const pageId = (evt.item as HTMLElement).dataset.pageId
            const rawFolder = (evt.to as HTMLElement).dataset.folderName
            const targetFolder = rawFolder === '' ? null : (rawFolder ?? null)
            if (!pageId) return
            try {
              const container = evt.to as HTMLElement
              const orderedIds = [...container.querySelectorAll<HTMLElement>('[data-page-id]')]
                .map((el) => el.dataset.pageId!)
                .filter(Boolean)
              await reorderPages(orderedIds, targetFolder)
            } catch {
              ;($toast as any)?.error('Failed to move page')
            }
          },
        })
        sortableInstances.value.push(instance)
      })
    })
  }

  onMounted(() => initSortables())
  onBeforeUnmount(() => destroySortables())
  watch([pagesByFolder, ungroupedPages], () => nextTick(() => initSortables()))
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Delete confirmation dialog -->
    <UiAlertDialog
      :open="!!deleteTargetId"
      @update:open="
        (v) => {
          if (!v) deleteTargetId = null
        }
      ">
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Delete "{{ deleteTargetTitle }}"?</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            This will permanently delete this page and its content. This cannot be undone.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel @click="deleteTargetId = null">Cancel</UiAlertDialogCancel>
          <UiAlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            :disabled="deleting"
            @click="confirmDelete">
            {{ deleting ? 'Deleting…' : 'Delete' }}
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <!-- PAGES section header -->
    <div class="shrink-0">
      <div class="flex items-center justify-between px-3 py-2">
        <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pages</span>
        <div class="flex items-center gap-0.5">
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                class="h-5 w-5 flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                @click="openNewFolderInput">
                <Icon name="lucide:folder-plus" class="h-3.5 w-3.5" />
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent side="right">New folder</UiTooltipContent>
          </UiTooltip>
          <UiTooltip>
            <UiTooltipTrigger as-child>
              <button
                class="h-5 w-5 flex items-center justify-center rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-muted"
                :disabled="creating"
                @click="handleCreate()">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" />
              </button>
            </UiTooltipTrigger>
            <UiTooltipContent side="right">New page</UiTooltipContent>
          </UiTooltip>
        </div>
      </div>
      <!-- New folder inline input (header) -->
      <Transition name="slide-down">
        <div v-if="newFolderInputOpen" class="px-3 pb-2">
          <div class="flex items-center gap-1.5 rounded-lg border border-primary bg-background px-2 py-1">
            <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              id="new-folder-header-input"
              v-model="newFolderHeaderName"
              placeholder="Folder name…"
              class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
              @keydown.enter="commitNewFolderFromHeader"
              @keydown.escape="newFolderInputOpen = false" />
            <button
              :disabled="!newFolderHeaderName.trim() || creatingFolderHeader"
              class="text-xs text-primary disabled:opacity-40 hover:text-primary/80 transition-colors font-medium shrink-0"
              @click="commitNewFolderFromHeader">
              Create
            </button>
          </div>
        </div>
      </Transition>

      <!-- Loading skeleton -->
      <div v-if="loading" class="px-3 space-y-1">
        <div v-for="i in 3" :key="i" class="h-7 rounded-lg bg-muted/40 animate-pulse" />
      </div>

      <div v-else>
        <!-- Ungrouped pages -->
        <nav class="px-2 space-y-0.5" data-pages-sortable data-folder-name="">
          <template v-for="page in ungroupedPages" :key="page.id">
            <!-- Rename input -->
            <div
              v-if="renamingId === page.id"
              class="flex items-center gap-1.5 rounded-lg border border-primary bg-background px-2 py-1">
              <Icon name="lucide:file-text" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                :id="`rename-page-${page.id}`"
                v-model="renameValue"
                class="flex-1 bg-transparent text-xs outline-none"
                @keydown.enter="commitRename"
                @keydown.escape="renamingId = null"
                @blur="commitRename" />
            </div>
            <!-- Page row -->
            <div
              v-else
              class="relative group/pg cursor-grab active:cursor-grabbing"
              :data-page-id="page.id"
              @contextmenu.prevent="startRename(page)">
              <span
                class="absolute inset-y-0 left-0 w-5 z-10 flex items-center justify-center opacity-0 group-hover/pg:opacity-100 transition-opacity">
                <Icon name="lucide:grip-vertical" class="h-3 w-3 text-muted-foreground/50" />
              </span>
              <NuxtLink
                :to="wp(`/pages/${page.id}`)"
                class="flex items-center gap-2 pl-5 pr-2 py-1.5 rounded-lg text-xs transition-colors"
                :class="
                  isActive(page.id)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                ">
                <Icon name="lucide:file-text" class="h-3.5 w-3.5 shrink-0" />
                <span class="flex-1 truncate">{{ pageLabel(page) }}</span>
              </NuxtLink>
              <!-- Presence avatars (absolute positioned at right edge) -->
              <div
                v-if="getViewers(page.id).length"
                class="absolute right-7 top-1/2 -translate-y-1/2 flex items-center shrink-0 transition-all group-hover/pg:right-8">
                <!-- Typing indicator -->
                <span
                  v-if="isTyping(page.id)"
                  class="flex gap-[2px] items-center mr-1"
                  :title="getViewers(page.id).find((v) => !!v.editingField)?.name + ' is typing…'">
                  <span
                    class="h-1 w-1 rounded-full animate-bounce [animation-delay:0ms]"
                    :class="typingColor(page.id)" />
                  <span
                    class="h-1 w-1 rounded-full animate-bounce [animation-delay:100ms]"
                    :class="typingColor(page.id)" />
                  <span
                    class="h-1 w-1 rounded-full animate-bounce [animation-delay:200ms]"
                    :class="typingColor(page.id)" />
                </span>
                <!-- Avatar stack -->
                <span class="flex -space-x-1">
                  <span
                    v-for="(viewer, i) in getViewers(page.id).slice(0, 3)"
                    :key="viewer.peerId"
                    :title="viewer.name + (viewer.isMe ? ' (you)' : '')"
                    :style="{ zIndex: 3 - i }"
                    class="relative h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-background"
                    :class="[viewer.color, viewer.isMe ? 'ring-white/60' : '']">
                    {{ viewer.initials[0] }}
                  </span>
                </span>
              </div>
              <!-- ⋯ menu -->
              <div
                class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/pg:opacity-100 transition-opacity z-10">
                <UiDropdownMenu>
                  <UiDropdownMenuTrigger as-child>
                    <button
                      type="button"
                      class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      aria-label="Page options"
                      @click.prevent.stop>
                      <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
                    </button>
                  </UiDropdownMenuTrigger>
                  <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                    <UiDropdownMenuItem @click="startRename(page)">
                      <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                      Rename
                    </UiDropdownMenuItem>
                    <UiDropdownMenuSub>
                      <UiDropdownMenuSubTrigger>
                        <Icon name="lucide:folder" class="mr-2 h-4 w-4" />
                        Move to folder
                      </UiDropdownMenuSubTrigger>
                      <UiDropdownMenuSubContent class="w-44">
                        <UiDropdownMenuItem v-for="f in folders" :key="f" @click="handleMoveToFolder(page.id, f)">
                          <Icon name="lucide:folder-open" class="mr-2 h-4 w-4" />
                          {{ f }}
                        </UiDropdownMenuItem>
                        <UiDropdownMenuSeparator v-if="folders.length" />
                        <UiDropdownMenuItem @click="promptNewFolder(page.id)">
                          <Icon name="lucide:folder-plus" class="mr-2 h-4 w-4" />
                          New folder…
                        </UiDropdownMenuItem>
                      </UiDropdownMenuSubContent>
                    </UiDropdownMenuSub>
                    <UiDropdownMenuSeparator />
                    <UiDropdownMenuItem class="text-destructive focus:text-destructive" @click="promptDelete(page)">
                      <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                      Delete
                    </UiDropdownMenuItem>
                  </UiDropdownMenuContent>
                </UiDropdownMenu>
              </div>
            </div>
          </template>
          <div
            v-if="!ungroupedPages.length && !pagesByFolder.length && !loading"
            class="px-2 py-1.5 text-xs text-muted-foreground/60 italic">
            No pages yet
          </div>
        </nav>

        <!-- New folder input (from context menu) -->
        <Transition name="slide-down">
          <div v-if="newFolderForId" class="px-3 py-1.5">
            <p class="text-[10px] text-muted-foreground mb-1">Move page to new folder:</p>
            <div class="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1">
              <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                id="new-page-folder-input"
                v-model="newFolderForIdName"
                placeholder="Folder name"
                class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
                @keydown.enter="commitNewFolder"
                @keydown.escape="newFolderForId = null" />
              <button
                :disabled="!newFolderForIdName.trim() || creatingFolderForId"
                class="text-xs text-primary disabled:opacity-40 hover:text-primary/80 transition-colors font-medium"
                @click="commitNewFolder">
                Create
              </button>
            </div>
          </div>
        </Transition>

        <!-- Folder groups -->
        <div id="pages-folder-container" class="mt-1 space-y-0.5">
          <div v-for="group in pagesByFolder" :key="group.folder" data-folder-row>
            <!-- Folder header -->
            <div class="group/folder relative">
              <!-- Folder rename input -->
              <div
                v-if="renamingFolder === group.folder"
                class="flex items-center gap-1.5 px-2 py-1 mx-2 rounded-lg border border-primary bg-background">
                <Icon name="lucide:folder" class="h-3 w-3 text-muted-foreground shrink-0" />
                <input
                  :id="`rename-folder-${group.folder}`"
                  v-model="renameFolderValue"
                  class="flex-1 bg-transparent text-[10px] font-semibold uppercase tracking-wider outline-none"
                  @keydown.enter="commitRenameFolder"
                  @keydown.escape="renamingFolder = null"
                  @blur="commitRenameFolder" />
              </div>
              <!-- Folder row -->
              <div
                v-else
                class="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                @contextmenu.prevent="startRenameFolder(group.folder)">
                <span
                  data-folder-drag-handle
                  class="cursor-grab active:cursor-grabbing opacity-0 group-hover/folder:opacity-100 transition-opacity shrink-0 flex items-center">
                  <Icon name="lucide:grip-vertical" class="h-3 w-3 text-muted-foreground/40" />
                </span>
                <button
                  type="button"
                  class="flex items-center gap-1.5 flex-1 min-w-0 hover:text-foreground transition-colors"
                  @click="toggleFolder(group.folder)">
                  <Icon
                    name="lucide:chevron-right"
                    class="h-3 w-3 transition-transform duration-150 shrink-0"
                    :class="isFolderOpen(group.folder) ? 'rotate-90' : ''" />
                  <Icon name="lucide:folder" class="h-3 w-3 shrink-0" />
                  <span class="flex-1 text-left truncate">{{ group.folder }}</span>
                </button>
                <!-- Folder actions -->
                <div
                  class="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-opacity shrink-0">
                  <UiDropdownMenu>
                    <UiDropdownMenuTrigger as-child>
                      <button
                        type="button"
                        class="h-4 w-4 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                        @click.stop>
                        <Icon name="lucide:more-horizontal" class="h-3 w-3" />
                      </button>
                    </UiDropdownMenuTrigger>
                    <UiDropdownMenuContent align="end" :side-offset="4" class="w-44">
                      <UiDropdownMenuItem @click="startRenameFolder(group.folder)">
                        <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                        Rename folder
                      </UiDropdownMenuItem>
                      <UiDropdownMenuItem @click="handleCreate(group.folder)">
                        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
                        Add page
                      </UiDropdownMenuItem>
                      <UiDropdownMenuSeparator />
                      <UiDropdownMenuItem
                        class="text-destructive focus:text-destructive"
                        @click="handleDeleteFolder(group.folder)">
                        <Icon name="lucide:folder-minus" class="mr-2 h-4 w-4" />
                        Delete folder
                      </UiDropdownMenuItem>
                    </UiDropdownMenuContent>
                  </UiDropdownMenu>
                  <button
                    type="button"
                    class="h-4 w-4 flex items-center justify-center rounded text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                    @click.stop="handleCreate(group.folder)">
                    <Icon name="lucide:plus" class="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Folder children with indent line -->
            <Transition name="slide-down">
              <div v-if="isFolderOpen(group.folder)" class="relative">
                <!-- Vertical indent line -->
                <div class="absolute w-px bg-sidebar-border/15 top-0 bottom-1" style="left: 20px" />
                <nav class="space-y-0.5 py-0.5" data-pages-sortable :data-folder-name="group.folder">
                  <template v-for="page in group.pages" :key="page.id">
                    <!-- Rename input -->
                    <div
                      v-if="renamingId === page.id"
                      class="flex items-center gap-1.5 rounded-lg border border-primary bg-background px-2 py-1 ml-7 mr-2">
                      <Icon name="lucide:file-text" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        :id="`rename-page-${page.id}`"
                        v-model="renameValue"
                        class="flex-1 bg-transparent text-xs outline-none"
                        @keydown.enter="commitRename"
                        @keydown.escape="renamingId = null"
                        @blur="commitRename" />
                    </div>
                    <!-- Page row -->
                    <div
                      v-else
                      class="relative group/pg cursor-grab active:cursor-grabbing"
                      :data-page-id="page.id"
                      @contextmenu.prevent="startRename(page)">
                      <NuxtLink
                        :to="wp(`/pages/${page.id}`)"
                        class="flex items-center gap-2 pl-8 pr-2 py-1.5 rounded-lg text-xs transition-colors mx-1 ml-6"
                        :class="
                          isActive(page.id)
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                        ">
                        <Icon name="lucide:file-text" class="h-3.5 w-3.5 shrink-0" />
                        <span class="flex-1 truncate">{{ pageLabel(page) }}</span>
                      </NuxtLink>
                      <!-- Presence avatars (absolute positioned at right edge) -->
                      <div
                        v-if="getViewers(page.id).length"
                        class="absolute right-8 top-1/2 -translate-y-1/2 flex items-center shrink-0 transition-all group-hover/pg:right-9">
                        <span
                          v-if="isTyping(page.id)"
                          class="flex gap-[2px] items-center mr-1"
                          :title="getViewers(page.id).find((v) => !!v.editingField)?.name + ' is typing…'">
                          <span
                            class="h-1 w-1 rounded-full animate-bounce [animation-delay:0ms]"
                            :class="typingColor(page.id)" />
                          <span
                            class="h-1 w-1 rounded-full animate-bounce [animation-delay:100ms]"
                            :class="typingColor(page.id)" />
                          <span
                            class="h-1 w-1 rounded-full animate-bounce [animation-delay:200ms]"
                            :class="typingColor(page.id)" />
                        </span>
                        <span class="flex -space-x-1">
                          <span
                            v-for="(viewer, i) in getViewers(page.id).slice(0, 3)"
                            :key="viewer.peerId"
                            :title="viewer.name + (viewer.isMe ? ' (you)' : '')"
                            :style="{ zIndex: 3 - i }"
                            class="relative h-3.5 w-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-background"
                            :class="[viewer.color, viewer.isMe ? 'ring-white/60' : '']">
                            {{ viewer.initials[0] }}
                          </span>
                        </span>
                      </div>
                      <!-- ⋯ menu -->
                      <div
                        class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/pg:opacity-100 transition-opacity z-10">
                        <UiDropdownMenu>
                          <UiDropdownMenuTrigger as-child>
                            <button
                              type="button"
                              class="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/80"
                              aria-label="Page options"
                              @click.prevent.stop>
                              <Icon name="lucide:more-horizontal" class="h-3.5 w-3.5" />
                            </button>
                          </UiDropdownMenuTrigger>
                          <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                            <UiDropdownMenuItem @click="startRename(page)">
                              <Icon name="lucide:pencil" class="mr-2 h-4 w-4" />
                              Rename
                            </UiDropdownMenuItem>
                            <UiDropdownMenuSub>
                              <UiDropdownMenuSubTrigger>
                                <Icon name="lucide:folder" class="mr-2 h-4 w-4" />
                                Move to folder
                              </UiDropdownMenuSubTrigger>
                              <UiDropdownMenuSubContent class="w-44">
                                <UiDropdownMenuItem
                                  v-for="f in folders"
                                  :key="f"
                                  @click="handleMoveToFolder(page.id, f)">
                                  <Icon name="lucide:folder-open" class="mr-2 h-4 w-4" />
                                  {{ f }}
                                </UiDropdownMenuItem>
                                <UiDropdownMenuSeparator v-if="folders.length" />
                                <UiDropdownMenuItem @click="promptNewFolder(page.id)">
                                  <Icon name="lucide:folder-plus" class="mr-2 h-4 w-4" />
                                  New folder…
                                </UiDropdownMenuItem>
                                <UiDropdownMenuSeparator />
                                <UiDropdownMenuItem @click="handleMoveToFolder(page.id, null)">
                                  <Icon name="lucide:folder-minus" class="mr-2 h-4 w-4" />
                                  Remove from folder
                                </UiDropdownMenuItem>
                              </UiDropdownMenuSubContent>
                            </UiDropdownMenuSub>
                            <UiDropdownMenuSeparator />
                            <UiDropdownMenuItem
                              class="text-destructive focus:text-destructive"
                              @click="promptDelete(page)">
                              <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                              Delete
                            </UiDropdownMenuItem>
                          </UiDropdownMenuContent>
                        </UiDropdownMenu>
                      </div>
                    </div>
                  </template>
                </nav>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1" />
  </div>
</template>

<style scoped>
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: all 0.15s ease;
  }
  .slide-down-enter-from,
  .slide-down-leave-to {
    opacity: 0;
    transform: translateY(-4px);
  }
</style>
