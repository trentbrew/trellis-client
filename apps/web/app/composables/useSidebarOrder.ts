/**
 * Composable for managing user-customizable sidebar ordering.
 *
 * Persists to localStorage (designed for future migration to InstantDB).
 * Supports:
 * - Item reorder within sections
 * - Section reorder (workspace routes only)
 * - User-created custom sections (workspace routes only)
 * - Admin lock flag (architecture only — not enforced in v1)
 */

export interface SidebarCustomSection {
  key: string
  label: string
  icon?: string
  routePath: string
  items: string[]
  order: number
  locked?: boolean
}

export interface SidebarOrderConfig {
  /** Per-section item order: sectionKey → ordered item paths */
  itemOrder: Record<string, string[]>
  /** Per-route section order: routePath → ordered section keys */
  sectionOrder: Record<string, string[]>
  /** User-created custom sections */
  customSections: SidebarCustomSection[]
  updatedAt: number
}

const STORAGE_KEY = 'sidebar-order'

const defaultConfig = (): SidebarOrderConfig => ({
  itemOrder: {},
  sectionOrder: {},
  customSections: [],
  updatedAt: 0,
})

export const useSidebarOrder = () => {
  const config = useState<SidebarOrderConfig>('sidebar-order', defaultConfig)
  const isLoaded = useState<boolean>('sidebar-order-loaded', () => false)

  // ── Persistence ──────────────────────────────────────────────

  const _load = () => {
    if (!import.meta.client) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          config.value = {
            itemOrder: parsed.itemOrder ?? {},
            sectionOrder: parsed.sectionOrder ?? {},
            customSections: Array.isArray(parsed.customSections) ? parsed.customSections : [],
            updatedAt: parsed.updatedAt ?? 0,
          }
        }
      }
    } catch (error) {
      console.error('Failed to load sidebar order:', error)
      config.value = defaultConfig()
    }
    isLoaded.value = true
  }

  const _persist = () => {
    if (!import.meta.client) return
    try {
      config.value.updatedAt = Date.now()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))
    } catch (error) {
      console.error('Failed to save sidebar order:', error)
    }
  }

  // Initialize on first call (client-side only)
  if (import.meta.client && !isLoaded.value) {
    _load()
  }

  // ── Item Order ───────────────────────────────────────────────

  const getItemOrder = (sectionKey: string): string[] => {
    return config.value.itemOrder[sectionKey] ?? []
  }

  const setItemOrder = (sectionKey: string, orderedPaths: string[]) => {
    config.value.itemOrder[sectionKey] = orderedPaths
    _persist()
  }

  /**
   * Apply saved item order to a list of items.
   * Items in the saved order come first (in saved order),
   * followed by any new items not in the saved order (appended at end).
   */
  const applyItemOrder = <T extends { path?: string }>(sectionKey: string, items: T[]): T[] => {
    const savedOrder = getItemOrder(sectionKey)
    if (savedOrder.length === 0) return items

    const orderMap = new Map(savedOrder.map((path, i) => [path, i]))
    const ordered = [...items].sort((a, b) => {
      const ai = a.path ? (orderMap.get(a.path) ?? Infinity) : Infinity
      const bi = b.path ? (orderMap.get(b.path) ?? Infinity) : Infinity
      return ai - bi
    })
    return ordered
  }

  // ── Section Order ────────────────────────────────────────────

  const getSectionOrder = (routePath: string): string[] => {
    return config.value.sectionOrder[routePath] ?? []
  }

  const setSectionOrder = (routePath: string, orderedKeys: string[]) => {
    config.value.sectionOrder[routePath] = orderedKeys
    _persist()
  }

  /**
   * Apply saved section order to a list of sections.
   * Sections in the saved order come first, followed by any new sections.
   */
  const applySectionOrder = <T extends { key?: string }>(routePath: string, sections: T[]): T[] => {
    const savedOrder = getSectionOrder(routePath)
    if (savedOrder.length === 0) return sections

    const orderMap = new Map(savedOrder.map((key, i) => [key, i]))
    const ordered = [...sections].sort((a, b) => {
      const ai = a.key ? (orderMap.get(a.key) ?? Infinity) : Infinity
      const bi = b.key ? (orderMap.get(b.key) ?? Infinity) : Infinity
      return ai - bi
    })
    return ordered
  }

  // ── Custom Sections ──────────────────────────────────────────

  const getCustomSections = (routePath: string): SidebarCustomSection[] => {
    return config.value.customSections.filter((s) => s.routePath === routePath)
  }

  const createSection = (routePath: string, label: string, icon?: string): string => {
    const key = `custom-section-${crypto.randomUUID().slice(0, 8)}`
    const maxOrder = Math.max(
      0,
      ...config.value.customSections
        .filter((s) => s.routePath === routePath)
        .map((s) => s.order),
    )
    config.value.customSections.push({
      key,
      label,
      icon: icon || 'lucide:folder',
      routePath,
      items: [],
      order: maxOrder + 1,
    })
    _persist()
    return key
  }

  const deleteSection = (key: string) => {
    config.value.customSections = config.value.customSections.filter((s) => s.key !== key)
    // Also clean up any item order for this section
    const { [key]: _removed, ...rest } = config.value.itemOrder
    config.value.itemOrder = rest
    _persist()
  }

  const renameSection = (key: string, label: string) => {
    const section = config.value.customSections.find((s) => s.key === key)
    if (section) {
      section.label = label
      _persist()
    }
  }

  const updateSectionIcon = (key: string, icon: string) => {
    const section = config.value.customSections.find((s) => s.key === key)
    if (section) {
      section.icon = icon
      _persist()
    }
  }

  // ── Reset ────────────────────────────────────────────────────

  const resetSection = (sectionKey: string) => {
    const { [sectionKey]: _removed, ...rest } = config.value.itemOrder
    config.value.itemOrder = rest
    _persist()
  }

  const resetRoute = (routePath: string) => {
    const { [routePath]: _removed, ...rest } = config.value.sectionOrder
    config.value.sectionOrder = rest
    config.value.customSections = config.value.customSections.filter((s) => s.routePath !== routePath)
    _persist()
  }

  const resetAll = () => {
    config.value = defaultConfig()
    _persist()
  }

  return {
    config: readonly(config),
    isLoaded: readonly(isLoaded),

    // Item order
    getItemOrder,
    setItemOrder,
    applyItemOrder,

    // Section order
    getSectionOrder,
    setSectionOrder,
    applySectionOrder,

    // Custom sections
    getCustomSections,
    createSection,
    deleteSection,
    renameSection,
    updateSectionIcon,

    // Reset
    resetSection,
    resetRoute,
    resetAll,
  }
}
