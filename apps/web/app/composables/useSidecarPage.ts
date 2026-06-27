import type { PageItem } from '~/types/entity'
import { useEntity, useMutation } from 'trellis/vue/typed'
import { getOrCreatePresenceIdentity } from '~/lib/presence/identity'
import { usePageTextSync } from '~/lib/presence/use-page-text-sync'
import { mapPageItemToSidecar, mapSidecarToPageItem } from '~/lib/trellis-sidecar/page-mapper'
import {
  PageType,
  pageTitleOrFallback,
  UNTITLED_PAGE_TITLE,
  type SidecarPage,
} from '~/lib/trellis-sidecar/schema/page'

const SAVE_DEBOUNCE_MS = 600

/** Sidecar truth path for a single page entity. */
export function useSidecarPage(pageId: Ref<string>) {
  const client = useTrellisDb()
  if (!client) {
    return {
      page: computed(() => undefined as PageItem | undefined),
      loading: computed(() => false),
      error: computed(() => new Error('Trellis sidecar client not initialized') as Error | null),
      update: async () => {},
      remove: async () => {},
    }
  }

  const trellisClient = client as unknown as Parameters<typeof useEntity>[0]

  const entityRead = useEntity(trellisClient, PageType, toValue(pageId))
  const mut = useMutation(trellisClient, PageType)

  const page = computed(() => {
    const row = entityRead.value.data
    return row ? mapSidecarToPageItem(row as SidecarPage) : undefined
  })

  async function update(partial: Partial<PageItem>) {
    const id = pageId.value
    if (!id) return
    const attrs = mapPageItemToSidecar(partial)
    if (Object.keys(attrs).length === 0) return
    await mut.update(id, attrs)
  }

  async function remove() {
    const id = pageId.value
    if (!id) return
    await mut.remove(id)
  }

  return {
    page,
    loading: computed(() => entityRead.value.loading),
    error: computed(() => entityRead.value.error),
    update,
    remove,
  }
}

/**
 * Full sidecar page editor state: truth + debounced save + title focus merge.
 * Call only when `useTrellisSidecar().enabled` is true.
 */
export function useSidecarPageEditor(pageId: Ref<string>) {
  const { page, loading, error, update, remove } = useSidecarPage(pageId)
  const trellisPresence = useTrellisPagePresence(pageId)
  const { remoteText, applyLocalEdit, seedFromGraph } = usePageTextSync(
    trellisPresence.room,
    import.meta.client ? getOrCreatePresenceIdentity().peerId : 'ssr',
    pageId,
  )

  const localTitle = ref('')
  const localContent = ref('')
  const titleFocused = ref(false)
  const contentFocused = ref(false)
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')

  let titleTimer: ReturnType<typeof setTimeout> | null = null
  let contentTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    page,
    (p) => {
      if (!p) return
      if (!titleFocused.value) {
        localTitle.value = pageTitleOrFallback(p.title)
      }
      if (!contentFocused.value) {
        const html = p.content ?? ''
        localContent.value = html
        seedFromGraph(html)
      }
    },
    { immediate: true },
  )

  watch(remoteText, (text) => {
    if (contentFocused.value) return
    if (text !== localContent.value) {
      localContent.value = text
    }
  })

  function scheduleTitleSave(next?: string) {
    if (titleTimer) clearTimeout(titleTimer)
    titleTimer = setTimeout(() => {
      void saveTitle(next)
    }, SAVE_DEBOUNCE_MS)
  }

  function scheduleContentSave(next?: string) {
    if (contentTimer) clearTimeout(contentTimer)
    contentTimer = setTimeout(() => {
      void saveContent(next)
    }, SAVE_DEBOUNCE_MS)
  }

  async function saveTitle(next?: string) {
    const trimmed = (next ?? localTitle.value).trim() || UNTITLED_PAGE_TITLE
    if (trimmed === pageTitleOrFallback(page.value?.title)) return
    saveStatus.value = 'saving'
    try {
      await update({ title: trimmed })
      saveStatus.value = 'saved'
      setTimeout(() => {
        if (saveStatus.value === 'saved') saveStatus.value = 'idle'
      }, 1500)
    } catch {
      saveStatus.value = 'error'
    }
  }

  async function saveContent(next?: string) {
    const html = next ?? localContent.value
    if (html === (page.value?.content ?? '')) return
    saveStatus.value = 'saving'
    try {
      await update({ content: html })
      saveStatus.value = 'saved'
      setTimeout(() => {
        if (saveStatus.value === 'saved') saveStatus.value = 'idle'
      }, 1500)
    } catch {
      saveStatus.value = 'error'
    }
  }

  function onTitleInput(e: Event) {
    const val = (e.target as HTMLInputElement).value
    localTitle.value = val
    scheduleTitleSave(val)
  }

  function onTitleFocus() {
    titleFocused.value = true
    trellisPresence.publishField(pageId.value, 'title')
  }

  function onTitleBlur() {
    titleFocused.value = false
    trellisPresence.publishField(pageId.value, undefined)
    void saveTitle()
  }

  function onContentUpdate(val: string) {
    localContent.value = val
    applyLocalEdit(val)
    scheduleContentSave(val)
  }

  function onContentFocus() {
    contentFocused.value = true
    trellisPresence.publishField(pageId.value, 'content')
  }

  function onContentBlur() {
    contentFocused.value = false
    trellisPresence.publishField(pageId.value, undefined)
    void saveContent()
  }

  onBeforeUnmount(() => {
    if (titleTimer) clearTimeout(titleTimer)
    if (contentTimer) clearTimeout(contentTimer)
  })

  async function removePage() {
    await remove()
  }

  return {
    page,
    loading,
    error,
    localTitle,
    localContent,
    saveStatus,
    onTitleInput,
    onTitleFocus,
    onTitleBlur,
    onContentUpdate,
    onContentFocus,
    onContentBlur,
    removePage,
    presence: trellisPresence,
  }
}
