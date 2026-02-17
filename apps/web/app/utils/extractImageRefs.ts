import type { FileReference } from '~/types/entity'

/**
 * Parse TipTap HTML content and extract inline image references.
 *
 * Looks for `<img>` tags and extracts their `src`, `data-file-id`,
 * and `alt` attributes to build `FileReference` objects.
 *
 * Mirrors the `extractMentionRefs` pattern for mentions.
 */
export function extractImageRefs(html: string): FileReference[] {
  if (!html || typeof window === 'undefined') return []

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const images = doc.querySelectorAll('img[src]')

  const refs: FileReference[] = []
  const seen = new Set<string>()

  images.forEach((el) => {
    const src = el.getAttribute('src')
    if (!src) return

    const fileId = el.getAttribute('data-file-id')
    const alt = el.getAttribute('alt') || ''

    // Skip upload-in-progress placeholders
    if (alt.startsWith('__uploading__')) return

    // Deduplicate by file ID or src URL
    const dedupeKey = fileId || src
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)

    // Derive a display name from alt text, filename, or fallback
    const name = alt || extractFilenameFromUrl(src) || 'Image'

    refs.push({
      kind: 'file',
      id: `img-${fileId || hashString(src)}`,
      name,
      fileType: 'image',
      url: src,
    })
  })

  return refs
}

/** Extract filename from a URL path, stripping query params. */
function extractFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url, 'https://placeholder').pathname
    const segments = pathname.split('/')
    return segments[segments.length - 1] || ''
  } catch {
    return ''
  }
}

/** Simple string hash for generating stable IDs from URLs. */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0 // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}
