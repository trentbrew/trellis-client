<script lang="ts" setup>
  /**
   * EntityAISuggestionsPanel — shared AI entity/tag suggestions panel.
   *
   * Auto-detects the correct enrichment kind from the source entity's type
   * and builds the extraction text from the relevant fields. Mounts in the
   * right sidebar of EntityDialog, sitting at the bottom of the References tab.
   */
  import type { EntityType } from '~/types/entity'
  import type { EnrichmentSuggestion, ProposedField, ProposedInstance, TypeProposal } from '~/types/enrichment'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { useContentEnrichment, type ContentKind } from '~/composables/useContentEnrichment'
  import { useActiveVideoPlayer } from '~/composables/useActiveVideoPlayer'
  import { parseChapters, parseTranscript } from '~/composables/useYoutubeTranscript'

  /**
   * Tailwind palette keys offered in the inline color picker. Matches the
   * list advertised to the LLM server-side in extract-entities-llm.post.ts.
   */
  const PALETTE_COLORS = [
    'slate',
    'gray',
    'red',
    'orange',
    'amber',
    'yellow',
    'lime',
    'green',
    'emerald',
    'teal',
    'cyan',
    'sky',
    'blue',
    'indigo',
    'violet',
    'purple',
    'fuchsia',
    'pink',
    'rose',
  ] as const

  const ONTOLOGY_VALUE_TYPES = [
    'title',
    'rich_text',
    'number',
    'select',
    'multi_select',
    'status',
    'date',
    'checkbox',
    'url',
    'email',
    'phone_number',
    'people',
    'files',
    'relation',
  ] as const

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
    if (entityType === 'file') return { kind: 'file', sourceType: 'file' as EntityType }
    return { kind: 'generic', sourceType: (entityType as EntityType) || 'entity' }
  }

  const resolved = computed(() => resolveKind(props.entity))

  // Note: we intentionally instantiate the composable once — kind/sourceType
  // are essentially static for an open dialog (entity.type doesn't change).
  const {
    suggestions,
    suggestedTags,
    typeProposals,
    acceptingTypeSlug,
    scanning,
    error: enrichmentError,
    hasSuggestions,
    extract,
    hydrateFromPersisted,
    invalidateCache,
    accept,
    dismiss,
    acceptTag,
    dismissTag,
    acceptTypeProposal,
    dismissTypeProposal,
  } = useContentEnrichment({
    kind: resolved.value.kind,
    sourceEntityType: resolved.value.sourceType,
  })

  // ── Type proposal UI state ────────────────────────────────────────────
  // Which proposal (if any) has its review card expanded.
  const expandedTypeSlug = ref<string | null>(null)
  // Whether the color palette popover is open for the expanded card.
  const paletteOpen = ref(false)
  // Whether the icon picker dialog is open for the expanded card.
  const iconPickerOpen = ref(false)

  /**
   * Per-slug edit state: `overrides` applied on accept. Seeded lazily from
   * the original proposal when the user first expands the card. Works for
   * simple cases (rename, swap icon/color, drop fields, uncheck instances)
   * without needing a dedicated dialog.
   */
  interface ProposalEdits {
    label: string
    icon: string
    color: string
    fields: ProposedField[]
    instances: { proposed: ProposedInstance; selected: boolean }[]
  }
  const proposalEdits = ref<Record<string, ProposalEdits>>({})

  function ensureEdits(proposal: TypeProposal): ProposalEdits {
    if (!proposalEdits.value[proposal.slug]) {
      proposalEdits.value[proposal.slug] = {
        label: proposal.label,
        icon: proposal.icon,
        color: proposal.color,
        fields: proposal.fields.map((f) => ({ ...f })),
        instances: proposal.exampleInstances.map((i) => ({ proposed: i, selected: true })),
      }
    }
    return proposalEdits.value[proposal.slug]!
  }

  function toggleExpand(slug: string) {
    const next = expandedTypeSlug.value === slug ? null : slug
    // Seed edit state BEFORE mutating the ref so the template renders with
    // a populated edits object on first paint (avoids a render-phase mutation).
    if (next) {
      const proposal = typeProposals.value.find((p) => p.slug === next)
      if (proposal) ensureEdits(proposal)
    }
    expandedTypeSlug.value = next
    paletteOpen.value = false
    iconPickerOpen.value = false
  }

  /**
   * Template-friendly accessor for the edits object. Returns a stable
   * placeholder when no edits are seeded yet to avoid render-phase mutations.
   * `toggleExpand` pre-seeds edits before expansion, so this is only read by
   * the expanded card itself.
   */
  function getEdits(slug: string): ProposalEdits {
    return (
      proposalEdits.value[slug] ?? {
        label: '',
        icon: '',
        color: 'violet',
        fields: [],
        instances: [],
      }
    )
  }

  function removeField(slug: string, index: number) {
    const edits = proposalEdits.value[slug]
    if (!edits) return
    // Don't let the user delete the title field — downstream scaffolding needs it.
    if (edits.fields[index]?.valueType === 'title') return
    edits.fields.splice(index, 1)
  }

  function setFieldValueType(slug: string, index: number, valueType: string) {
    const edits = proposalEdits.value[slug]
    if (!edits) return
    const field = edits.fields[index]
    if (!field) return
    field.valueType = valueType as ProposedField['valueType']
  }

  async function handleAcceptType(proposal: TypeProposal) {
    const edits = ensureEdits(proposal)
    const selectedInstances = edits.instances.filter((i) => i.selected).map((i) => i.proposed)
    const result = await acceptTypeProposal(
      proposal,
      props.entity,
      {
        label: edits.label,
        icon: edits.icon,
        color: edits.color,
        fields: edits.fields,
        instances: selectedInstances,
      },
      cacheKeyFor(props.entity),
    )
    if (result.ok) {
      expandedTypeSlug.value = null
      Reflect.deleteProperty(proposalEdits.value, proposal.slug)
    } else {
      console.warn('[EntityAISuggestionsPanel] acceptTypeProposal failed:', result.error)
    }
  }

  function handleDismissType(proposal: TypeProposal) {
    dismissTypeProposal(proposal, cacheKeyFor(props.entity))
    if (expandedTypeSlug.value === proposal.slug) expandedTypeSlug.value = null
    Reflect.deleteProperty(proposalEdits.value, proposal.slug)
  }

  function selectProposalColor(proposal: TypeProposal, color: string) {
    ensureEdits(proposal).color = color
    paletteOpen.value = false
  }

  function setProposalIcon(icon: string) {
    const slug = expandedTypeSlug.value
    if (!slug) return
    const edits = proposalEdits.value[slug]
    if (!edits) return
    edits.icon = icon
  }

  /** Pill / header tint derived from the proposal's Tailwind color key. */
  function getTypeProposalColor(color: string): { bg: string; fg: string; border: string; bgStrong: string } {
    // Safelist-resilient since Tailwind JIT sees these in string literals across the template.
    return {
      bg: `bg-${color}-500/10`,
      fg: `text-${color}-600 dark:text-${color}-400`,
      border: `border-${color}-500/30`,
      bgStrong: `bg-${color}-500`,
    }
  }

  /** Slug preview for the expanded review card (read-only; label drives this). */
  function slugPreview(proposal: TypeProposal): string {
    const edits = proposalEdits.value[proposal.slug]
    return edits
      ? edits.label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 40) || proposal.slug
      : proposal.slug
  }

  function formatProposalSummary(proposal: TypeProposal, edits: ProposalEdits): string {
    const selectedCount = edits.instances.filter((i) => i.selected).length
    const parts = [
      `${edits.fields.length} field${edits.fields.length === 1 ? '' : 's'}`,
      `${selectedCount} instance${selectedCount === 1 ? '' : 's'}`,
      proposal.confidence,
    ]
    return parts.join(' · ')
  }

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

    if (entity.type === 'file') {
      const parts: string[] = []
      if (entity.title) parts.push(`Filename: ${entity.title}`)
      if (entity.fileCategory) parts.push(`Category: ${entity.fileCategory}`)
      if (entity.fileExtension) parts.push(`Extension: .${entity.fileExtension}`)
      if (entity.mimeType) parts.push(`MIME: ${entity.mimeType}`)
      if (entity.description) parts.push(`Description: ${entity.description}`)
      if (entity.documentAuthor) parts.push(`Author: ${entity.documentAuthor}`)
      if (entity.codeLanguage) parts.push(`Language: ${entity.codeLanguage}`)
      if (entity.artist) parts.push(`Artist: ${entity.artist}`)
      if (entity.aiSummary) parts.push(entity.aiSummary)
      return parts.join('\n')
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

  function runExtraction(opts?: { force?: boolean }) {
    if (!enrichmentEnabled.value) return
    const text = buildText(props.entity)
    const key = cacheKeyFor(props.entity)
    if (!text || !key) return

    // Manual "Scan" invalidates the session cache so the LLM re-runs even
    // if we previously hydrated from the entity's persisted AI fields.
    if (opts?.force) invalidateCache(key)

    // For video bookmarks, pass the raw cue list so the composable can
    // resolve first-mention timestamps for each extracted entity.
    const videoCues =
      resolved.value.kind === 'video'
        ? parseTranscript(props.entity).map((c) => ({ start: c.start, text: c.text }))
        : undefined

    extract(text, key, props.entity?.tags, videoCues)
  }

  /**
   * If the entity already carries persisted AI enrichment (set by the
   * gmail-notifier on ingest or by a prior session's Scan button), seed the
   * UI from those fields instantly — no LLM round-trip, no scanning spinner.
   *
   * Returns true when hydration fired, so callers can skip `runExtraction`.
   */
  function tryHydrateFromEntity(): boolean {
    const entity = props.entity
    if (!entity) return false
    const scannedAt = entity.aiScannedAt || entity.summaryGeneratedAt
    if (!scannedAt) return false
    const hasAnyAiData =
      (typeof entity.aiSuggestions === 'string' && entity.aiSuggestions.length > 2) ||
      (Array.isArray(entity.aiSuggestedTags) && entity.aiSuggestedTags.length > 0) ||
      (typeof entity.aiTypeProposals === 'string' && entity.aiTypeProposals.length > 2)
    if (!hasAnyAiData) return false

    hydrateFromPersisted(
      {
        suggestions: entity.aiSuggestions,
        tags: entity.aiSuggestedTags,
        typeProposals: entity.aiTypeProposals,
      },
      cacheKeyFor(entity),
      entity.tags,
    )
    return true
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

  // Auto-hydrate from persisted AI fields on mount, falling back to a live
  // extraction call when nothing is persisted yet.
  onMounted(() => {
    if (!enrichmentEnabled.value) return
    const hydrated = tryHydrateFromEntity()
    if (!hydrated) runExtraction()
  })

  // If the entity swaps (different dialog opens reusing this component),
  // re-hydrate + extract for the new entity.
  watch(
    () => props.entity?.id,
    (id, prev) => {
      if (!id || id === prev || !enrichmentEnabled.value) return
      const hydrated = tryHydrateFromEntity()
      if (!hydrated) runExtraction()
    },
  )

  // Also react to AI fields arriving asynchronously — the gmail-notifier
  // may enrich an email a few seconds after the user opens it. The SSE
  // mutation stream updates `entity.aiScannedAt`, which triggers this watch.
  watch(
    () => props.entity?.aiScannedAt,
    (scannedAt, prev) => {
      if (scannedAt && scannedAt !== prev) tryHydrateFromEntity()
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
          @click="runExtraction({ force: true })">
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
      <!-- New Type Proposals ─────────────────────────────────────────── -->
      <div v-if="typeProposals.length" class="space-y-1.5">
        <div class="flex items-center gap-1.5">
          <Icon name="lucide:shapes" class="h-3 w-3 text-muted-foreground shrink-0" />
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            New Types · {{ typeProposals.length }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <div
            v-for="proposal in typeProposals"
            :key="proposal.slug"
            class="group rounded-md border bg-card transition-colors overflow-hidden"
            :class="[expandedTypeSlug === proposal.slug ? 'border-border' : 'border-border hover:border-border']">
            <!-- Collapsed pill row -->
            <button
              type="button"
              class="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left transition-colors hover:bg-muted/40"
              @click="toggleExpand(proposal.slug)">
              <div
                :class="[
                  'w-5 h-5 rounded flex items-center justify-center shrink-0',
                  getTypeProposalColor(proposal.color).bg,
                  getTypeProposalColor(proposal.color).fg,
                ]">
                <Icon :name="proposal.icon" class="h-3 w-3" />
              </div>
              <span class="font-medium truncate flex-1">{{ proposal.label }}</span>
              <span
                class="shrink-0 text-[9px] font-medium text-muted-foreground bg-muted/60 rounded px-1 py-0.5 capitalize">
                {{ proposal.entityClass }}
              </span>
              <span
                :class="[
                  'shrink-0 text-[9px] font-medium rounded px-1 py-0.5',
                  proposal.confidence === 'high'
                    ? 'text-emerald-600 bg-emerald-500/10'
                    : 'text-amber-600 bg-amber-500/10',
                ]">
                {{ proposal.confidence }}
              </span>
              <Icon
                :name="expandedTypeSlug === proposal.slug ? 'lucide:chevron-up' : 'lucide:chevron-down'"
                class="h-3 w-3 text-muted-foreground shrink-0" />
            </button>

            <!-- Expanded review card -->
            <div
              v-if="expandedTypeSlug === proposal.slug"
              class="border-t border-border bg-muted/10 px-2.5 py-2 space-y-2.5">
              <!-- Description -->
              <p v-if="proposal.description" class="text-[11px] text-muted-foreground italic">
                {{ proposal.description }}
              </p>

              <!-- Header row: icon + color + label -->
              <div class="flex items-center gap-2">
                <!-- Icon picker trigger -->
                <button
                  type="button"
                  :class="[
                    'relative h-8 w-8 rounded-md border flex items-center justify-center transition-colors',
                    getTypeProposalColor(getEdits(proposal.slug).color).bg,
                    getTypeProposalColor(getEdits(proposal.slug).color).fg,
                    getTypeProposalColor(getEdits(proposal.slug).color).border,
                  ]"
                  title="Change icon"
                  @click.stop="iconPickerOpen = true">
                  <Icon :name="getEdits(proposal.slug).icon" class="h-4 w-4" />
                </button>

                <!-- Color swatch trigger + popover -->
                <div class="relative">
                  <button
                    type="button"
                    :class="[
                      'h-8 w-8 rounded-md border border-border flex items-center justify-center transition-colors hover:border-muted-foreground',
                    ]"
                    title="Change color"
                    @click.stop="paletteOpen = !paletteOpen">
                    <div
                      :class="['h-4 w-4 rounded-full', getTypeProposalColor(getEdits(proposal.slug).color).bgStrong]" />
                  </button>
                  <div
                    v-if="paletteOpen"
                    class="absolute left-0 top-full mt-1 z-20 p-2 rounded-md border border-border bg-popover shadow-md w-[184px]">
                    <div class="grid grid-cols-7 gap-1">
                      <button
                        v-for="c in PALETTE_COLORS"
                        :key="c"
                        type="button"
                        :class="[
                          'h-5 w-5 rounded-full transition-transform hover:scale-110',
                          `bg-${c}-500`,
                          getEdits(proposal.slug).color === c ? 'ring-2 ring-offset-1 ring-foreground' : '',
                        ]"
                        :title="c"
                        @click.stop="selectProposalColor(proposal, c)" />
                    </div>
                  </div>
                </div>

                <!-- Label input -->
                <input
                  v-model="getEdits(proposal.slug).label"
                  type="text"
                  :placeholder="proposal.label"
                  class="flex-1 h-8 px-2 text-xs bg-transparent border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>

              <!-- Slug preview -->
              <div class="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                <Icon name="lucide:hash" class="h-2.5 w-2.5" />
                <span>trellis:schema/{{ slugPreview(proposal) }}</span>
              </div>

              <!-- Field list -->
              <div class="space-y-1">
                <div
                  class="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  <Icon name="lucide:list" class="h-2.5 w-2.5" />
                  Fields
                </div>
                <div class="space-y-1">
                  <div
                    v-for="(field, idx) in getEdits(proposal.slug).fields"
                    :key="`${proposal.slug}-field-${idx}`"
                    class="flex items-center gap-1.5 text-[11px]">
                    <input
                      v-model="getEdits(proposal.slug).fields[idx]!.name"
                      type="text"
                      :disabled="field.valueType === 'title'"
                      class="flex-1 h-6 px-1.5 bg-transparent border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60" />
                    <select
                      :value="field.valueType"
                      :disabled="field.valueType === 'title'"
                      class="h-6 px-1 bg-transparent border border-border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                      @change="setFieldValueType(proposal.slug, idx, ($event.target as HTMLSelectElement).value)">
                      <option v-for="vt in ONTOLOGY_VALUE_TYPES" :key="vt" :value="vt">{{ vt }}</option>
                    </select>
                    <label
                      class="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer select-none shrink-0"
                      :title="field.required ? 'Required' : 'Optional'">
                      <input v-model="getEdits(proposal.slug).fields[idx]!.required" type="checkbox" class="h-3 w-3" />
                      req
                    </label>
                    <button
                      type="button"
                      class="shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      :disabled="field.valueType === 'title'"
                      :class="{ 'opacity-30 cursor-not-allowed': field.valueType === 'title' }"
                      title="Remove field"
                      @click.stop="removeField(proposal.slug, idx)">
                      <Icon name="lucide:x" class="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Instance list -->
              <div class="space-y-1">
                <div
                  class="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  <Icon name="lucide:sparkles" class="h-2.5 w-2.5" />
                  Example Instances
                </div>
                <div class="space-y-1">
                  <label
                    v-for="(inst, idx) in getEdits(proposal.slug).instances"
                    :key="`${proposal.slug}-inst-${idx}`"
                    class="flex items-start gap-2 p-1.5 rounded border border-border/60 cursor-pointer transition-colors hover:bg-muted/30"
                    :class="{ 'opacity-50': !inst.selected }">
                    <input v-model="inst.selected" type="checkbox" class="mt-0.5 h-3 w-3 shrink-0" />
                    <div class="flex-1 min-w-0">
                      <div class="text-[11px] font-medium truncate">{{ inst.proposed.title }}</div>
                      <div v-if="inst.proposed.context" class="text-[10px] text-muted-foreground truncate">
                        {{ inst.proposed.context }}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <!-- Footer actions -->
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-border/60">
                <span class="text-[10px] text-muted-foreground">
                  {{ formatProposalSummary(proposal, getEdits(proposal.slug)) }}
                </span>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="h-6 px-2 text-[11px] rounded border border-border hover:bg-muted/50 transition-colors"
                    :disabled="acceptingTypeSlug === proposal.slug"
                    @click.stop="handleDismissType(proposal)">
                    Dismiss
                  </button>
                  <button
                    type="button"
                    class="h-6 px-2 text-[11px] rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50"
                    :disabled="
                      acceptingTypeSlug === proposal.slug ||
                      getEdits(proposal.slug).instances.filter((i) => i.selected).length === 0
                    "
                    @click.stop="handleAcceptType(proposal)">
                    <Icon
                      v-if="acceptingTypeSlug === proposal.slug"
                      name="lucide:loader-2"
                      class="h-3 w-3 animate-spin" />
                    <Icon v-else name="lucide:check" class="h-3 w-3" />
                    <span>{{ acceptingTypeSlug === proposal.slug ? 'Creating…' : 'Accept & Create' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Icon picker dialog — single instance, rebinds to whichever proposal is expanded -->
      <IconPicker
        v-if="expandedTypeSlug"
        v-model:open="iconPickerOpen"
        :model-value="proposalEdits[expandedTypeSlug]?.icon || ''"
        @update:model-value="setProposalIcon" />

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
