<script setup lang="ts">
  import type { Entity, EntityReference, Reference } from '~/types/entity'
  import { getPresenceBg, getPresenceRing } from '~/utils/presenceColor'

  definePageMeta({ layout: 'default' })

  const route = useRoute()
  const pageId = computed(() => route.params.id as string)

  const { getPage, updatePage, deletePage, pages, folders, moveToFolder, livePageTitle } = usePageNotes()
  const { items: allItems } = useTrellisEntities()
  const { register: registerPresence, deregister: deregisterPresence, publishField, getViewers } = usePagePresence()
  const { user: currentUser } = useInstantAuth()

  const currentUserAvatar = computed(() => {
    const u = currentUser.value as any
    const candidate = u?.avatar || u?.imageURL || u?.picture
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null
  })

  const currentUserDisplayName = computed(() => {
    const u = currentUser.value as any
    return u?.name || u?.email || null
  })

  const pageViewers = computed(() => getViewers(pageId.value))
  const titlePeers = computed(() => pageViewers.value.filter((v) => v.editingField === 'title'))
  const descPeers = computed(() => pageViewers.value.filter((v) => v.editingField === 'description'))
  const { displayActivity, addComment, addInlineComment, logActivity, loading: commentsLoading } = useComments(pageId)

  // Resolve current page from store
  const currentPage = computed<Entity | undefined>(() => {
    return getPage(pageId.value) ?? allItems.value?.find((i: Entity) => i.id === pageId.value)
  })

  useHead({ title: computed(() => currentPage.value?.title || 'Untitled') })

  // ── Auto-save ─────────────────────────────────────────────────────
  const saveTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

  function debouncedSave(data: Partial<Entity>) {
    if (saveTimeout.value) clearTimeout(saveTimeout.value)
    saveTimeout.value = setTimeout(async () => {
      if (!pageId.value) return
      await updatePage(pageId.value, data)
    }, 800)
  }

  onMounted(() => {
    if (pageId.value) registerPresence(pageId.value)
  })

  onBeforeUnmount(() => {
    if (saveTimeout.value) clearTimeout(saveTimeout.value)
    if (_titleLogTimer) clearTimeout(_titleLogTimer)
    if (_descLogTimer) clearTimeout(_descLogTimer)
    if (_contentLogTimer) clearTimeout(_contentLogTimer)
    livePageTitle.value = null
    if (pageId.value) deregisterPresence(pageId.value)
  })

  // Re-register when navigating between pages
  watch(pageId, (newId, oldId) => {
    if (oldId) deregisterPresence(oldId)
    if (newId) registerPresence(newId)
  })

  // ── Local state ───────────────────────────────────────────────────
  const localTitle = ref('')
  const localDescription = ref('')
  const localContent = ref('')

  // Seed local refs from entity data
  watch(currentPage, (page) => {
    if (!page) return
    if (localTitle.value !== (page.title ?? '')) localTitle.value = page.title ?? ''
    if (localDescription.value !== (page.description ?? '')) localDescription.value = page.description ?? ''
    if (localContent.value !== ((page as any).content ?? '')) localContent.value = (page as any).content ?? ''
  }, { immediate: true })

  // Reseed when navigating to a different page
  watch(pageId, () => {
    const page = currentPage.value
    if (!page) return
    localTitle.value = page.title ?? ''
    localDescription.value = page.description ?? ''
    localContent.value = (page as any).content ?? ''
  })

  function onTitleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    localTitle.value = val
    livePageTitle.value = { id: pageId.value, title: val }
    debouncedSave({ title: val })
    if (_titleLogTimer) clearTimeout(_titleLogTimer)
    _titleLogTimer = setTimeout(() => {
      if (val.trim()) logActivity(`renamed to "${val}"`, 'status_change')
    }, 3000)
  }

  function onTitleFocus() { publishField(pageId.value, 'title') }
  function onTitleBlur() { publishField(pageId.value, undefined) }
  function onDescFocus() { publishField(pageId.value, 'description') }
  function onDescBlur() { publishField(pageId.value, undefined) }

  function onDescriptionUpdate(val: string) {
    localDescription.value = val
    debouncedSave({ description: val })
    if (_descLogTimer) clearTimeout(_descLogTimer)
    _descLogTimer = setTimeout(() => {
      logActivity('updated description', 'status_change')
    }, 3000)
  }

  function onContentUpdate(val: string) {
    localContent.value = val
    debouncedSave({ content: val })
    if (_contentLogTimer) clearTimeout(_contentLogTimer)
    _contentLogTimer = setTimeout(() => {
      logActivity('edited content', 'status_change')
    }, 5000)
  }

  // ── Navigation ────────────────────────────────────────────────────
  const currentIndex = computed(() =>
    pages.value.findIndex((p) => p.id === pageId.value),
  )
  const canPrev = computed(() => currentIndex.value > 0)
  const canNext = computed(() => currentIndex.value < pages.value.length - 1)

  function navPrev() {
    if (!canPrev.value) return
    navigateTo(`/pages/${pages.value[currentIndex.value - 1]?.id}`)
  }
  function navNext() {
    if (!canNext.value) return
    navigateTo(`/pages/${pages.value[currentIndex.value + 1]?.id}`)
  }

  // ── Folder ────────────────────────────────────────────────────────
  const folderPickerOpen = ref(false)
  const newFolderName = ref('')
  const creatingFolder = ref(false)

  async function handleMoveToFolder(folder: string | null) {
    if (!pageId.value) return
    await moveToFolder(pageId.value, folder)
    folderPickerOpen.value = false
    if (folder) {
      logActivity(`moved to folder "${folder}"`, 'status_change')
    } else {
      logActivity('removed from folder', 'status_change')
    }
  }

  async function handleCreateFolder() {
    const name = newFolderName.value.trim()
    if (!name || creatingFolder.value) return
    creatingFolder.value = true
    try { await moveToFolder(pageId.value, name) }
    finally { creatingFolder.value = false; newFolderName.value = ''; folderPickerOpen.value = false }
  }

  // ── Delete ────────────────────────────────────────────────────────
  const deleteConfirm = ref(false)
  async function handleDelete() {
    if (!pageId.value) return
    await deletePage(pageId.value)
    navigateTo('/pages')
  }

  // ── Editor ref (for inline comment scroll) ───────────────────────
  const editorRef = ref<any>(null)

  // ── Activity log timers (debounced to avoid flooding on keystrokes) ──
  let _titleLogTimer: ReturnType<typeof setTimeout> | null = null
  let _descLogTimer: ReturnType<typeof setTimeout> | null = null
  let _contentLogTimer: ReturnType<typeof setTimeout> | null = null

  // ── Page icon ─────────────────────────────────────────────────────
  const localIcon = ref('')
  const iconPickerOpen = ref(false)

  watch(currentPage, (page) => {
    if (!page) return
    localIcon.value = (page as any).icon || ''
  }, { immediate: true })

  function handleIconChange(icon: string) {
    localIcon.value = icon
    debouncedSave({ icon } as any)
  }

  // ── Page status ─────────────────────────────────────────────────
  type PageStatus = 'draft' | 'published' | 'archived'

  const PAGE_STATUS_OPTIONS: { value: PageStatus; label: string; icon: string; color: string }[] = [
    { value: 'draft',     label: 'Draft',     icon: 'lucide:pencil',        color: 'text-muted-foreground' },
    { value: 'published', label: 'Published', icon: 'lucide:globe',         color: 'text-emerald-500' },
    { value: 'archived',  label: 'Archived',  icon: 'lucide:archive',       color: 'text-amber-500' },
  ]

  const localStatus = ref<PageStatus>('draft')
  const statusPickerOpen = ref(false)

  watch(currentPage, (page) => {
    if (!page) return
    const s = (page as any).status as PageStatus | undefined
    if (s && PAGE_STATUS_OPTIONS.some((o) => o.value === s)) localStatus.value = s
  }, { immediate: true })

  watch(localStatus, (status) => {
    debouncedSave({ status } as any)
  })

  const currentStatusOption = computed(() =>
    PAGE_STATUS_OPTIONS.find((o) => o.value === localStatus.value) ?? PAGE_STATUS_OPTIONS[0]!
  )

  // ── Tags ─────────────────────────────────────────────────────────
  const localTags = ref<string[]>([])

  watch(currentPage, (page) => {
    if (!page) return
    const t = (page as any).tags
    if (Array.isArray(t)) localTags.value = t
  }, { immediate: true })

  watch(localTags, (tags) => {
    debouncedSave({ tags })
  }, { deep: true })

  // ── Right sidebar ─────────────────────────────────────────────────
  const showSidebar = ref(true)
  const sidebarTab = ref<'references' | 'activity'>('references')
  const sidebarW = ref(272)
  const isResizingSidebar = ref(false)

  function startSidebarResize(e: PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const el = e.currentTarget as HTMLElement
    el.setPointerCapture(e.pointerId)
    isResizingSidebar.value = true
    const startX = e.clientX
    const startW = sidebarW.value
    document.body.style.cursor = 'ew-resize'
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      sidebarW.value = Math.max(220, Math.min(480, startW - dx))
    }
    const onUp = () => {
      isResizingSidebar.value = false
      document.body.style.cursor = ''
      el.releasePointerCapture(e.pointerId)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }

  // ── Comments ──────────────────────────────────────────────────────
  const newComment = ref('')
  async function handleAddComment() {
    if (!newComment.value.trim()) return
    await addComment(newComment.value.trim())
    newComment.value = ''
  }

  async function handleAddInlineComment(payload: { commentId: string; quotedText: string }) {
    await addInlineComment(payload.commentId, payload.quotedText)
    showSidebar.value = true
  }

  function resolveInlineComment(commentId: string, activityItemId: string) {
    const e = editorRef.value?.getEditor?.()
    if (e) { (e.chain().focus() as any).unsetInlineComment(commentId).run() }
    addComment('', 'comment', { anchorId: commentId, resolved: true, resolvedItemId: activityItemId }).catch(() => {})
  }

  function scrollToComment(commentId: string) {
    const e = editorRef.value?.getEditor?.()
    if (!e) return
    ;(e.chain().focus() as any).scrollToInlineComment(commentId).run()
  }

  // ── References ────────────────────────────────────────────────────
  const localReferences = ref<Reference[]>([])

  watch(currentPage, (page) => {
    if (!page) return
    const refs = (page as any).references
    if (Array.isArray(refs)) localReferences.value = refs
  }, { immediate: true })

  const editablePageRef = reactive({
    get id() { return pageId.value },
    type: 'page' as const,
    get title() { return localTitle.value || 'Untitled' },
    references: localReferences.value,
  })

  // Keep editablePageRef.references in sync with localReferences
  watch(localReferences, (refs) => { editablePageRef.references = refs }, { deep: true })

  const { addEntityRef, removeRef: removeEntityRef, openEntityRef: handleOpenEntityRef, createAndOpenEntityRef } = useEntityReferences(editablePageRef)

  async function handleAddEntityRef(ref: EntityReference) {
    await addEntityRef(ref)
    debouncedSave({ references: editablePageRef.references })
    logActivity(`linked ${ref.entityType} "${ref.title || ref.entityId}"`, 'status_change')
  }

  async function handleCreatedEntityRef(ref: EntityReference) {
    await createAndOpenEntityRef(ref)
    debouncedSave({ references: editablePageRef.references })
    logActivity(`created and linked ${ref.entityType} "${ref.title || ref.entityId}"`, 'status_change')
  }

  async function handleRemoveRef(refId: string) {
    const ref = editablePageRef.references.find((r: any) => r.id === refId || r.entityId === refId) as EntityReference | undefined
    await removeEntityRef(refId)
    debouncedSave({ references: editablePageRef.references })
    if (ref) {
      logActivity(`unlinked "${ref.title || ref.entityId}"`, 'status_change')
    }
  }

  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)
