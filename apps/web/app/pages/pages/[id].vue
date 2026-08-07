<script setup lang="ts">
  import type { Entity, EntityReference, Reference, PageItem, PageStatus } from '~/types/entity'
  import { getPresenceBg, getPresenceRing } from '~/utils/presenceColor'
  import { isDocumentChromeType } from '~/lib/document-chrome'
  import { entityId as toEntityId } from '~/lib/tql-namespace'
  import { stripHtml } from '~/utils/stripHtml'
  import { MIN_SUMMARY_SOURCE_LENGTH, resolveSummaryText, useEntitySummary } from '~/composables/useEntitySummary'

  definePageMeta({
    layout: 'default',
    key: (route) => route.params.id as string,
  })

  const route = useRoute()
  const pageId = computed(() => route.params.id as string)

  const trellisSidecar = useTrellisSidecar()
  const sidecarEditor = trellisSidecar.enabled ? useSidecarPageEditor(pageId) : null
  const nuxtApp = useNuxtApp()

  const { getPage, updatePage: _updatePage, deletePage, pages, folders, moveToFolder, livePageTitle } = usePageNotes()
  const { addPage: addRecentPage } = useRecentPages()
  const { items: allItems } = useTrellisEntities()
  const { register: registerPresence, deregister: deregisterPresence, publishField, getViewers } = usePagePresence()
  const { user: currentUser } = useInstantAuth()

  const kernelPage = computed<PageItem | undefined>(() => {
    const found = getPage(pageId.value) ?? allItems.value?.find((i: Entity) => i.id === pageId.value)
    return found as PageItem | undefined
  })

  /** Sidecar truth only when the page exists in the sidecar store (not kernel-only pages). */
  const usingSidecarEditor = computed(() => {
    if (!trellisSidecar.enabled || !sidecarEditor) return false
    if (sidecarEditor.loading.value) return false
    return !!sidecarEditor.page.value
  })

  function registerPagePresence(id: string) {
    if (usingSidecarEditor.value && sidecarEditor) sidecarEditor.presence.register(id)
    else registerPresence(id)
  }

  function deregisterPagePresence(id: string) {
    if (usingSidecarEditor.value && sidecarEditor) sidecarEditor.presence.deregister(id)
    else deregisterPresence(id)
  }

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
  const { displayActivity, addComment, addInlineComment, logActivity, loading: commentsLoading } = useComments(pageId)

  // Resolve current page — sidecar when imported, otherwise TQL kernel
  const currentPage = computed<PageItem | undefined>(() => {
    if (usingSidecarEditor.value && sidecarEditor) {
      return sidecarEditor.page.value
    }
    return kernelPage.value
  })

  const pageLoading = computed(() => {
    if (!trellisSidecar.enabled || !sidecarEditor) return false
    if (kernelPage.value) return false
    return sidecarEditor.loading.value
  })

  useHead({ title: computed(() => currentPage.value?.title || 'Untitled') })

  // ── Auto-save via useAutoSave composable ─────────────────────────
  // useAutoSave is always enabled for pages (they're always in edit mode).
  // We declare the editable reactive object later (after local refs), then
  // wire useAutoSave to it. The `triggerSave` function pokes the reactive
  // to trigger the debounced watcher without manual setTimeout management.
  const _autoSaveEnabled = computed(() => !usingSidecarEditor.value)

  onMounted(() => {
    if (pageId.value) {
      registerPagePresence(pageId.value)
      addRecentPage(pageId.value)
    }
  })

  onBeforeUnmount(() => {
    if (_titleLogTimer) clearTimeout(_titleLogTimer)
    if (_contentLogTimer) clearTimeout(_contentLogTimer)
    livePageTitle.value = null
    if (pageId.value) {
      deregisterPagePresence(pageId.value)
    }
  })

  // Re-register when navigating between pages
  watch(pageId, (newId, oldId) => {
    if (oldId) deregisterPagePresence(oldId)
    if (newId) {
      registerPagePresence(newId)
      addRecentPage(newId)
    }
  })

  // ── Local state ───────────────────────────────────────────────────
  const localTitle = ref('')
  const localContent = ref('')

  // Local refs are seeded via _seedFromPage defined below, after all refs are declared.

  function onTitleUpdate(val: string) {
    if (usingSidecarEditor.value && sidecarEditor) {
      sidecarEditor.localTitle.value = val
      livePageTitle.value = { id: pageId.value, title: val }
      return
    }
    localTitle.value = val
    livePageTitle.value = { id: pageId.value, title: val }
    if (_titleLogTimer) clearTimeout(_titleLogTimer)
    _titleLogTimer = setTimeout(() => {
      if (val.trim()) logActivity(`renamed to "${val}"`, 'status_change')
    }, 3000)
  }

  function onTitleFocus() {
    if (usingSidecarEditor.value && sidecarEditor) {
      sidecarEditor.onTitleFocus()
      return
    }
    publishField(pageId.value, 'title')
  }

  function onTitleBlur() {
    if (usingSidecarEditor.value && sidecarEditor) {
      sidecarEditor.onTitleBlur()
      return
    }
    publishField(pageId.value, undefined)
  }

  function onContentUpdate(val: string) {
    if (usingSidecarEditor.value && sidecarEditor) {
      sidecarEditor.onContentUpdate(val)
      return
    }
    localContent.value = val
    if (_contentLogTimer) clearTimeout(_contentLogTimer)
    _contentLogTimer = setTimeout(() => {
      logActivity('edited content', 'status_change')
    }, 5000)
  }

  function onContentFocus() {
    if (usingSidecarEditor.value) sidecarEditor?.onContentFocus()
    else publishField(pageId.value, 'content')
  }

  function onContentBlur() {
    if (usingSidecarEditor.value) sidecarEditor?.onContentBlur()
    else publishField(pageId.value, undefined)
  }

  const displayTitle = computed(() =>
    usingSidecarEditor.value && sidecarEditor ? sidecarEditor.localTitle.value : localTitle.value,
  )

  const displayContent = computed(() =>
    usingSidecarEditor.value && sidecarEditor ? sidecarEditor.localContent.value : localContent.value,
  )

  const {
    ensure: ensurePageSummary,
    regenerate: regeneratePageSummaryFn,
    isGenerating: isPageSummaryGenerating,
  } = useEntitySummary()
  const { fetchNode } = useTrellisGraph()

  async function resolvePageContentForSummary(): Promise<string> {
    const merged = displayContent.value || currentPage.value?.content || ''
    if (!currentPage.value?.id || usingSidecarEditor.value) return merged
    if (stripHtml(merged).trim().length >= MIN_SUMMARY_SOURCE_LENGTH) return merged

    try {
      const { node } = await fetchNode(toEntityId(pageId.value))
      const content = (node?.content as string) || ''
      if (content && !localContent.value) localContent.value = content
      return content || merged
    } catch {
      return merged
    }
  }

  const pageSummary = computed(() => (currentPage.value?.summary || '').trim())
  const generatingPageSummary = computed(() =>
    currentPage.value?.id ? isPageSummaryGenerating(currentPage.value.id) : false,
  )
  const pageContentLength = computed(() => {
    const content = displayContent.value || currentPage.value?.content || ''
    return stripHtml(content).trim().length
  })

  watch(
    () =>
      [
        pageId.value,
        displayContent.value,
        currentPage.value?.id,
        currentPage.value?.summarySourceHash,
        usingSidecarEditor.value,
      ] as const,
    () => {
      const page = currentPage.value
      if (!page?.id || usingSidecarEditor.value) return
      void (async () => {
        const content = await resolvePageContentForSummary()
        const entity = { ...page, content }
        const source = resolveSummaryText(entity)
        if (source.length < MIN_SUMMARY_SOURCE_LENGTH) return
        void ensurePageSummary(entity)
      })()
    },
    { immediate: true },
  )

  function handleRegeneratePageSummary() {
    const page = currentPage.value
    if (!page?.id) return
    void regeneratePageSummaryFn({ ...page, content: displayContent.value })
  }

  const { wp } = useWorkspacePath()
  const currentIndex = computed(() => pages.value.findIndex((p) => p.id === pageId.value))
  const canPrev = computed(() => currentIndex.value > 0)
  const canNext = computed(() => currentIndex.value < pages.value.length - 1)

  function navPrev() {
    if (!canPrev.value) return
    navigateTo(wp(`/pages/${pages.value[currentIndex.value - 1]?.id}`))
  }
  function navNext() {
    if (!canNext.value) return
    navigateTo(wp(`/pages/${pages.value[currentIndex.value + 1]?.id}`))
  }

  // ── Folder ────────────────────────────────────────────────────────
  const folderPickerOpen = ref(false)
  const newFolderName = ref('')
  const creatingFolder = ref(false)

  async function handleMoveToFolder(folder: string | null) {
    if (!pageId.value) return
    if (usingSidecarEditor.value) {
      folderPickerOpen.value = false
      ;(nuxtApp as { $toast?: { info: (m: string) => void } }).$toast?.info(
        'Folders are kernel-only in sidecar mode until browse cutover (Phase 2).',
      )
      return
    }
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
    if (usingSidecarEditor.value) {
      folderPickerOpen.value = false
      ;(nuxtApp as { $toast?: { info: (m: string) => void } }).$toast?.info(
        'Folders are kernel-only in sidecar mode until browse cutover (Phase 2).',
      )
      return
    }
    creatingFolder.value = true
    try {
      await moveToFolder(pageId.value, name)
    } finally {
      creatingFolder.value = false
      newFolderName.value = ''
      folderPickerOpen.value = false
    }
  }

  // ── Delete ────────────────────────────────────────────────────────
  const deleteConfirm = ref(false)
  async function handleDelete() {
    if (!pageId.value) return
    if (usingSidecarEditor.value && sidecarEditor) {
      try {
        await sidecarEditor.removePage()
        navigateTo('/pages')
      } catch {
        ;(nuxtApp as { $toast?: { error: (m: string) => void } }).$toast?.error('Failed to delete page')
      }
      return
    }
    await deletePage(pageId.value)
    navigateTo('/pages')
  }

  // ── Editor ref (for inline comment scroll) ───────────────────────
  const editorRef = ref<any>(null)

  // ── Activity log timers (debounced to avoid flooding on keystrokes) ──
  let _titleLogTimer: ReturnType<typeof setTimeout> | null = null
  let _contentLogTimer: ReturnType<typeof setTimeout> | null = null

  // ── Page status ─────────────────────────────────────────────────
  const PAGE_STATUS_OPTIONS: { value: PageStatus; label: string; icon: string; color: string }[] = [
    { value: 'draft', label: 'Draft', icon: 'lucide:pencil', color: 'text-muted-foreground' },
    { value: 'published', label: 'Published', icon: 'lucide:globe', color: 'text-emerald-500' },
    { value: 'archived', label: 'Archived', icon: 'lucide:archive', color: 'text-amber-500' },
  ]

  const localStatus = ref<PageStatus>('draft')
  const statusPickerOpen = ref(false)

  // localStatus changes are picked up by useAutoSave via the editable reactive

  const currentStatusOption = computed(
    () => PAGE_STATUS_OPTIONS.find((o) => o.value === localStatus.value) ?? PAGE_STATUS_OPTIONS[0]!,
  )

  function handleStatusSelect(value: PageStatus) {
    localStatus.value = value
    statusPickerOpen.value = false
  }

  // ── Tags ─────────────────────────────────────────────────────────
  const localTags = ref<string[]>([])

  // localTags changes are picked up by useAutoSave via the editable reactive

  // ── Right sidebar ─────────────────────────────────────────────────
  const rightSidebarCollapsed = ref(false)
  const rightSidebarW = ref(272)
  const { columnClass: documentColumnClass } = useDocumentReadingWidth()

  // ── Comments ──────────────────────────────────────────────────────
  const newComment = ref('')
  async function handleAddComment() {
    if (!newComment.value.trim()) return
    await addComment(newComment.value.trim())
    newComment.value = ''
  }

  async function handleAddInlineComment(payload: { commentId: string; quotedText: string }) {
    await addInlineComment(payload.commentId, payload.quotedText)
    rightSidebarCollapsed.value = false
  }

  function resolveInlineComment(commentId: string, activityItemId: string) {
    const e = editorRef.value?.getEditor?.()
    if (e) {
      ;(e.chain().focus() as any).unsetInlineComment(commentId).run()
    }
    addComment('', 'comment', { anchorId: commentId, resolved: true, resolvedItemId: activityItemId }).catch(() => {})
  }

  function scrollToComment(commentId: string) {
    const e = editorRef.value?.getEditor?.()
    if (!e) return
    ;(e.chain().focus() as any).scrollToInlineComment(commentId).run()
  }

  // ── References ────────────────────────────────────────────────────
  const localReferences = ref<Reference[]>([])

  // ── Unified page seeder ───────────────────────────────────────────────
  // Seeds all local refs once per pageId (not on every store update).
  // This mirrors notes behavior and prevents the post-save SSE → re-seed → re-save loop.
  const _seededPageId = ref<string | null>(null)

  function _seedFromPage(page: PageItem) {
    localTitle.value = page.title ?? ''
    localContent.value = page.content ?? ''
    const s = page.status
    localStatus.value = s && PAGE_STATUS_OPTIONS.some((o) => o.value === s) ? s : 'draft'
    localTags.value = Array.isArray(page.tags) ? [...page.tags] : []
    localReferences.value = Array.isArray(page.references) ? [...page.references] : []
    _seededPageId.value = page.id
  }

  // Seed when currentPage first becomes available for this pageId (kernel path only)
  watch(
    currentPage,
    (page) => {
      if (usingSidecarEditor.value) return
      if (!page || page.id !== pageId.value) return
      if (_seededPageId.value === page.id) return // already seeded — skip post-save store updates
      _seedFromPage(page)
    },
    { immediate: true },
  )

  // Re-seed when navigating to a different page (kernel path only)
  watch(pageId, () => {
    if (usingSidecarEditor.value) return
    _seededPageId.value = null
    const page = currentPage.value
    if (page && page.id === pageId.value) _seedFromPage(page)
  })

  // ── Editable reactive for useAutoSave ────────────────────────────
  // This reactive object mirrors the local refs so useAutoSave can watch it.
  // Changes to local refs propagate here via watchers, triggering debounced saves.
  const editableItem: any = reactive({
    get id() {
      return pageId.value
    },
    type: 'page' as const,
    get title() {
      return localTitle.value
    },
    set title(v: string) {
      localTitle.value = v
    },
    get content() {
      return localContent.value
    },
    set content(v: string) {
      localContent.value = v
    },
    get status() {
      return localStatus.value
    },
    set status(v: PageStatus) {
      localStatus.value = v
    },
    get tags() {
      return localTags.value
    },
    set tags(v: string[]) {
      localTags.value = v
    },
    references: localReferences.value,
  })

  // Keep editableItem.references in sync with localReferences
  watch(
    localReferences,
    (refs) => {
      editableItem.references = refs
    },
    { deep: true },
  )

  // ── Auto-save ─────────────────────────────────────────────────────
  const { status: kernelSaveStatus } = useAutoSave(editableItem, {
    enabled: _autoSaveEnabled,
    ignoreKeys: ['references', 'updatedAt', 'createdAt'],
  })

  const saveStatus = computed(() =>
    usingSidecarEditor.value && sidecarEditor ? sidecarEditor.saveStatus.value : kernelSaveStatus.value,
  )

  const {
    addEntityRef,
    removeRef: removeEntityRef,
    openEntityRef: handleOpenEntityRef,
    createAndOpenEntityRef,
    createEntityAndLink,
  } = useEntityReferences(editableItem)

  async function handleCreateEntityOfType(type: string, title: string) {
    const ref = await createEntityAndLink(type, title)
    logActivity(`created and linked ${ref.entityType} "${ref.title || ref.entityId}"`, 'status_change')
  }

  async function handleAddEntityRef(ref: EntityReference) {
    await addEntityRef(ref)
    logActivity(`linked ${ref.entityType} "${ref.title || ref.entityId}"`, 'status_change')
  }

  async function handleCreatedEntityRef(ref: EntityReference) {
    await createAndOpenEntityRef(ref)
    logActivity(`created and linked ${ref.entityType} "${ref.title || ref.entityId}"`, 'status_change')
  }

  async function handleRemoveRef(refId: string) {
    const ref = editableItem.references.find((r: any) => r.id === refId || r.entityId === refId) as
      | EntityReference
      | undefined
    await removeEntityRef(refId)
    if (ref) {
      logActivity(`unlinked "${ref.title || ref.entityId}"`, 'status_change')
    }
  }

  const entityPickerOpen = ref(false)
  const entityPickerFilterType = ref<string | undefined>(undefined)
