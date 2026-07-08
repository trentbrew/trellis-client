/**
 * useEntitySummary — AI-generated descriptions for entities.
 *
 * Takes an entity's raw `description` (often noisy HTML from GCal/Gmail
 * imports) or `content` (for note/page document types) and produces a clean
 * 1–3 sentence `summary` persisted back onto the entity.
 *
 * Usage:
 *   const { ensure, regenerate, generating } = useEntitySummary()
 *   watch(() => item.value.id, () => ensure(item.value), { immediate: true })
 *
 * Entity fields written:
 *   - summary: string                 — the AI-generated summary
 *   - summaryGeneratedAt: string      — ISO timestamp of last generation
 *   - summarySourceHash: string       — hash of the source text used
 */

import type { EntityType } from '~/types/entity'
import { isDocumentChromeType } from '~/lib/document-chrome'
import { stripHtml } from '~/utils/stripHtml'
import { bumpGraphVersion } from '~/composables/useTrellisGraph'

export interface EntityLike {
  id: string
  type?: EntityType | string
  title?: string
  description?: string
  content?: string
  summary?: string
  summaryGeneratedAt?: string
  summarySourceHash?: string
  [key: string]: any
}

// djb2 — tiny non-crypto hash for change detection.
function hashText(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

// Skip summarization for content this short — the raw text is already concise.
export const MIN_SUMMARY_SOURCE_LENGTH = 120

export function resolveSummarySource(entity: EntityLike): 'content' | 'description' {
  return isDocumentChromeType(entity.type) ? 'content' : 'description'
}

export function resolveSummaryText(entity: EntityLike): string {
  const field = resolveSummarySource(entity) === 'content' ? entity.content : entity.description
  return stripHtml(field).trim()
}

export function useEntitySummary() {
  const { update } = useEntities()

  const generating = ref<Set<string>>(new Set())
  const lastError = ref<string | null>(null)

  function isGenerating(entityId: string): boolean {
    return generating.value.has(entityId)
  }

  async function fetchSummary(text: string, type?: string, title?: string): Promise<string> {
    const data = await $fetch<{ summary: string }>('/api/summarize-entity-llm', {
      method: 'POST',
      body: { text, type, title },
    })
    return (data?.summary || '').trim()
  }

  /**
   * Generate + persist a summary. Always runs, ignoring cache.
   */
  async function regenerate(entity: EntityLike): Promise<boolean> {
    const source = resolveSummaryText(entity)
    if (!entity.id || !source || source.length < MIN_SUMMARY_SOURCE_LENGTH) return false
    if (generating.value.has(entity.id)) return false

    generating.value = new Set([...generating.value, entity.id])
    lastError.value = null

    try {
      const summary = await fetchSummary(source, entity.type as string, entity.title)
      if (!summary) return false

      const patch = {
        ...entity,
        summary,
        summaryGeneratedAt: new Date().toISOString(),
        summarySourceHash: hashText(source),
      }
      await update(patch as any)
      bumpGraphVersion()
      return true
    } catch (err: any) {
      lastError.value = err?.data?.message || err?.message || 'Summary failed'
      return false
    } finally {
      const next = new Set(generating.value)
      next.delete(entity.id)
      generating.value = next
    }
  }

  /**
   * Ensure a fresh summary exists. No-op if cached for current source text.
   */
  async function ensure(entity: EntityLike): Promise<boolean> {
    const source = resolveSummaryText(entity)
    if (!entity.id || !source || source.length < MIN_SUMMARY_SOURCE_LENGTH) return false

    const currentHash = hashText(source)
    if (entity.summary && entity.summarySourceHash === currentHash) {
      return false
    }

    return regenerate(entity)
  }

  async function clear(entity: EntityLike): Promise<void> {
    if (!entity.id) return
    await update({
      ...entity,
      summary: '',
      summaryGeneratedAt: '',
      summarySourceHash: '',
    } as any)
  }

  return {
    generating,
    isGenerating,
    lastError,
    ensure,
    regenerate,
    clear,
    fetchSummary,
  }
}