</script>

<template>
  <div>
  <UiAlertDialog :open="deleteConfirm" @update:open="(v) => (deleteConfirm = v)">
    <UiAlertDialogContent>
      <UiAlertDialogHeader>
        <UiAlertDialogTitle>Delete "{{ currentPage?.title || 'Untitled' }}"?</UiAlertDialogTitle>
        <UiAlertDialogDescription>
          This will permanently delete this page and its content. This cannot be undone.
        </UiAlertDialogDescription>
      </UiAlertDialogHeader>
      <UiAlertDialogFooter>
        <UiAlertDialogCancel>Cancel</UiAlertDialogCancel>
        <UiAlertDialogAction class="bg-destructive text-destructive-foreground hover:bg-destructive/90" @click="handleDelete">
          Delete
        </UiAlertDialogAction>
      </UiAlertDialogFooter>
    </UiAlertDialogContent>
  </UiAlertDialog>

  <div v-if="!currentPage" class="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
    <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin opacity-30" />
  </div>

  <div v-else class="absolute inset-0 flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="shrink-0 border-b border-border">
      <div class="px-4 pt-4 pb-3">
        <!-- Top row: type badge + tags + actions -->
        <div class="flex items-center justify-between gap-3 mb-3">
          <div class="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary shrink-0">
              <Icon name="lucide:file-text" class="h-3 w-3" />
              Page
            </span>
            <TagsSection v-model="localTags" inline />
          </div>
          <div class="flex items-center gap-0.5 shrink-0">
            <!-- Prev/Next navigation -->
            <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canPrev" @click="navPrev">
              <Icon name="lucide:chevron-up" class="h-4 w-4" />
            </UiButton>
            <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNext" @click="navNext">
              <Icon name="lucide:chevron-down" class="h-4 w-4" />
            </UiButton>

            <!-- Sidebar toggle -->
            <UiButton variant="ghost" size="icon" class="h-7 w-7" @click="showSidebar = !showSidebar">
              <Icon :name="showSidebar ? 'lucide:panel-right-close' : 'lucide:panel-right-open'" class="h-4 w-4" />
            </UiButton>

            <!-- Context menu -->
            <UiDropdownMenu>
              <UiDropdownMenuTrigger as-child>
                <UiButton variant="ghost" size="icon" class="h-7 w-7">
                  <Icon name="lucide:more-horizontal" class="h-4 w-4" />
                </UiButton>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                <UiDropdownMenuItem @click="() => {}">
                  <Icon name="lucide:share-2" class="mr-2 h-4 w-4" />Share
                </UiDropdownMenuItem>
                <UiDropdownMenuItem @click="() => {}">
                  <Icon name="lucide:copy" class="mr-2 h-4 w-4" />Duplicate
                </UiDropdownMenuItem>
                <UiDropdownMenuItem @click="() => {}">
                  <Icon name="lucide:download" class="mr-2 h-4 w-4" />Export
                </UiDropdownMenuItem>
                <UiDropdownMenuSeparator />
                <UiDropdownMenuItem class="text-destructive focus:text-destructive" @click="deleteConfirm = true">
                  <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />Delete
                </UiDropdownMenuItem>
              </UiDropdownMenuContent>
            </UiDropdownMenu>
          </div>
        </div>

        <!-- Title row: icon + input -->
        <div class="flex items-center gap-2">
          <!-- Page icon button -->
          <button
            type="button"
            class="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground/60 hover:text-muted-foreground group"
            title="Change page icon"
            @click="iconPickerOpen = true">
            <Icon :name="localIcon || 'lucide:file-text'" class="h-5 w-5 group-hover:scale-110 transition-transform" />
          </button>

          <!-- Title input -->
          <div class="relative flex-1 min-w-0">
            <input
              :value="localTitle"
              type="text"
              placeholder="New page"
              class="w-full text-2xl font-semibold bg-transparent border border-transparent outline-none placeholder:text-muted-foreground/50 focus:ring-0 hover:border-border hover:bg-muted/20 focus:border-border focus:bg-muted/20 rounded-md px-2 py-0 transition-all"
              @input="onTitleInput"
              @focus="onTitleFocus"
              @blur="onTitleBlur"
            />
            <!-- Peer cursors on title -->
            <span v-if="titlePeers.length" class="absolute right-0 top-1/2 -translate-y-1/2 flex items-center -space-x-1 pr-1">
              <span
                v-for="peer in titlePeers.slice(0, 3)"
                :key="peer.peerId"
                :title="peer.name + ' is editing title'"
                class="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-background shadow-sm"
                :class="peer.color"
              >{{ peer.initials[0] }}</span>
            </span>
          </div>
        </div>

        <!-- Description -->
        <div class="relative mt-2 px-1" @focusin="onDescFocus" @focusout="onDescBlur">
          <UiRichTextEditor
            :model-value="localDescription"
            placeholder="Add a description..."
            seamless
            @update:model-value="onDescriptionUpdate"
          />
          <!-- Peer cursors on description -->
          <span v-if="descPeers.length" class="absolute right-0 top-0 flex items-center -space-x-1 pr-1 pt-0.5">
            <span
              v-for="peer in descPeers.slice(0, 3)"
              :key="peer.peerId"
              :title="peer.name + ' is editing description'"
              class="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-background shadow-sm"
              :class="peer.color"
            >{{ peer.initials[0] }}</span>
          </span>
        </div>

      </div>
      <!-- Properties (props): horizontal pill row -->
      <div class="flex items-center gap-1.5 flex-wrap py-2 px-2 border-t">

        <!-- Owner pill -->
        <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-muted/50 text-muted-foreground">
          <span class="shrink-0 h-4 w-4 rounded-full overflow-hidden flex items-center justify-center bg-muted ring-1 ring-border">
            <img
              v-if="currentUserAvatar"
              :src="currentUserAvatar"
              :alt="currentUserDisplayName || 'User'"
              class="h-full w-full object-cover"
              referrerpolicy="no-referrer"
            />
            <Icon v-else name="lucide:user" class="h-2.5 w-2.5" />
          </span>
          Created by {{ currentUserDisplayName || (currentPage as any).owner || 'Unknown' }}
        </span>

        <!-- People pill (presence avatars) -->
        <div
          v-if="pageViewers.length"
          class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-muted/50"
        >
          <div class="flex -space-x-1">
            <div
              v-for="viewer in pageViewers.slice(0, 4)"
              :key="viewer.peerId"
              class="relative rounded-full ring-1 ring-offset-1 ring-offset-background"
              :class="getPresenceRing(viewer.userId)"
              :title="viewer.name + (viewer.isMe ? ' (you)' : '') + (viewer.editingField ? ` — editing ${viewer.editingField}` : '')"
            >
              <div class="h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white" :class="getPresenceBg(viewer.userId)">
                {{ viewer.initials[0] }}
              </div>
              <span
                v-if="viewer.editingField"
                class="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-background ring-1 ring-border flex items-center justify-center"
              >
                <span class="h-0.5 w-0.5 rounded-full animate-pulse" :class="getPresenceBg(viewer.userId)" />
              </span>
            </div>
          </div>
          <span v-if="pageViewers.length > 4" class="text-[10px] text-muted-foreground ml-0.5">+{{ pageViewers.length - 4 }}</span>
        </div>

        <!-- Folder pill -->
        <UiDropdownMenu v-model:open="folderPickerOpen">
          <UiDropdownMenuTrigger as-child>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
              :class="(currentPage as any).folder
                ? 'bg-muted/50 text-muted-foreground hover:bg-muted'
                : 'border border-dashed border-muted-foreground/30 text-muted-foreground/60 hover:border-muted-foreground/50 hover:bg-muted/30 hover:text-muted-foreground'"
            >
              <Icon name="lucide:folder" class="h-3.5 w-3.5" />
              {{ (currentPage as any).folder || 'No folder' }}
              <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-40" />
            </button>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="start" :side-offset="4" class="w-52">
            <UiDropdownMenuLabel class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Move to folder</UiDropdownMenuLabel>
            <UiDropdownMenuSeparator />
            <UiDropdownMenuItem v-for="f in folders" :key="f" @click="handleMoveToFolder(f)">
              <Icon name="lucide:folder-open" class="mr-2 h-4 w-4" />{{ f }}
              <Icon v-if="(currentPage as any).folder === f" name="lucide:check" class="ml-auto h-3.5 w-3.5 text-primary" />
            </UiDropdownMenuItem>
            <UiDropdownMenuSeparator v-if="folders.length" />
            <div class="px-2 py-1.5">
              <div class="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
                <Icon name="lucide:folder-plus" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  v-model="newFolderName"
                  placeholder="New folder…"
                  class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60 min-w-0"
                  @keydown.enter.stop="handleCreateFolder"
                  @keydown.escape.stop="folderPickerOpen = false"
                  @click.stop
                />
                <button
                  :disabled="!newFolderName.trim() || creatingFolder"
                  class="text-[10px] text-primary disabled:opacity-40 hover:text-primary/80 font-medium shrink-0"
                  @click.stop="handleCreateFolder"
                >Create</button>
              </div>
            </div>
            <UiDropdownMenuSeparator v-if="(currentPage as any).folder" />
            <UiDropdownMenuItem v-if="(currentPage as any).folder" class="text-muted-foreground" @click="handleMoveToFolder(null)">
              <Icon name="lucide:folder-minus" class="mr-2 h-4 w-4" />Remove from folder
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>

        <!-- Status pill -->
        <UiPopover v-model:open="statusPickerOpen">
          <UiPopoverTrigger as-child>
            <button
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-muted/50 hover:bg-muted transition-colors"
              :class="currentStatusOption.color">
              <Icon :name="currentStatusOption.icon" class="h-3.5 w-3.5" />
              {{ currentStatusOption.label }}
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-36 p-1">
            <button
              v-for="opt in PAGE_STATUS_OPTIONS"
              :key="opt.value"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="localStatus = opt.value; statusPickerOpen = false">
              <Icon :name="opt.icon" class="h-3.5 w-3.5" :class="opt.color" />
              <span class="flex-1">{{ opt.label }}</span>
              <Icon v-if="localStatus === opt.value" name="lucide:check" class="h-3 w-3 text-primary" />
            </button>
          </UiPopoverContent>
        </UiPopover>

        <!-- Created date pill -->
        <span
          v-if="(currentPage as any).createdAt"
          class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-muted/50 text-muted-foreground"
          :title="new Date((currentPage as any).createdAt).toLocaleString()"
        >
          <Icon name="lucide:calendar-plus" class="h-3.5 w-3.5 shrink-0" />
          Created on {{ new Date((currentPage as any).createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
        </span>

        <!-- Last edited pill -->
        <span
          v-if="(currentPage as any).updatedAt || (currentPage as any).createdAt"
          class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-muted/50 text-muted-foreground"
          :title="new Date((currentPage as any).updatedAt || (currentPage as any).createdAt).toLocaleString()"
        >
          <Icon name="lucide:clock" class="h-3.5 w-3.5 shrink-0" />
          Last edited {{ formatRelativeTime((currentPage as any).updatedAt || (currentPage as any).createdAt) }}
        </span>



      </div>
    </div>

    <!-- Body: editor + optional right sidebar -->
    <div class="flex-1 flex min-h-0 overflow-hidden">
      <!-- Main editor -->
      <UiRichTextEditor
        ref="editorRef"
        :model-value="localContent"
        placeholder="Write your note..."
        class="flex-1 min-h-0 border-none! rounded-none!"
        fill-height
        draghandle
        mentions
        tasklist
        images
        embeds
        tables
        mathematics
        templates
        collaborative
        inline-comments
        :entity-id="currentPage.id"
        @update:model-value="onContentUpdate"
        @add-inline-comment="handleAddInlineComment"
      />

      <!-- Right sidebar: collapsed strip -->
      <Transition name="sidebar-slide">
        <div
          v-if="showSidebar === false"
          class="shrink-0 border-l border-border flex flex-col items-center py-2 w-10 bg-card/50">
          <button
            class="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Expand sidebar"
            @click="showSidebar = true">
            <Icon name="lucide:panel-right-open" class="h-4 w-4" />
          </button>
        </div>
      </Transition>

      <!-- Right sidebar: expanded -->
      <Transition name="sidebar-slide">
        <aside
          v-if="showSidebar"
          class="shrink-0 border-l border-border flex flex-col overflow-hidden relative"
          :class="isResizingSidebar ? 'select-none' : ''"
          :style="{ width: sidebarW + 'px' }">
          <!-- Resize handle -->
          <div
            class="absolute inset-y-0 left-0 w-1 cursor-ew-resize z-10 hover:bg-primary/20 transition-colors"
            @pointerdown="startSidebarResize($event)" />

          <!-- Tab bar -->
          <div class="flex border-b border-border shrink-0">
            <button
              class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
              :class="sidebarTab === 'references' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'"
              @click="sidebarTab = 'references'">
              References
            </button>
            <button
              class="flex-1 px-3 py-2 text-[10px] font-medium uppercase tracking-wide transition-colors"
              :class="sidebarTab === 'activity' ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'"
              @click="sidebarTab = 'activity'">
              Activity
              <span v-if="displayActivity.length" class="ml-1 text-[9px] bg-muted rounded-full px-1.5 py-0.5">{{ displayActivity.length }}</span>
            </button>
            <!-- Collapse button -->
            <button
              class="px-2 py-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="Collapse sidebar"
              @click="showSidebar = false">
              <Icon name="lucide:panel-right-close" class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Tab content -->
          <div class="flex-1 overflow-y-auto min-h-0">
            <!-- References tab -->
            <ReferencesSection
              v-if="sidebarTab === 'references'"
              v-model="editablePageRef.references"
              @open-entity="handleOpenEntityRef"
              @remove-ref="handleRemoveRef"
              @add-entity="() => { entityPickerFilterType = undefined; entityPickerOpen = true }"
              @add-entity-of-type="(type) => { entityPickerFilterType = type; entityPickerOpen = true }" />

            <!-- Activity tab -->
            <div v-if="sidebarTab === 'activity'" class="p-3 space-y-2 flex flex-col h-full">
              <div class="flex-1 overflow-y-auto space-y-2 min-h-0">
                <div v-if="commentsLoading" class="flex items-center gap-2 py-2">
                  <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin text-muted-foreground" />
                  <span class="text-xs text-muted-foreground">Loading…</span>
                </div>
                <template v-else-if="displayActivity.length">
                  <div v-for="item in displayActivity" :key="item.id" class="flex items-start gap-2">
                    <div
                      class="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white"
                      :class="getPresenceBg(item.authorId)">
                      <Icon v-if="item.type === 'created'" name="lucide:plus" class="h-2.5 w-2.5" />
                      <Icon v-else-if="item.type === 'comment'" name="lucide:message-circle" class="h-2.5 w-2.5" />
                      <Icon v-else-if="item.type === 'status_change'" name="lucide:edit-3" class="h-2.5 w-2.5" />
                      <Icon v-else name="lucide:activity" class="h-2.5 w-2.5" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline gap-1 flex-wrap">
                        <span class="text-[11px] font-medium">{{ item.authorName }}</span>
                        <span class="text-[10px] text-muted-foreground">{{ formatRelativeTime(item.createdAt) }}</span>
                      </div>
                      <template v-if="(item as any).metadata?.anchorId && !(item as any).metadata?.resolved">
                        <button
                          class="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground italic bg-muted/60 rounded px-1.5 py-0.5 max-w-full hover:bg-muted transition-colors"
                          :title="'Go to: ' + (item as any).metadata.quotedText"
                          @click="scrollToComment((item as any).metadata.anchorId)">
                          <Icon name="lucide:quote" class="h-2.5 w-2.5 shrink-0" />
                          <span class="truncate max-w-[140px]">{{ (item as any).metadata.quotedText }}</span>
                        </button>
                        <div class="flex items-center gap-1 mt-0.5">
                          <p v-if="item.content" class="text-xs text-foreground/80 flex-1 min-w-0 truncate">{{ item.content }}</p>
                          <p v-else class="text-[10px] text-muted-foreground flex-1 min-w-0 italic">Inline comment</p>
                          <button
                            class="text-[10px] text-muted-foreground hover:text-primary shrink-0 transition-colors"
                            @click="resolveInlineComment((item as any).metadata.anchorId, item.id)">
                            Resolve
                          </button>
                        </div>
                      </template>
                      <template v-else>
                        <p v-if="item.content" class="text-xs text-foreground/80 mt-0.5">{{ item.content }}</p>
                        <p v-else-if="item.type === 'created'" class="text-[10px] text-muted-foreground mt-0.5">created this page</p>
                        <p v-else-if="(item as any).metadata?.resolved" class="text-[10px] text-muted-foreground/50 mt-0.5 italic">
                          ✓ Resolved: "{{ (item as any).metadata.quotedText }}"
                        </p>
                      </template>
                    </div>
                  </div>
                </template>
                <div v-else class="py-4 text-center">
                  <p class="text-xs text-muted-foreground italic">No activity yet</p>
                </div>
              </div>
              <!-- Comment input -->
              <div class="flex items-center gap-2 pt-2 border-t border-border shrink-0">
                <div class="w-5 h-5 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                  <Icon name="lucide:user" class="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <input
                  v-model="newComment"
                  type="text"
                  placeholder="Add a comment…"
                  class="flex-1 text-xs bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
                  @keydown.enter="newComment.trim() && handleAddComment()" />
                <button
                  v-if="newComment.trim()"
                  class="text-primary hover:text-primary/80 transition-colors shrink-0"
                  @click="handleAddComment">
                  <Icon name="lucide:send" class="h-3 w-3" />
                </button>
              </div>
              <p v-if="currentPage?.updatedAt || currentPage?.createdAt" class="text-[10px] text-muted-foreground/50 text-center shrink-0 pt-1">
                Last edited · {{ formatRelativeTime((currentPage as any).updatedAt || (currentPage as any).createdAt) }}
              </p>
            </div>
          </div>
        </aside>
      </Transition>
    </div>
  </div>

  <!-- Entity Reference Picker -->
  <EntityReferencePicker
    v-model:open="entityPickerOpen"
    :exclude-id="pageId"
    :filter-type="entityPickerFilterType"
    @select="handleAddEntityRef"
    @created="handleCreatedEntityRef" />

  <!-- Page icon picker -->
  <IconPicker
    v-model:open="iconPickerOpen"
    :model-value="localIcon"
    @update:model-value="handleIconChange" />
  </div>
</template>

<style scoped>
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  width: 0 !important;
  opacity: 0;
}
</style>
