import type { Entity, PageItem } from '~/types/entity'
import { createDefaultItem } from '~/types/entity'

/**
 * usePageNotes — Manages fullscreen page documents for the /pages route.
 *
 * Each page is a 'page' entity in the TQL graph with an optional `folder` property.
 * Mirrors the folder-tree pattern from useChannels (used by ChatSidebar).
 */
export function usePageNotes() {
  const { items: allItems, loading, create, update, remove } = useTrellisEntities()

  // Shared live title for the currently-open page (updated on every keystroke)
  const livePageTitle = useState<{ id: string; title: string } | null>('pageNotes:liveTitle', () => null)

  // ── Filtered pages ────────────────────────────────────────────────
  const pages = computed<PageItem[]>(() =>
    (allItems.value ?? []).filter((item: Entity) => item.type === 'page') as PageItem[],
  )

  // ── Folder grouping ───────────────────────────────────────────────
  const folders = computed(() => {
    const set = new Set<string>()
    for (const p of pages.value) {
      if (p.folder) set.add(p.folder)
    }
    return [...set].sort()
  })

  function sortByOrder(a: PageItem, b: PageItem): number {
    const ao = a.sortOrder ?? 0
    const bo = b.sortOrder ?? 0
    return ao - bo
  }

  const ungroupedPages = computed(() =>
    pages.value.filter((p) => !p.folder).sort(sortByOrder),
  )

  const pagesByFolder = computed(() => {
    const map = new Map<string, PageItem[]>()
    for (const p of pages.value) {
      if (!p.folder) continue
      if (!map.has(p.folder)) map.set(p.folder, [])
      map.get(p.folder)!.push(p)
    }
    return [...map.entries()].map(([folder, items]) => ({
      folder,
      pages: items.sort(sortByOrder),
    }))
  })

  // ── CRUD ──────────────────────────────────────────────────────────
  async function createPage(opts?: { title?: string; folder?: string }) {
    const defaults = createDefaultItem('page')
    const newItem = {
      ...defaults,
      type: 'page' as const,
      title: opts?.title || '',
      folder: opts?.folder,
      content: '',
    }
    const id = await create(newItem as Entity)
    return id
  }

  async function updatePage(id: string, data: Partial<PageItem>) {
    const existing = getPage(id)
    const payload = existing ? { ...existing, ...data, id } : { id, type: 'page' as const, ...data }
    await update(payload as Entity)
  }

  async function deletePage(id: string) {
    await remove(id)
  }

  async function renamePage(id: string, title: string) {
    await updatePage(id, { title })
  }

  async function moveToFolder(id: string, folder: string | null) {
    await updatePage(id, { folder: folder ?? undefined })
  }

  async function reorderPages(orderedIds: string[], folder: string | null) {
    await Promise.all(
      orderedIds.map((id, index) =>
        updatePage(id, { sortOrder: index * 1000, folder: folder ?? undefined }),
      ),
    )
  }

  async function renameFolder(oldName: string, newName: string) {
    const affected = pages.value.filter((p) => p.folder === oldName)
    await Promise.all(affected.map((p) => updatePage(p.id, { folder: newName })))
  }

  async function deleteFolder(name: string) {
    const affected = pages.value.filter((p) => p.folder === name)
    await Promise.all(affected.map((p) => updatePage(p.id, { folder: undefined })))
  }

  function getPage(id: string): PageItem | undefined {
    return pages.value.find((p) => p.id === id)
  }

  return {
    pages,
    folders,
    ungroupedPages,
    pagesByFolder,
    loading,
    livePageTitle,
    createPage,
    updatePage,
    deletePage,
    renamePage,
    moveToFolder,
    reorderPages,
    renameFolder,
    deleteFolder,
    getPage,
  }
}
