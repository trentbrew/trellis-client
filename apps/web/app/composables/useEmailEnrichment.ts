/**
 * useEmailEnrichment — thin wrapper around useContentEnrichment for Gmail threads.
 *
 * Kept as a standalone composable for API stability — callers (EmailContent.vue)
 * keep using the same names while the actual logic lives in useContentEnrichment.
 */

import {
  useContentEnrichment,
  type ContentEntityCandidate,
} from '~/composables/useContentEnrichment'
import type { EnrichmentSuggestion } from '~/types/enrichment'

// Back-compat re-exports (EmailContent.vue imports these by name).
export type EmailEntityCandidate = ContentEntityCandidate

export function useEmailEnrichment() {
  const enrichment = useContentEnrichment({
    kind: 'email',
    sourceEntityType: 'email',
  })

  /**
   * Run extraction for a Gmail thread.
   * @param text email body text or html
   * @param threadId gmailThreadId (cache key)
   * @param existingTags tags already on the email entity
   */
  async function extract(text: string, threadId: string, existingTags?: string[]) {
    return enrichment.extract(text, threadId, existingTags)
  }

  /**
   * Accept a suggestion against an email entity.
   * Passes the email's gmailThreadId so the cache reflects the removal.
   */
  async function accept(suggestion: EnrichmentSuggestion, emailEntity: any) {
    return enrichment.accept(suggestion, emailEntity, emailEntity?.gmailThreadId)
  }

  return {
    suggestions: enrichment.suggestions,
    suggestedTags: enrichment.suggestedTags,
    scanning: enrichment.scanning,
    error: enrichment.error,
    hasSuggestions: enrichment.hasSuggestions,
    extract,
    accept,
    dismiss: enrichment.dismiss,
    acceptTag: enrichment.acceptTag,
    dismissTag: enrichment.dismissTag,
  }
}
