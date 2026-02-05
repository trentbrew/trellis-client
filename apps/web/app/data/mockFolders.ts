/**
 * Mock Folders Dataset
 * Shared between UnifiedTaskDialog folder selector and FoldersView
 * Structure matches ecms EcmsFolder interface shape
 */

export interface MockFolder {
  folderID: `folder_${string}`
  name: string
  parentFolderIDs: `folder_${string}`[]
  icon?: string
  color?: string
}

// Flat folder list (similar to how ecms stores folders in Firestore)
export const mockFolders: MockFolder[] = [
  // Root folders
  {
    folderID: 'folder_compliance',
    name: 'Compliance',
    parentFolderIDs: [],
    icon: 'lucide:shield-check',
    color: 'text-blue-500',
  },
  { folderID: 'folder_safety', name: 'Safety', parentFolderIDs: [], icon: 'lucide:shield', color: 'text-emerald-500' },
  {
    folderID: 'folder_permits',
    name: 'Permits',
    parentFolderIDs: [],
    icon: 'lucide:file-badge',
    color: 'text-purple-500',
  },
  {
    folderID: 'folder_training',
    name: 'Training',
    parentFolderIDs: [],
    icon: 'lucide:graduation-cap',
    color: 'text-indigo-500',
  },
  {
    folderID: 'folder_inspections',
    name: 'Inspections',
    parentFolderIDs: [],
    icon: 'lucide:clipboard-check',
    color: 'text-rose-500',
  },
  {
    folderID: 'folder_reports',
    name: 'Reports',
    parentFolderIDs: [],
    icon: 'lucide:file-bar-chart',
    color: 'text-orange-500',
  },

  // Compliance > Air Quality (Level 2)
  {
    folderID: 'folder_air-quality',
    name: 'Air Quality',
    parentFolderIDs: ['folder_compliance'],
    icon: 'lucide:wind',
    color: 'text-sky-500',
  },
  {
    folderID: 'folder_water',
    name: 'Water',
    parentFolderIDs: ['folder_compliance'],
    icon: 'lucide:droplets',
    color: 'text-cyan-500',
  },
  {
    folderID: 'folder_waste',
    name: 'Waste',
    parentFolderIDs: ['folder_compliance'],
    icon: 'lucide:trash-2',
    color: 'text-amber-500',
  },
  {
    folderID: 'folder_epcra',
    name: 'EPCRA',
    parentFolderIDs: ['folder_compliance'],
    icon: 'lucide:alert-triangle',
    color: 'text-yellow-500',
  },

  // Compliance > Air Quality > Emissions (Level 3)
  {
    folderID: 'folder_emissions',
    name: 'Emissions',
    parentFolderIDs: ['folder_compliance', 'folder_air-quality'],
    icon: 'lucide:cloud',
    color: 'text-gray-500',
  },
  {
    folderID: 'folder_stack-testing',
    name: 'Stack Testing',
    parentFolderIDs: ['folder_compliance', 'folder_air-quality'],
    icon: 'lucide:flask-conical',
    color: 'text-violet-500',
  },
  {
    folderID: 'folder_cems',
    name: 'CEMS',
    parentFolderIDs: ['folder_compliance', 'folder_air-quality'],
    icon: 'lucide:gauge',
    color: 'text-teal-500',
  },

  // Compliance > Air Quality > Emissions > Monthly Reports (Level 4)
  {
    folderID: 'folder_monthly-emissions',
    name: 'Monthly Reports',
    parentFolderIDs: ['folder_compliance', 'folder_air-quality', 'folder_emissions'],
    icon: 'lucide:calendar',
    color: 'text-blue-400',
  },
  {
    folderID: 'folder_annual-emissions',
    name: 'Annual Reports',
    parentFolderIDs: ['folder_compliance', 'folder_air-quality', 'folder_emissions'],
    icon: 'lucide:calendar-range',
    color: 'text-blue-600',
  },

  // Compliance > Water (Level 3)
  {
    folderID: 'folder_stormwater',
    name: 'Stormwater',
    parentFolderIDs: ['folder_compliance', 'folder_water'],
    icon: 'lucide:cloud-rain',
    color: 'text-blue-400',
  },
  {
    folderID: 'folder_npdes',
    name: 'NPDES',
    parentFolderIDs: ['folder_compliance', 'folder_water'],
    icon: 'lucide:file-check',
    color: 'text-cyan-600',
  },
  {
    folderID: 'folder_groundwater',
    name: 'Groundwater',
    parentFolderIDs: ['folder_compliance', 'folder_water'],
    icon: 'lucide:layers',
    color: 'text-blue-700',
  },

  // Compliance > Waste (Level 3)
  {
    folderID: 'folder_hazardous',
    name: 'Hazardous Waste',
    parentFolderIDs: ['folder_compliance', 'folder_waste'],
    icon: 'lucide:biohazard',
    color: 'text-red-500',
  },
  {
    folderID: 'folder_manifests',
    name: 'Manifests',
    parentFolderIDs: ['folder_compliance', 'folder_waste'],
    icon: 'lucide:file-stack',
    color: 'text-amber-600',
  },
  {
    folderID: 'folder_recycling',
    name: 'Recycling',
    parentFolderIDs: ['folder_compliance', 'folder_waste'],
    icon: 'lucide:recycle',
    color: 'text-green-500',
  },

  // Safety (Level 2)
  {
    folderID: 'folder_fire-safety',
    name: 'Fire Safety',
    parentFolderIDs: ['folder_safety'],
    icon: 'lucide:flame',
    color: 'text-red-500',
  },
  {
    folderID: 'folder_emergency',
    name: 'Emergency Response',
    parentFolderIDs: ['folder_safety'],
    icon: 'lucide:siren',
    color: 'text-rose-600',
  },
  {
    folderID: 'folder_ppe',
    name: 'PPE',
    parentFolderIDs: ['folder_safety'],
    icon: 'lucide:hard-hat',
    color: 'text-yellow-600',
  },
  {
    folderID: 'folder_lockout-tagout',
    name: 'Lockout/Tagout',
    parentFolderIDs: ['folder_safety'],
    icon: 'lucide:lock',
    color: 'text-orange-600',
  },
  {
    folderID: 'folder_industrial-hygiene',
    name: 'Industrial Hygiene',
    parentFolderIDs: ['folder_safety'],
    icon: 'lucide:heart-pulse',
    color: 'text-pink-500',
  },

  // Safety > Fire Safety (Level 3)
  {
    folderID: 'folder_extinguishers',
    name: 'Fire Extinguishers',
    parentFolderIDs: ['folder_safety', 'folder_fire-safety'],
    icon: 'lucide:fire-extinguisher',
    color: 'text-red-400',
  },
  {
    folderID: 'folder_sprinklers',
    name: 'Sprinkler Systems',
    parentFolderIDs: ['folder_safety', 'folder_fire-safety'],
    icon: 'lucide:droplet',
    color: 'text-blue-500',
  },
  {
    folderID: 'folder_evacuation',
    name: 'Evacuation Plans',
    parentFolderIDs: ['folder_safety', 'folder_fire-safety'],
    icon: 'lucide:door-open',
    color: 'text-green-500',
  },

  // Permits (Level 2)
  {
    folderID: 'folder_air-permits',
    name: 'Air Permits',
    parentFolderIDs: ['folder_permits'],
    icon: 'lucide:wind',
    color: 'text-sky-500',
  },
  {
    folderID: 'folder_water-permits',
    name: 'Water Permits',
    parentFolderIDs: ['folder_permits'],
    icon: 'lucide:droplets',
    color: 'text-cyan-500',
  },
  {
    folderID: 'folder_waste-permits',
    name: 'Waste Permits',
    parentFolderIDs: ['folder_permits'],
    icon: 'lucide:trash-2',
    color: 'text-amber-500',
  },
  {
    folderID: 'folder_spcc',
    name: 'SPCC',
    parentFolderIDs: ['folder_permits'],
    icon: 'lucide:fuel',
    color: 'text-orange-500',
  },

  // Permits > Air Permits (Level 3)
  {
    folderID: 'folder_title-v',
    name: 'Title V',
    parentFolderIDs: ['folder_permits', 'folder_air-permits'],
    icon: 'lucide:file-badge-2',
    color: 'text-purple-500',
  },
  {
    folderID: 'folder_minor-source',
    name: 'Minor Source',
    parentFolderIDs: ['folder_permits', 'folder_air-permits'],
    icon: 'lucide:file',
    color: 'text-gray-500',
  },

  // Training (Level 2)
  {
    folderID: 'folder_hazwoper',
    name: 'HAZWOPER',
    parentFolderIDs: ['folder_training'],
    icon: 'lucide:biohazard',
    color: 'text-red-500',
  },
  {
    folderID: 'folder_osha',
    name: 'OSHA Required',
    parentFolderIDs: ['folder_training'],
    icon: 'lucide:shield-check',
    color: 'text-blue-500',
  },
  {
    folderID: 'folder_onboarding',
    name: 'Onboarding',
    parentFolderIDs: ['folder_training'],
    icon: 'lucide:user-plus',
    color: 'text-green-500',
  },

  // Inspections (Level 2)
  {
    folderID: 'folder_equipment-inspections',
    name: 'Equipment',
    parentFolderIDs: ['folder_inspections'],
    icon: 'lucide:settings',
    color: 'text-gray-500',
  },
  {
    folderID: 'folder_tank-inspections',
    name: 'Tanks',
    parentFolderIDs: ['folder_inspections'],
    icon: 'lucide:cylinder',
    color: 'text-slate-500',
  },
  {
    folderID: 'folder_regulatory-inspections',
    name: 'Regulatory',
    parentFolderIDs: ['folder_inspections'],
    icon: 'lucide:building-2',
    color: 'text-blue-600',
  },

  // Reports (Level 2)
  {
    folderID: 'folder_monthly-reports',
    name: 'Monthly',
    parentFolderIDs: ['folder_reports'],
    icon: 'lucide:calendar',
    color: 'text-blue-500',
  },
  {
    folderID: 'folder_quarterly-reports',
    name: 'Quarterly',
    parentFolderIDs: ['folder_reports'],
    icon: 'lucide:calendar-days',
    color: 'text-green-500',
  },
  {
    folderID: 'folder_annual-reports',
    name: 'Annual',
    parentFolderIDs: ['folder_reports'],
    icon: 'lucide:calendar-range',
    color: 'text-purple-500',
  },
]

