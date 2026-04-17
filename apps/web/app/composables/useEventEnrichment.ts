/**
 * useEventEnrichment — thin wrapper around useContentEnrichment for calendar events.
 *
 * Mirrors useEmailEnrichment but targets the 'event' kind, so prompts and
 * cache keys are segregated from email enrichment.
 */

import {
  useContentEnrichment,
  type ContentEntityCandidate,
  type EnrichmentSuggestion as GenericSuggestion,
} from '~/composables/useContentEnrichment'

export type EventEntityCandidate = ContentEntityCandidate
export type EnrichmentSuggestion = GenericSuggestion

export function useEventEnrichment() {
  const enrichment = useContentEnrichment({
    kind: 'event',
    sourceEntityType: 'event',
  })

  /**
   * Prefer a stable id that survives across fetches:
   *   googleEventId → id
   */
  function resolveCacheKey(eventEntity: any): string {
    return eventEntity?.googleEventId || eventEntity?.id || ''
  }

  /**
   * Build the text to analyze from an event entity. We concatenate the
   * fields an attendee would read: title, description, location, attendees.
   */
  function buildTextFromEvent(eventEntity: any): string {
    const parts: string[] = []
    if (eventEntity?.title) parts.push(`Title: ${eventEntity.title}`)
    if (eventEntity?.description) parts.push(`Description: ${eventEntity.description}`)
    if (eventEntity?.location) parts.push(`Location: ${eventEntity.location}`)
    if (Array.isArray(eventEntity?.attendees) && eventEntity.attendees.length) {
      parts.push(`Attendees: ${eventEntity.attendees.join(', ')}`)
    }
    if (eventEntity?.startDate) parts.push(`Starts: ${eventEntity.startDate}`)
    if (eventEntity?.endDate) parts.push(`Ends: ${eventEntity.endDate}`)
    return parts.join('\n')
  }

  /**
   * Run extraction for a calendar event entity.
   */
  async function extractFromEvent(eventEntity: any) {
    const text = buildTextFromEvent(eventEntity)
    const key = resolveCacheKey(eventEntity)
    if (!key) return
    return enrichment.extract(text, key, eventEntity?.tags)
  }

  async function accept(suggestion: EnrichmentSuggestion, eventEntity: any) {
    return enrichment.accept(suggestion, eventEntity, resolveCacheKey(eventEntity))
  }

  return {
    suggestions: enrichment.suggestions,
    suggestedTags: enrichment.suggestedTags,
    scanning: enrichment.scanning,
    error: enrichment.error,
    hasSuggestions: enrichment.hasSuggestions,
    extractFromEvent,
    accept,
    dismiss: enrichment.dismiss,
    acceptTag: enrichment.acceptTag,
    dismissTag: enrichment.dismissTag,
  }
}
