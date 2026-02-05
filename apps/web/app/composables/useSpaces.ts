import type { Collection } from '~/types/database'

export const useSpaces = () => {
  const { currentApp, collections, collectionsLoading, createCollection, updateCollection, deleteCollection } =
    useInstantData()

  const spaces = computed<Collection[]>(() => {
    const appId = currentApp.value?.id
    if (!appId) return []
    return collections.value
      .filter((c) => c.appId === appId && !c.parentId)
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  })

  const isLoaded = computed(() => {
    return !!currentApp.value?.id && !collectionsLoading.value
  })

  const loadSpaces = async () => {
    // No-op: spaces are reactive via InstantDB
  }

  const createSpace = async (data: { title: string; icon: string; slug: string; type?: Collection['type'] }) => {
    try {
      const appId = currentApp.value?.id
      if (!appId) throw new Error('No app selected')
      const maxOrder = spaces.value.length > 0 ? Math.max(...spaces.value.map((s) => s.order)) : 0
      const now = Date.now()

      const id = await createCollection({
        appId,
        title: data.title,
        icon: data.icon,
        slug: data.slug,
        type: data.type || 'database',
        order: maxOrder + 1,
        isPublished: true,
        createdBy: 'current-user',
      })

      return {
        id,
        appId,
        title: data.title,
        icon: data.icon,
        slug: data.slug,
        type: data.type || 'database',
        order: maxOrder + 1,
        isPublished: true,
        createdBy: 'current-user',
        createdAt: now,
        updatedAt: now,
      }
    } catch (error) {
      console.error('Failed to create space:', error)
      return null
    }
  }

  const deleteSpace = async (id: string) => {
    try {
      await deleteCollection(id)
      return true
    } catch (error) {
      console.error('Failed to delete space:', error)
      return false
    }
  }

  const updateSpace = async (
    id: string,
    updates: Partial<Omit<Collection, 'id' | 'appId' | 'createdBy' | 'createdAt'>>,
  ) => {
    try {
      await updateCollection(id, updates as Partial<Collection>)

      return true
    } catch (error) {
      console.error('Failed to update space:', error)
      return false
    }
  }

  return {
    spaces,
    isLoaded,
    loadSpaces,
    createSpace,
    deleteSpace,
    updateSpace,
  }
}
