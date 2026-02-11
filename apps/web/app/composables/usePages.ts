import type { Ref } from 'vue'

export interface PageConfig {
  id: string
  title: string
  icon?: string
  dataSource: string // entity type slug (e.g. 'task', 'note', 'invoice') or 'all' for unfiltered
  filters?: Record<string, any>
  defaultProjection?: string // e.g. 'table', 'kanban', 'calendar', 'list'
  order?: number
  createdAt?: number
  updatedAt?: number
}

/**
 * usePages — CRUD composable for user-created Page entities.
 * Pages are stored per-app in InstantDB settings with key `app:${appId}:pages`.
 */
export function usePages() {
  const db = useInstantDb()
  const tx = db.tx as any
  const { currentApp } = useInstantData()

  const pages = useState<PageConfig[]>('pages:list', () => [])
  const pagesLoading = useState<boolean>('pages:loading', () => false)

  // Subscribe to pages for the current app
  if (import.meta.client) {
    const subscriptionStarted = useState<boolean>('pages:subscriptionStarted', () => false)

    if (!subscriptionStarted.value) {
      subscriptionStarted.value = true

      let unsubPages: (() => void) | null = null
      watch(
        currentApp,
        (app) => {
          if (unsubPages) {
            unsubPages()
            unsubPages = null
          }

          if (!app) {
            pages.value = []
            pagesLoading.value = false
            return
          }

          pagesLoading.value = true
          const settingKey = `app:${app.id}:pages`
          unsubPages = db.subscribeQuery(
            {
              settings: {
                $: {
                  where: {
                    settingKey,
                  },
                },
              },
            },
            (result: any) => {
              const raw = (result.data as any)?.settings?.[0]?.value
              const items = Array.isArray(raw) ? (raw as PageConfig[]) : []
              pages.value = items.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
              pagesLoading.value = false
            },
          )
        },
        { immediate: true },
      )
    }
  }

  const _persistPages = async (updatedPages: PageConfig[]) => {
    const app = currentApp.value
    if (!app) return

    const settingKey = `app:${app.id}:pages`
    const resp = await db.queryOnce({
      settings: {
        $: {
          where: {
            settingKey,
          },
        },
      },
    })

    const existing = (resp.data as any)?.settings?.[0]
    const now = Date.now()

    if (existing?.id) {
      await db.transact([
        tx.settings[existing.id].update({
          settingKey,
          entityType: 'app',
          entityId: app.id,
          key: 'pages',
          value: updatedPages,
          updatedAt: now,
        }),
      ])
    } else {
      const id = crypto.randomUUID()
      await db.transact([
        tx.settings[id].create({
          settingKey,
          entityType: 'app',
          entityId: app.id,
          key: 'pages',
          value: updatedPages,
          updatedAt: now,
        }),
      ])
    }
  }

  const createPage = async (config: Omit<PageConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const id = crypto.randomUUID()
    const now = Date.now()
    const newPage: PageConfig = {
      ...config,
      id,
      order: config.order ?? pages.value.length,
      createdAt: now,
      updatedAt: now,
    }
    const updated = [...pages.value, newPage]
    await _persistPages(updated)
    return id
  }

  const updatePage = async (id: string, updates: Partial<Omit<PageConfig, 'id' | 'createdAt'>>) => {
    const updated = pages.value.map((p) =>
      p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p,
    )
    await _persistPages(updated)
  }

  const deletePage = async (id: string) => {
    const updated = pages.value.filter((p) => p.id !== id)
    await _persistPages(updated)
  }

  const reorderPages = async (orderedIds: string[]) => {
    const updated = orderedIds
      .map((id, index) => {
        const page = pages.value.find((p) => p.id === id)
        return page ? { ...page, order: index, updatedAt: Date.now() } : null
      })
      .filter(Boolean) as PageConfig[]
    await _persistPages(updated)
  }

  return {
    pages: pages as Ref<PageConfig[]>,
    pagesLoading: pagesLoading as Ref<boolean>,
    createPage,
    updatePage,
    deletePage,
    reorderPages,
  }
}
