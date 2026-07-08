import type { FileCategory } from '~/utils/fileClassification'
import { classifyFile } from '~/utils/fileClassification'

/** Internal / sidebar fields — hidden from card face by default. */
export const FILE_CARD_TECHNICAL_KEYS = new Set([
  'mimeType',
  'url',
  'storagePath',
  'content',
  'pinned',
  'involved',
  'owner',
  'createdAt',
  'updatedAt',
])

/** Enrichment keys shown only for matching file categories. */
export const FILE_CATEGORY_FIELD_KEYS: Partial<Record<FileCategory, readonly string[]>> = {
  image: ['imageWidth', 'imageHeight', 'altText', 'fileExtension'],
  video: ['videoDuration', 'videoWidth', 'videoHeight', 'fileExtension'],
  audio: ['audioDuration', 'artist', 'album', 'genre', 'fileExtension'],
  document: ['pageCount', 'wordCount', 'documentAuthor', 'fileExtension'],
  spreadsheet: ['sheetCount', 'rowCount', 'fileExtension'],
  presentation: ['pageCount', 'fileExtension'],
  code: ['codeLanguage', 'lineCount', 'fileExtension'],
  archive: ['archiveEntryCount', 'uncompressedSize', 'fileExtension'],
  font: ['fileExtension'],
  model: ['fileExtension'],
  data: ['fileExtension'],
  other: ['fileExtension'],
}

const FILE_CATEGORY_KEY_INDEX: Record<string, Set<FileCategory>> = {}
for (const [category, keys] of Object.entries(FILE_CATEGORY_FIELD_KEYS) as [FileCategory, readonly string[]][]) {
  for (const key of keys) {
    if (!FILE_CATEGORY_KEY_INDEX[key]) FILE_CATEGORY_KEY_INDEX[key] = new Set()
    FILE_CATEGORY_KEY_INDEX[key]!.add(category)
  }
}

/** Browse Properties popover defaults for `type=file`. */
export const FILE_BROWSE_DEFAULT_VISIBLE = ['description', 'tags'] as const

export function resolveFileCategory(item: Record<string, unknown>): FileCategory {
  const stored = item.fileCategory
  if (typeof stored === 'string' && stored) return stored as FileCategory
  return classifyFile(
    typeof item.mimeType === 'string' ? item.mimeType : undefined,
    typeof item.title === 'string' ? item.title : undefined,
  )
}

export function isFileFieldRelevantForCategory(key: string, category: FileCategory): boolean {
  const allowed = FILE_CATEGORY_KEY_INDEX[key]
  if (!allowed) return true
  return allowed.has(category)
}

/**
 * Default visible keys for file browse (toolbar popover).
 * Human-facing fields only — technical columns stay off until user enables them.
 */
export function getFileBrowseDefaultVisibleKeys(catalogKeys: Iterable<string>): string[] {
  const allowed = new Set(catalogKeys)
  const picked = FILE_BROWSE_DEFAULT_VISIBLE.filter((k) => allowed.has(k))
  return picked.length ? [...picked] : [...allowed]
}

/**
 * Filter global visible keys for a single file card face.
 * - Drops technical keys unless explicitly forced via `includeTechnical`
 * - Drops category-specific enrichment when it doesn't apply
 */
export function filterFileCardVisibleKeys(
  visibleKeys: string[],
  item: Record<string, unknown>,
  options?: { includeTechnical?: boolean },
): string[] {
  const category = resolveFileCategory(item)
  return visibleKeys.filter((key) => {
    if (!options?.includeTechnical && FILE_CARD_TECHNICAL_KEYS.has(key)) return false
    return isFileFieldRelevantForCategory(key, category)
  })
}

export interface FileCategoryBadge {
  key: string
  label: string
  value: string
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm ? `${h}h ${rm}m` : `${h}h`
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/** Compact inline badges for grid file card footer (category-aware). */
export function getFileCategoryBadges(item: Record<string, unknown>): FileCategoryBadge[] {
  const category = resolveFileCategory(item)
  const badges: FileCategoryBadge[] = []

  const push = (key: string, label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return
    badges.push({ key, label, value: String(value) })
  }

  switch (category) {
    case 'image': {
      const w = item.imageWidth
      const h = item.imageHeight
      if (w && h) push('dimensions', 'Size', `${w}×${h}`)
      break
    }
    case 'video': {
      if (item.videoDuration) push('videoDuration', 'Duration', formatDuration(Number(item.videoDuration)))
      const w = item.videoWidth
      const h = item.videoHeight
      if (w && h) push('dimensions', 'Res', `${w}×${h}`)
      break
    }
    case 'audio': {
      if (item.audioDuration) push('audioDuration', 'Duration', formatDuration(Number(item.audioDuration)))
      if (item.artist) push('artist', 'Artist', item.artist)
      break
    }
    case 'document':
    case 'presentation': {
      if (item.pageCount) push('pageCount', 'Pages', `${item.pageCount}`)
      if (item.documentAuthor) push('documentAuthor', 'Author', item.documentAuthor)
      break
    }
    case 'spreadsheet': {
      if (item.sheetCount) push('sheetCount', 'Sheets', `${item.sheetCount}`)
      if (item.rowCount) push('rowCount', 'Rows', `${item.rowCount}`)
      break
    }
    case 'code': {
      if (item.codeLanguage) push('codeLanguage', 'Lang', item.codeLanguage)
      if (item.lineCount) push('lineCount', 'Lines', `${item.lineCount}`)
      break
    }
    case 'archive': {
      if (item.archiveEntryCount) push('archiveEntryCount', 'Entries', `${item.archiveEntryCount}`)
      break
    }
    default:
      break
  }

  if (item.fileExtension) {
    push('fileExtension', 'Type', String(item.fileExtension).toUpperCase())
  } else if (item.mimeType) {
    const mime = String(item.mimeType)
    const short = mime.split('/').pop()
    if (short) push('mimeType', 'Type', short.toUpperCase())
  }

  if (item.sizeBytes) {
    push('sizeBytes', 'Size', formatBytes(Number(item.sizeBytes)))
  }

  if (item.category) {
    push('category', 'Category', item.category)
  }

  return badges
}

/** True when saved file layout looks like pre-profile noisy defaults. */
export function shouldMigrateFileCardLayout(visible: string[] | undefined): boolean {
  if (!visible?.length) return false
  const noisy = ['mimeType', 'url', 'storagePath', 'sizeBytes', 'owner', 'createdAt', 'updatedAt']
  const noisyCount = noisy.filter((k) => visible.includes(k)).length
  return noisyCount >= 2 || visible.length > 5
}
