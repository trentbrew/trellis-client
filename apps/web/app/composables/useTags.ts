/**
 * Composable for managing tags
 *
 * Tags are the generic grouping mechanism for the scaffold.
 * Unlike hierarchical folders, tags are flat and flexible.
 * Records can have multiple tags, enabling cross-cutting categorization.
 */

import type { Tag } from '~/types/database'

const STORAGE_KEY = 'platform-sandbox-tags'

// Generate a unique ID
const generateId = () => `tag_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// Generate slug from name
const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Default color palette for tags
const TAG_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-red-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-cyan-500',
]

export function useTags() {
  const { currentApp } = useInstantData()

  // Reactive tags state
  const tags = useState<Tag[]>('tags', () => {
    if (import.meta.client) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return []
        }
      }
    }
    return []
  })

  // Persist tags to localStorage
  const persistTags = () => {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tags.value))
    }
  }

  // Watch for changes and persist
  watch(tags, persistTags, { deep: true })

  // Get tags for current app
  const appTags = computed(() => {
    const appId = currentApp.value?.id
    if (!appId) return tags.value
    return tags.value.filter((t) => t.appId === appId)
  })

  // Get tag by ID
  const getTagById = (id: string): Tag | undefined => {
    return tags.value.find((t) => t.id === id)
  }

  // Get tags by IDs
  const getTagsByIds = (ids: string[]): Tag[] => {
    return tags.value.filter((t) => ids.includes(t.id))
  }

  // Create a new tag
  const createTag = (data: Partial<Tag> & { name: string }): Tag => {
    const appId = currentApp.value?.id || 'default'
    const colorIndex = tags.value.length % TAG_COLORS.length
    const now = Date.now()

    const tag: Tag = {
      id: generateId(),
      appId,
      name: data.name,
      slug: data.slug || slugify(data.name),
      color: data.color || TAG_COLORS[colorIndex],
      icon: data.icon || 'lucide:tag',
      description: data.description,
      parentId: data.parentId,
      order: data.order ?? tags.value.length,
      createdAt: now,
      updatedAt: now,
    }

    tags.value.push(tag)
    return tag
  }

  // Update a tag
  const updateTag = (id: string, data: Partial<Tag>): Tag | undefined => {
    const index = tags.value.findIndex((t) => t.id === id)
    if (index === -1) return undefined

    const existing = tags.value[index]
    if (!existing) return undefined

    const updated: Tag = {
      ...existing,
      ...data,
      id: existing.id, // Preserve ID
      updatedAt: Date.now(),
    }

    tags.value[index] = updated
    return updated
  }

  // Delete a tag
  const deleteTag = (id: string): boolean => {
    const index = tags.value.findIndex((t) => t.id === id)
    if (index === -1) return false

    tags.value.splice(index, 1)
    return true
  }

  // Search tags by name
  const searchTags = (query: string): Tag[] => {
    const q = query.toLowerCase()
    return appTags.value.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.includes(q) || t.description?.toLowerCase().includes(q),
    )
  }

  // Get or create tag by name
  const getOrCreateTag = (name: string): Tag => {
    const existing = appTags.value.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) return existing
    return createTag({ name })
  }

  // Reorder tags
  const reorderTags = (orderedIds: string[]) => {
    orderedIds.forEach((id, index) => {
      const tag = tags.value.find((t) => t.id === id)
      if (tag) {
        tag.order = index
        tag.updatedAt = Date.now()
      }
    })
  }

  // Get child tags (if using hierarchical tags)
  const getChildTags = (parentId: string): Tag[] => {
    return appTags.value.filter((t) => t.parentId === parentId)
  }

  // Get root tags (no parent)
  const rootTags = computed(() => {
    return appTags.value.filter((t) => !t.parentId).sort((a, b) => a.order - b.order)
  })

  return {
    // State
    tags: appTags,
    allTags: tags,
    rootTags,

    // Getters
    getTagById,
    getTagsByIds,
    searchTags,
    getChildTags,

    // Mutations
    createTag,
    updateTag,
    deleteTag,
    getOrCreateTag,
    reorderTags,

    // Constants
    TAG_COLORS,
  }
}
