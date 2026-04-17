<script lang="ts" setup>
  import type { EntityType } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { useEmailEnrichment, type EnrichmentSuggestion } from '~/composables/useEmailEnrichment'

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  // ── Email fields ──────────────────────────────────────────────────────
  const from = computed(() => item.value?.from || '')
  const to = computed(() => item.value?.to || '')
  const cc = computed(() => item.value?.cc || '')
  const date = computed(() => item.value?.date || '')
  const subject = computed(() => item.value?.subject || item.value?.title || '(no subject)')

  function formatSender(raw: string): string {
    const match = /^(.+?)\s*<(.+)>$/.exec(raw)
    return match?.[1]?.replace(/["']/g, '').trim() || raw
  }

  function formatDate(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function sanitizedBody(html: string | undefined): string {
    if (!html) return ''
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
  }

  // ── AI Enrichment ─────────────────────────────────────────────────────
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
  } = useEmailEnrichment()

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
    await accept(s, item.value)
  }

  function handleDismiss(s: EnrichmentSuggestion) {
    dismiss(s)
  }

  function handleAcceptTag(tag: string) {
    acceptTag(tag, item.value)
  }

  function handleDismissTag(tag: string) {
    dismissTag(tag)
  }

  // Auto-extract on mount if body exists
  onMounted(() => {
    const text = item.value?.bodyText || item.value?.bodyHtml || ''
    const threadId = item.value?.gmailThreadId
    if (text && threadId) {
      extract(text, threadId, item.value?.tags)
    }
  })
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">
    <!-- Email metadata header -->
    <div class="px-4 py-3 border-b border-border bg-muted/20 shrink-0 space-y-1.5">
      <div class="flex items-center gap-2 text-sm">
        <div class="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
          <span class="text-xs font-semibold text-rose-600">
            {{ formatSender(from).charAt(0).toUpperCase() }}
          </span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-medium truncate">{{ formatSender(from) }}</div>
          <div class="text-xs text-muted-foreground truncate">
            to {{ to }}
            <span v-if="cc"> · cc {{ cc }}</span>
          </div>
        </div>
        <time class="text-xs text-muted-foreground shrink-0">{{ formatDate(date) }}</time>
      </div>
    </div>

    <!-- AI Suggestions (scan button + results) -->
    <div class="px-4 py-2.5 border-b border-border bg-muted/10 shrink-0 space-y-2">
      <div class="flex items-center justify-between">
        <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Icon name="lucide:sparkles" class="h-3 w-3 text-amber-500" />
          AI Suggestions
        </p>
        <div class="flex items-center gap-2">
          <button
            v-if="!scanning"
            type="button"
            class="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            title="Re-scan email for entities"
            @click="extract(item.bodyText || item.bodyHtml || '', item.gmailThreadId, item.tags)">
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
            <div :class="['w-5 h-5 rounded flex items-center justify-center shrink-0', getSuggestionColor(s.candidate.type)]">
              <Icon :name="getSuggestionIcon(s.candidate.type)" class="h-3 w-3" />
            </div>
            <span class="truncate max-w-[140px]">{{ s.candidate.name }}</span>
            <span class="shrink-0 text-[9px] font-medium text-muted-foreground bg-muted/60 rounded px-1 py-0.5 capitalize">
              {{ s.candidate.type }}
            </span>
            <span
              v-if="s.status === 'matched'"
              class="shrink-0 text-[9px] font-medium text-emerald-600 bg-emerald-500/10 rounded px-1 py-0.5">
              exists
            </span>
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
              @click.stop="handleDismiss(s)">
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
            <span class="truncate max-w-[120px]">{{ tag }}</span>
            <button
              type="button"
              class="shrink-0 h-4 w-4 flex items-center justify-center rounded hover:bg-primary/10 text-primary transition-colors"
              title="Add tag"
              @click.stop="handleAcceptTag(tag)">
              <Icon name="lucide:plus" class="h-3 w-3" />
            </button>
            <button
              type="button"
              class="shrink-0 h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
              title="Dismiss"
              @click.stop="handleDismissTag(tag)">
              <Icon name="lucide:x" class="h-2.5 w-2.5" />
            </button>
          </div>
        </div>

        <!-- Scanning indicator -->
        <div v-if="scanning && !hasSuggestions" class="flex items-center gap-2 text-xs text-muted-foreground py-1">
          <Icon name="lucide:loader-2" class="h-3 w-3 animate-spin" />
          Scanning email for entities...
        </div>

        <!-- Empty state (after scan, nothing found) -->
        <div v-if="!scanning && !hasSuggestions && !enrichmentError" class="text-xs text-muted-foreground/60 py-0.5">
          No entities detected — click Scan to analyze
        </div>
      </template>
    </div>

    <!-- Email body -->
    <div class="flex-1 overflow-y-auto">
      <div
        class="prose prose-sm dark:prose-invert max-w-none p-6 text-sm"
        v-html="sanitizedBody(item.bodyHtml) || item.bodyText || item.snippet || ''" />
    </div>
  </div>
</template>
