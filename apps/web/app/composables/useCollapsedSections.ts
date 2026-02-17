/**
 * Composable for managing collapsed sidebar sections
 */
export const useCollapsedSections = () => {
  const storageKey = 'collapsed-sidebar-sections'
  const collapsedSections = ref<Set<string>>(new Set())

  // Load collapsed sections from localStorage
  const loadCollapsedSections = () => {
    if (import.meta.client) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const sections = JSON.parse(stored)
          if (Array.isArray(sections) && sections.every((v) => typeof v === 'string')) {
            collapsedSections.value = new Set(sections)
          } else {
            collapsedSections.value = new Set()
          }
        }
      } catch (error) {
        console.error('Failed to load collapsed sections:', error)
        collapsedSections.value = new Set()
      }
    }
  }

  // Save collapsed sections to localStorage
  const saveCollapsedSections = () => {
    if (import.meta.client) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(Array.from(collapsedSections.value)))
      } catch (error) {
        console.error('Failed to save collapsed sections:', error)
      }
    }
  }

  // Check if a section is collapsed
  const isCollapsed = (sectionId: string) => {
    return collapsedSections.value.has(sectionId)
  }

  // Toggle section collapse state
  const toggleSection = (sectionId: string) => {
    if (isCollapsed(sectionId)) {
      collapsedSections.value.delete(sectionId)
    } else {
      collapsedSections.value.add(sectionId)
    }
    saveCollapsedSections()
  }

  // Initialize on mount
  onMounted(() => {
    loadCollapsedSections()
  })

  return {
    collapsedSections: readonly(collapsedSections),
    isCollapsed,
    toggleSection,
  }
}
