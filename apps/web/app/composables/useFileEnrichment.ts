/**
 * useFileEnrichment — Gemini-powered semantic enrichment for file entities.
 *
 * Fetches the file's content (for text-based types), sends it to
 * /api/enrich-file-llm along with metadata, and patches the entity with
 * the AI-generated fields (name, description, tags, etc.).
 *
 * Usage:
 *   const { enrich, enriching, lastError } = useFileEnrichment()
 *   await enrich(entityId, fileItem)
 *
 * Only overwrites empty fields — never clobbers user-authored content.
 */

import type { FileItem, FileCategory } from '~/types/entity'

const TEXT_CATEGORIES: Set<string> = new Set(['code', 'data', 'document'])

export interface FileEnrichmentResult {
  name?: string
  description?: string
  aiTags?: string[]
  altText?: string
  artist?: string
  album?: string
  genre?: string
  codeLanguage?: string
  documentAuthor?: string
}

export function useFileEnrichment() {
  const { items, update } = useEntities()
  const enriching = ref<Set<string>>(new Set())
  const lastError = ref<string | null>(null)

  function isEnriching(entityId: string) {
    return enriching.value.has(entityId)
  }

  /**
   * Fetch enrichment suggestions from Gemini without committing them.
   * Returns the raw result so callers can review before applying.
   */
  async function fetchEnrichment(fileItem: Partial<FileItem>): Promise<FileEnrichmentResult> {
    let contentPreview: string | undefined

    // For text-based files, fetch first 2000 chars for better context
    if (fileItem.url && TEXT_CATEGORIES.has(fileItem.fileCategory || '')) {
      try {
        const res = await fetch(fileItem.url)
        if (res.ok) {
          const text = await res.text()
          contentPreview = text.slice(0, 2000)
        }
      } catch {
        // Non-fatal — proceed without content preview
      }
    }

    const result = await $fetch<FileEnrichmentResult>('/api/enrich-file-llm', {
      method: 'POST',
      body: {
        filename: fileItem.title || fileItem.fileExtension || 'file',
        fileCategory: fileItem.fileCategory,
        fileExtension: fileItem.fileExtension,
        mimeType: fileItem.mimeType,
        sizeBytes: fileItem.sizeBytes,
        contentPreview,
      },
    })

    return result ?? {}
  }

  /**
   * Run enrichment and patch the entity.
   * Only writes into fields that are currently empty.
   * Fire-and-forget safe — errors set lastError, never throw.
   */
  async function enrich(entityId: string, fileItem?: Partial<FileItem>): Promise<boolean> {
    if (enriching.value.has(entityId)) return false

    const snapshot: any = items.value.find((e: any) => e.id === entityId) || fileItem || {}

    enriching.value = new Set([...enriching.value, entityId])
    lastError.value = null

    try {
      const enriched = await fetchEnrichment(snapshot)
      const patch: Record<string, any> = {}

      // Map enrichment result keys → FileItem fields
      const fieldMap: Record<string, string> = {
        name: 'title',
        description: 'description',
        altText: 'altText',
        artist: 'artist',
        album: 'album',
        genre: 'genre',
        codeLanguage: 'codeLanguage',
        documentAuthor: 'documentAuthor',
      }

      for (const [enrichKey, entityKey] of Object.entries(fieldMap)) {
        const val = (enriched as any)[enrichKey]
        if (!val) continue
        const current = snapshot[entityKey]
        const isEmpty = current === undefined || current === null || (typeof current === 'string' && current.trim() === '')
        if (isEmpty) patch[entityKey] = val
      }

      // Tags — merge, de-dupe
      if (enriched.aiTags?.length) {
        const existing = Array.isArray(snapshot.aiTags) ? snapshot.aiTags : []
        const merged = Array.from(new Set([...existing, ...enriched.aiTags]))
        if (merged.length !== existing.length) patch.aiTags = merged
      }

      if (Object.keys(patch).length === 0) return false

      const latest: any = items.value.find((e: any) => e.id === entityId) || snapshot
      await update({ ...latest, ...patch })
      return true
    } catch (err: any) {
      lastError.value = err?.data?.message || err?.message || 'File enrichment failed'
      return false
    } finally {
      const next = new Set(enriching.value)
      next.delete(entityId)
      enriching.value = next
    }
  }

  return { enrich, fetchEnrichment, enriching, isEnriching, lastError }
}