</script>

<template>
  <div :key="pageId">
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
          <UiAlertDialogAction
            class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            @click="handleDelete">
            Delete
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialog>

    <div
      v-if="!currentPage && pageLoading"
      class="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin opacity-30" />
    </div>

    <div v-else-if="!currentPage" class="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
      <Icon name="lucide:file-x" class="h-8 w-8 opacity-30" />
      <p class="text-sm">Page not found</p>
    </div>

    <div v-else class="absolute inset-0 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="shrink-0 border-b border-border">
        <div class="p-3">
          <!-- Top row: type badge + tags + actions -->
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
              <span
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary shrink-0">
                <Icon name="lucide:file-text" class="h-3 w-3" />
                Page
              </span>
              <TagsSection v-model="localTags" inline />
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <!-- Save status indicator -->
              <Transition name="fade" mode="out-in">
                <span
                  v-if="saveStatus === 'saving'"
                  key="saving"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground">
                  <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
                  Saving…
                </span>
                <span
                  v-else-if="saveStatus === 'saved'"
                  key="saved"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground">
                  <Icon name="lucide:check" class="h-3 w-3 text-emerald-500" />
                  Saved
                </span>
                <span
                  v-else-if="saveStatus === 'error'"
                  key="error"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-destructive">
                  <Icon name="lucide:alert-circle" class="h-3 w-3" />
                  Error
                </span>
              </Transition>

              <!-- Prev/Next navigation -->
              <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canPrev" @click="navPrev">
                <Icon name="lucide:chevron-up" class="h-4 w-4" />
              </UiButton>
              <UiButton variant="ghost" size="icon" class="h-7 w-7" :disabled="!canNext" @click="navNext">
                <Icon name="lucide:chevron-down" class="h-4 w-4" />
              </UiButton>

              <span class="mx-0.5 h-4 w-px shrink-0 bg-border/60" aria-hidden="true" />

              <DocumentReadingWidthToggle />
              <RightSidebarToggle v-model:collapsed="rightSidebarCollapsed" />

              <!-- Context menu -->
              <UiDropdownMenu>
                <UiDropdownMenuTrigger as-child>
                  <UiButton variant="ghost" size="icon" class="h-7 w-7">
                    <Icon name="lucide:more-horizontal" class="h-4 w-4" />
                  </UiButton>
                </UiDropdownMenuTrigger>
                <UiDropdownMenuContent align="end" :side-offset="4" class="w-48">
                  <UiDropdownMenuItem @click="() => {}">
                    <Icon name="lucide:share-2" class="mr-2 h-4 w-4" />
                    Share
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem @click="() => {}">
                    <Icon name="lucide:copy" class="mr-2 h-4 w-4" />
                    Duplicate
                  </UiDropdownMenuItem>
                  <UiDropdownMenuItem @click="() => {}">
                    <Icon name="lucide:download" class="mr-2 h-4 w-4" />
                    Export
                  </UiDropdownMenuItem>
                  <UiDropdownMenuSeparator />
                  <UiDropdownMenuItem class="text-destructive focus:text-destructive" @click="deleteConfirm = true">
                    <Icon name="lucide:trash-2" class="mr-2 h-4 w-4" />
                    Delete
                  </UiDropdownMenuItem>
                </UiDropdownMenuContent>
              </UiDropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent pages strip -->
      <RecentPagesStrip />

      <!-- Body: props bar + editor + optional right sidebar -->
      <div class="flex-1 flex min-h-0 overflow-hidden">
        <!-- Left: props + editor -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
          <!-- Properties (props): horizontal pill row -->
          <div class="flex items-center gap-1.5 flex-wrap py-2 px-2 border-b shrink-0">
            <!-- Owner pill -->
            <span
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-muted/50 text-muted-foreground">
              <span
                class="shrink-0 h-4 w-4 rounded-full overflow-hidden flex items-center justify-center bg-muted ring-1 ring-border">
                <img
                  v-if="currentUserAvatar"
                  :src="currentUserAvatar"
                  :alt="currentUserDisplayName || 'User'"
                  class="h-full w-full object-cover"
                  referrerpolicy="no-referrer" />
                <Icon v-else name="lucide:user" class="h-2.5 w-2.5" />
              </span>
              Created by {{ currentUserDisplayName || currentPage?.owner || 'Unknown' }}
            </span>

            <!-- People pill (presence avatars) -->
            <div
              v-if="pageViewers.length"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-muted/50">
              <div class="flex -space-x-1">
                <div
                  v-for="viewer in pageViewers.slice(0, 4)"
                  :key="viewer.peerId"
                  data-testid="page-viewer-avatar"
                  class="relative rounded-full ring-1 ring-offset-1 ring-offset-background"
                  :class="getPresenceRing(viewer.userId)"
                  :title="
                    viewer.name +
                    (viewer.isMe ? ' (you)' : '') +
                    (viewer.editingField ? ` — editing ${viewer.editingField}` : '')
                  ">
                  <div
                    class="h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                    :class="getPresenceBg(viewer.userId)">
                    {{ viewer.initials[0] }}
                  </div>
                  <span
                    v-if="viewer.editingField"
                    class="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-background ring-1 ring-border flex items-center justify-center">
                    <span class="h-0.5 w-0.5 rounded-full animate-pulse" :class="getPresenceBg(viewer.userId)" />
                  </span>
                </div>
              </div>
              <span v-if="pageViewers.length > 4" class="text-[10px] text-muted-foreground ml-0.5">
                +{{ pageViewers.length - 4 }}
              </span>
            </div>

            <!-- Folder pill (kernel metadata — hidden in sidecar mode) -->
            <UiDropdownMenu v-if="!usingSidecarEditor" v-model:open="folderPickerOpen">
              <UiDropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
                  :class="
                    currentPage?.folder
                      ? 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      : 'border border-dashed border-muted-foreground/30 text-muted-foreground/60 hover:border-muted-foreground/50 hover:bg-muted/30 hover:text-muted-foreground'
                  ">
                  <Icon name="lucide:folder" class="h-3.5 w-3.5" />
                  {{ currentPage?.folder || 'No folder' }}
                  <Icon name="lucide:chevron-down" class="h-3 w-3 opacity-40" />
                </button>
              </UiDropdownMenuTrigger>
              <UiDropdownMenuContent align="start" :side-offset="4" class="w-52">
                <UiDropdownMenuLabel class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Move to folder
                </UiDropdownMenuLabel>
                <UiDropdownMenuSeparator />
                <UiDropdownMenuItem v-for="f in folders" :key="f" @click="handleMoveToFolder(f)">
                  <Icon name="lucide:folder-open" class="mr-2 h-4 w-4" />
                  {{ f }}
                  <Icon v-if="currentPage?.folder === f" name="lucide:check" class="ml-auto h-3.5 w-3.5 text-primary" />
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
                      @click.stop />
                    <button
                      :disabled="!newFolderName.trim() || creatingFolder"
                      class="text-[10px] text-primary disabled:opacity-40 hover:text-primary/80 font-medium shrink-0"
                      @click.stop="handleCreateFolder">
                      Create
                    </button>
                  </div>
                </div>
                <UiDropdownMenuSeparator v-if="currentPage?.folder" />
                <UiDropdownMenuItem
                  v-if="currentPage?.folder"
                  class="text-muted-foreground"
                  @click="handleMoveToFolder(null)">
                  <Icon name="lucide:folder-minus" class="mr-2 h-4 w-4" />
                  Remove from folder
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
                  @click="handleStatusSelect(opt.value)">
                  <Icon :name="opt.icon" class="h-3.5 w-3.5" :class="opt.color" />
                  <span class="flex-1">{{ opt.label }}</span>
                  <Icon v-if="localStatus === opt.value" name="lucide:check" class="h-3 w-3 text-primary" />
                </button>
              </UiPopoverContent>
            </UiPopover>

            <!-- Created date pill -->
            <span
              v-if="currentPage?.createdAt"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-muted/50 text-muted-foreground"
              :title="new Date(currentPage.createdAt).toLocaleString()">
              <Icon name="lucide:calendar-plus" class="h-3.5 w-3.5 shrink-0" />
              Created on
              {{
                new Date(currentPage.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              }}
            </span>

            <!-- Last edited pill -->
            <span
              v-if="currentPage?.updatedAt || currentPage?.createdAt"
              class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-muted/50 text-muted-foreground"
              :title="new Date(currentPage.updatedAt || currentPage.createdAt!).toLocaleString()">
              <Icon name="lucide:clock" class="h-3.5 w-3.5 shrink-0" />
              Last edited {{ formatRelativeTime(currentPage.updatedAt || currentPage.createdAt!) }}
            </span>
          </div>

          <!-- Scrollable document column: title + editor -->
          <div class="flex-1 min-h-0 overflow-y-auto">
            <div :class="documentColumnClass">
              <div class="flex-1 min-w-0">
                <DocumentTitleField
                  :title="displayTitle"
                  mode="edit"
                  placeholder="Untitled"
                  :peers="titlePeers"
                  @update:title="onTitleUpdate"
                  @focus="onTitleFocus"
                  @blur="onTitleBlur" />
              </div>

              <div class="min-h-[50vh] flex flex-col" @focusin="onContentFocus" @focusout="onContentBlur">
                <UiRichTextEditor
                  ref="editorRef"
                  data-testid="page-content-editor"
                  :model-value="displayContent"
                  placeholder="Type something..."
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
                  inline-comments
                  :entity-id="currentPage.id"
                  @update:model-value="onContentUpdate"
                  @add-inline-comment="handleAddInlineComment" />
              </div>
            </div>
          </div>
        </div>

        <ResizableRightPanel
          v-model:collapsed="rightSidebarCollapsed"
          v-model:width="rightSidebarW"
          :min-width="220"
          :max-width="480">
          <EntityRightSidebar
            v-model:collapsed="rightSidebarCollapsed"
            :references="editableItem.references"
            :is-view-mode="false"
            :is-create-mode="false"
            :display-activity="displayActivity"
            v-model:new-comment="newComment"
            :comments-loading="commentsLoading"
            entity-label="page"
            :updated-at="currentPage?.updatedAt"
            :created-at="currentPage?.createdAt"
            :item="editableItem"
            :show-properties="true"
            default-tab="properties"
            :show-schema-footer="false"
            @update:references="editableItem.references = $event"
            @open-entity="handleOpenEntityRef"
            @remove-ref="handleRemoveRef"
            @add-entity="
              () => {
                entityPickerFilterType = undefined
                entityPickerOpen = true
              }
            "
            @add-entity-of-type="
              (type) => {
                entityPickerFilterType = type
                entityPickerOpen = true
              }
            "
            @create-entity="handleCreateEntityOfType"
            @add-comment="handleAddComment">
            <template #properties>
              <DocumentPropertiesSummary
                :summary="pageSummary"
                :is-generating-summary="generatingPageSummary"
                :content-length="pageContentLength"
                :summary-generated-at="currentPage?.summaryGeneratedAt"
                @regenerate-summary="handleRegeneratePageSummary" />
              <div class="px-3 py-2 space-y-2 text-xs text-muted-foreground border-t border-border/50">
                <div v-if="currentPage?.createdAt" class="flex items-center gap-2">
                  <Icon name="lucide:calendar-plus" class="h-3.5 w-3.5 shrink-0" />
                  <span>Created {{ new Date(currentPage.createdAt).toLocaleString() }}</span>
                </div>
                <div v-if="currentPage?.updatedAt || currentPage?.createdAt" class="flex items-center gap-2">
                  <Icon name="lucide:history" class="h-3.5 w-3.5 shrink-0" />
                  <span>Last edited {{ formatRelativeTime(currentPage.updatedAt || currentPage.createdAt!) }}</span>
                </div>
              </div>
            </template>
            <template #activity>
              <div class="p-3 pb-0 space-y-2 flex flex-col h-full">
                <div
                  class="flex items-center gap-2 pt-2 border border-border bg-card py-4 px-2 rounded-lg m-0! shrink-0">
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
                <div class="flex-1 overflow-y-auto space-y-2 min-h-0 px-2 pt-4">
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
                          <span class="text-[10px] text-muted-foreground">
                            {{ formatRelativeTime(item.createdAt) }}
                          </span>
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
                            <p v-if="item.content" class="text-xs text-foreground/80 flex-1 min-w-0 truncate">
                              {{ item.content }}
                            </p>
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
                          <p v-else-if="item.type === 'created'" class="text-[10px] text-muted-foreground mt-0.5">
                            created this page
                          </p>
                          <p
                            v-else-if="(item as any).metadata?.resolved"
                            class="text-[10px] text-muted-foreground/50 mt-0.5 italic">
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
              </div>
            </template>
          </EntityRightSidebar>
        </ResizableRightPanel>
      </div>
    </div>

    <!-- Entity Reference Picker -->
    <EntityReferencePicker
      v-model:open="entityPickerOpen"
      :exclude-id="pageId"
      :filter-type="entityPickerFilterType"
      @select="handleAddEntityRef"
      @created="handleCreatedEntityRef" />
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
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.15s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
