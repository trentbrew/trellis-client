<script lang="ts" setup>
  /**
   * EntityAISuggestionsPanel — shared AI entity/tag suggestions panel.
   *
   * Auto-detects the correct enrichment kind from the source entity's type
   * and builds the extraction text from the relevant fields. Mounts in the
   * right sidebar of EntityDialog, sitting at the bottom of the References tab.
   */
  import type { EntityType } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { useContentEnrichment, type ContentKind, type EnrichmentSuggestion } from '~/composables/useContentEnrichment'
  import { useActiveVideoPlayer } from '~/composables/useActiveVideoPlayer'
  import { parseChapters, parseTranscript } from '~/composables/useYoutubeTranscript'

  const props = defineProps<{
    entity: any
  }>()

  // Cross-tree handle to whichever video player is mounted — lets us jump
  // the player from a timestamp badge click without prop drilling.
  const { seek: seekActivePlayer } = useActiveVideoPlayer()

  /** Map entity.type + shape → enrichment kind + source entity type. */
  function resolveKind(entity: any): {
    kind: ContentKind
    sourceType: EntityType
  } {
    const entityType = entity?.type
    if (entityType === 'email') return { kind: 'email', sourceType: 'email' }
    if (entityType === 'event' || entityType === 'appointment' || entityType === 'trip') {
      return { kind: 'event', sourceType: (entityType as EntityType) || 'event' }
    }
    // Bookmarks that point at a video with an actual transcript are treated as video.
    if (entityType === 'bookmark' && parseTranscript(entity).length > 0) {
      return { kind: 'video', sourceType: 'bookmark' as EntityType }
    }
    return { kind: 'generic', sourceType: (entityType as EntityType) || 'entity' }
  }

  const resolved = computed(() => resolveKind(props.entity))

  // Note: we intentionally instantiate the composable once — kind/sourceType
  // are essentially static for an open dialog (entity.type doesn't change).
  const {
    suggestions,
    suggestedTags,
    scanning,
    error: enrichmentError,
    hasSuggestions,
    extract,
    accept,
    dismiss,
    acceptTag,
    dismissTag,
  } = useContentEnrichment({
    kind: resolved.value.kind,
    sourceEntityType: resolved.value.sourceType,
  })

  /** Build the text to extract entities from, based on entity type. */
  function buildText(entity: any): string {
    if (!entity) return ''

    if (entity.type === 'email') {
      const body = entity.bodyText || stripHtml(entity.bodyHtml) || entity.snippet || ''
      const subject = entity.subject || entity.title || ''
      return [subject, body].filter(Boolean).join('\n\n')
    }

    if (entity.type === 'event' || entity.type === 'appointment' || entity.type === 'trip') {
      const parts: string[] = []
      if (entity.title) parts.push(entity.title)
      if (entity.description) parts.push(entity.description)
      if (entity.content) parts.push(stripHtml(entity.content))
      if (entity.location) parts.push(`Location: ${entity.location}`)
      if (Array.isArray(entity.attendees) && entity.attendees.length) {
        parts.push(`Attendees: ${entity.attendees.join(', ')}`)
      }
      return parts.join('\n\n')
    }

    // YouTube (or any video) bookmark with a transcript — flatten cues plus
    // chapter titles for extra context. The server truncates to 4000 chars,
    // so long videos get the opening + chapter headings as a compact summary.
    if (entity.type === 'bookmark') {
      const cues = parseTranscript(entity)
      if (cues.length > 0) {
        const parts: string[] = []
        if (entity.title) parts.push(`Title: ${entity.title}`)
        if (entity.videoAuthor) parts.push(`Channel: ${entity.videoAuthor}`)
        const chapters = parseChapters(entity)
        if (chapters.length) {
          parts.push('Chapters:\n' + chapters.map((c) => `- ${c.title}`).join('\n'))
        }
        const transcriptText = cues
          .map((c) => c.text)
          .filter(Boolean)
          .join(' ')
        parts.push(`Transcript:\n${transcriptText}`)
        return parts.join('\n\n')
      }
    }

    // Generic fallback — whatever text fields the entity has.
    const title = entity.title || ''
    const desc = entity.description || ''
    const content = stripHtml(entity.content || '')
    return [title, desc, content].filter(Boolean).join('\n\n')
  }

  function stripHtml(html: string | undefined): string {
    if (!html) return ''
    return String(html)
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /** Stable cache key so re-opening the same entity is instant. */
  function cacheKeyFor(entity: any): string {
    if (entity?.type === 'email' && entity?.gmailThreadId) return entity.gmailThreadId
    // Video bookmarks: key by videoId so re-scanning from different entities
    // pointing at the same video share the cache.
    if (entity?.type === 'bookmark' && entity?.videoId) return `yt:${entity.videoId}`
    return entity?.id || ''
  }

  const enrichmentEnabled = computed(() => {
    const text = buildText(props.entity)
    return text.trim().length >= 20
  })

  const suggestionsCollapsed = ref(false)

  function getSuggestionIcon(type: string) {
    try {
      return getEntityTypeConfig(type as EntityType).icon
    } catch {
      const fallback: Record<string, string> = {
        person: 'lucide:user',
        organization: 'lucide:building-2',
        project: 'lucide:folder-kanban',
        task: 'lucide:check-square',
        event: 'lucide:calendar',
        appointment: 'lucide:calendar-clock',
        trip: 'lucide:plane',
        deadline: 'lucide:alarm-clock',
        payment: 'lucide:credit-card',
      }
      return fallback[type] || 'lucide:circle'
    }
  }

  function getSuggestionColor(type: string) {
    try {
      const color = getEntityTypeConfig(type as EntityType).color
      return `text-${color}-600 bg-${color}-500/10`
    } catch {
      const fallback: Record<string, string> = {
        person: 'text-sky-600 bg-sky-500/10',
        organization: 'text-purple-600 bg-purple-500/10',
        project: 'text-amber-600 bg-amber-500/10',
        task: 'text-emerald-600 bg-emerald-500/10',
        event: 'text-rose-600 bg-rose-500/10',
      }
      return fallback[type] || 'text-muted-foreground bg-muted/50'
    }
  }

  function getStatusLabel(s: EnrichmentSuggestion): string {
    return s.status === 'matched' ? 'Link' : 'Create & Link'
  }

  async function handleAccept(s: EnrichmentSuggestion) {
    await accept(s, props.entity, cacheKeyFor(props.entity))
  }

  function runExtraction() {
    if (!enrichmentEnabled.value) return
    const text = buildText(props.entity)
    const key = cacheKeyFor(props.entity)
    if (!text || !key) return

    // For video bookmarks, pass the raw cue list so the composable can
    // resolve first-mention timestamps for each extracted entity.
    const videoCues =
      resolved.value.kind === 'video'
        ? parseTranscript(props.entity).map((c) => ({ start: c.start, text: c.text }))
        : undefined

    extract(text, key, props.entity?.tags, videoCues)
  }

  /** Render a timestamp in `m:ss` / `h:mm:ss` form. */
  function formatTimestamp(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function handleSeek(seconds: number) {
    seekActivePlayer(seconds)
  }

  // Auto-extract on mount when we have enough content.
  onMounted(() => {
    if (enrichmentEnabled.value) runExtraction()
  })

  // If the entity swaps (different dialog opens reusing this component),
  // re-run extraction for the new entity.
  watch(
    () => props.entity?.id,
    (id, prev) => {
      if (id && id !== prev && enrichmentEnabled.value) runExtraction()
    },
  )
</script>

<template>
  <div v-if="enrichmentEnabled" class="px-3 py-2.5 border-t border-border bg-muted/10 space-y-2">
    <div class="flex items-center justify-between">
      <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Icon name="lucide:sparkles" class="h-3 w-3 text-amber-500" />
        AI Suggestions
      </p>
      <div class="flex items-center gap-2">
        <button
          v-if="!scanning"
          type="button"
          class="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          title="Re-scan for entities"
          @click="runExtraction">
          <Icon name="lucide:sparkles" class="h-3 w-3" />
          Scan
        </button>
        <Icon v-else name="lucide:loader-2" class="h-3 w-3 text-muted-foreground animate-spin shrink-0" />
        <button
          v-if="hasSuggestions"
          type="button"
          class="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          @click="suggestionsCollapsed = !suggestionsCollapsed">
          {{ suggestionsCollapsed ? 'Show' : 'Hide' }}
        </button>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="enrichmentError && !scanning" class="flex items-center gap-2 text-xs text-destructive py-1">
      <Icon name="lucide:alert-circle" class="h-3 w-3 shrink-0" />
      {{ enrichmentError }}
    </div>

    <template v-if="!suggestionsCollapsed">
      <!-- Entity suggestions -->
      <div v-if="suggestions.length" class="flex flex-wrap gap-1.5">
        <div
          v-for="s in suggestions"
          :key="`${s.candidate.type}::${s.candidate.name}`"
          class="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs transition-colors hover:bg-muted/50">
          <div
            :class="[
              'w-5 h-5 rounded flex items-center justify-center shrink-0',
              getSuggestionColor(s.candidate.type),
            ]">
            <Icon :name="getSuggestionIcon(s.candidate.type)" class="h-3 w-3" />
          </div>
          <span class="truncate max-w-[120px]">{{ s.candidate.name }}</span>
          <span
            class="shrink-0 text-[9px] font-medium text-muted-foreground bg-muted/60 rounded px-1 py-0.5 capitalize">
            {{ s.candidate.type }}
          </span>
          <span
            v-if="s.status === 'matched'"
            class="shrink-0 text-[9px] font-medium text-emerald-600 bg-emerald-500/10 rounded px-1 py-0.5">
            exists
          </span>
          <!-- Timestamp badge for video suggestions — click to seek player. -->
          <button
            v-if="s.firstMentionAt !== undefined"
            type="button"
            class="shrink-0 h-4 flex items-center gap-0.5 rounded px-1 hover:bg-primary/10 text-primary text-[10px] font-mono font-medium transition-colors"
            :title="`Jump to ${formatTimestamp(s.firstMentionAt)}`"
            @click.stop="handleSeek(s.firstMentionAt!)">
            <Icon name="lucide:play" class="h-2.5 w-2.5" />
            {{ formatTimestamp(s.firstMentionAt) }}
          </button>
          <button
            type="button"
            class="shrink-0 h-4 flex items-center gap-0.5 rounded px-1 hover:bg-primary/10 text-primary text-[10px] font-medium transition-colors"
            :title="getStatusLabel(s)"
            @click.stop="handleAccept(s)">
            <Icon name="lucide:plus" class="h-3 w-3" />
            {{ getStatusLabel(s) }}
          </button>
          <button
            type="button"
            class="shrink-0 h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
            title="Dismiss"
            @click.stop="dismiss(s)">
            <Icon name="lucide:x" class="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      <!-- Tag suggestions -->
      <div v-if="suggestedTags.length" class="flex flex-wrap gap-1.5">
        <div
          v-for="tag in suggestedTags"
          :key="tag"
          class="group inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50">
          <Icon name="lucide:hash" class="h-3 w-3 shrink-0" />
          <span class="truncate max-w-[110px]">{{ tag }}</span>
          <button
            type="button"
            class="shrink-0 h-4 w-4 flex items-center justify-center rounded hover:bg-primary/10 text-primary transition-colors"
            title="Add tag"
            @click.stop="acceptTag(tag, entity)">
            <Icon name="lucide:plus" class="h-3 w-3" />
          </button>
          <button
            type="button"
            class="shrink-0 h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
            title="Dismiss"
            @click.stop="dismissTag(tag)">
            <Icon name="lucide:x" class="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      <!-- Scanning indicator -->
      <div v-if="scanning && !hasSuggestions" class="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
        Scanning for entities…
      </div>

      <!-- Empty state -->
      <div v-if="!scanning && !hasSuggestions && !enrichmentError" class="text-xs text-muted-foreground/60 py-0.5">
        No entities detected — click Scan to analyze
      </div>
    </template>
  </div>
</template>
