import type { Entity } from '~/types/entity'
import { resolveFileCategory } from '~/lib/file-card-view-profiles'
import {
  FILE_CATEGORY_META,
  type FileCategory,
} from '~/utils/fileClassification'

export type FileBrowseCategory = FileCategory | 'all'

export interface FileBrowseFacet {
  id: FileBrowseCategory
  label: string
  labelPlural: string
  icon: string
  color: string
}

const FILE_CATEGORY_ORDER: FileCategory[] = [
  'image',
  'video',
  'document',
  'presentation',
  'audio',
  'spreadsheet',
  'code',
  'archive',
  'other',
]

const ALL_FACET: FileBrowseFacet = {
  id: 'all',
  label: 'All',
  labelPlural: 'Files',
  icon: 'lucide:files',
  color: 'slate',
}

function facetFromCategory(category: FileCategory): FileBrowseFacet {
  const meta = FILE_CATEGORY_META[category]
  return {
    id: category,
    label: meta.label,
    labelPlural: category === 'other' ? 'Files' : `${meta.label}s`,
    icon: meta.icon,
    color: meta.color,
  }
}

/** Toolbar facet pills — All first, then primary categories. */
export const FILE_BROWSE_FACETS: FileBrowseFacet[] = [
  ALL_FACET,
  ...FILE_CATEGORY_ORDER.map(facetFromCategory),
]

const VALID_CATEGORIES = new Set<FileCategory>(Object.keys(FILE_CATEGORY_META) as FileCategory[])

export function isValidFileCategoryParam(raw: string): raw is FileCategory {
  return VALID_CATEGORIES.has(raw as FileCategory)
}

export function parseFileCategoryParam(raw: string | null | undefined): FileBrowseCategory {
  if (!raw || raw === 'all') return 'all'
  return isValidFileCategoryParam(raw) ? raw : 'all'
}

export function getFileBrowseFacet(id: FileBrowseCategory): FileBrowseFacet | undefined {
  return FILE_BROWSE_FACETS.find((f) => f.id === id)
}

export function fileMatchesBrowseCategory(
  item: Record<string, unknown>,
  category: FileBrowseCategory,
): boolean {
  if (category === 'all') return true
  return resolveFileCategory(item) === category
}

/** Count file entities per facet (pre-category-filter). */
export function countFilesByCategory(
  items: Entity[],
): Partial<Record<FileBrowseCategory, number>> {
  const counts: Partial<Record<FileBrowseCategory, number>> = { all: 0 }
  for (const item of items) {
    if (item.type !== 'file') continue
    counts.all = (counts.all ?? 0) + 1
    const cat = resolveFileCategory(item as Record<string, unknown>)
    counts[cat] = (counts[cat] ?? 0) + 1
  }
  return counts
}

/** True when `category` query should be stripped (invalid while on file browse). */
export function shouldStripFileCategoryParam(
  typeParam: string,
  rawCategory: string | undefined,
): boolean {
  if (typeParam !== 'file') return !!rawCategory
  if (!rawCategory || rawCategory === 'all') return false
  return parseFileCategoryParam(rawCategory) === 'all'
}