// Tree node interface for UI rendering
export interface FolderTreeNode extends MockFolder {
  children?: FolderTreeNode[]
}

/**
 * Build a tree structure from the flat folder list
 */
export function buildFolderTree(folders: MockFolder[] = mockFolders): FolderTreeNode[] {
  const folderMap = new Map<string, FolderTreeNode>()

  // Create nodes with empty children arrays
  folders.forEach((f) => {
    folderMap.set(f.folderID, { ...f, children: [] })
  })

  // Build tree by connecting parents and children
  const roots: FolderTreeNode[] = []
  folders.forEach((f) => {
    const node = folderMap.get(f.folderID)!
    if (f.parentFolderIDs.length === 0) {
      roots.push(node)
    } else {
      // Get immediate parent (last in the parentFolderIDs array)
      const parentId = f.parentFolderIDs[f.parentFolderIDs.length - 1]
      const parent = folderMap.get(parentId!)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(node)
      }
    }
  })

  return roots
}

/**
 * Get the depth/level of a folder in the tree
 */
export function getFolderDepth(folder: MockFolder): number {
  return folder.parentFolderIDs.length
}

/**
 * Get all ancestor folder IDs for a given folder
 */
export function getAncestorIds(folder: MockFolder): string[] {
  return [...folder.parentFolderIDs]
}

/**
 * Find a folder by ID
 */
export function findFolderById(folderId: string, folders: MockFolder[] = mockFolders): MockFolder | undefined {
  return folders.find((f) => f.folderID === folderId)
}

/**
 * Get the full path name for a folder (e.g., "Compliance > Air Quality > Emissions")
 */
export function getFolderPath(folderId: string, folders: MockFolder[] = mockFolders): string {
  const folder = findFolderById(folderId, folders)
  if (!folder) return ''

  const pathNames: string[] = []
  folder.parentFolderIDs.forEach((parentId) => {
    const parent = findFolderById(parentId, folders)
    if (parent) pathNames.push(parent.name)
  })
  pathNames.push(folder.name)

  return pathNames.join(' > ')
}
