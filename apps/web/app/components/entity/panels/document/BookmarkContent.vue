<script lang="ts" setup>
  import type { EntityReference, EntityType } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'

  interface EntitySuggestion {
    name: string
    type: 'person' | 'organization'
    confidence: 'high' | 'medium' | 'low'
    source: string
    meta?: { url?: string; role?: string; description?: string }
  }

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

  const url = computed(() => item.value?.url || '')
  const domain = computed(() => {
    try {
      return new URL(url.value).hostname.replace(/^www\./, '')
    } catch {
      return url.value
    }
  })

  // ── Entity suggestions ───────────────────────────────────────────────
  const { items: allItems, create: createEntity, update: updateEntity } = useEntities()

  const suggestions = ref<EntitySuggestion[]>([])
  const suggestedTags = ref<string[]>([])
  const scanning = ref(false)
  const suggestionsCollapsed = ref(false)

  const hasSuggestions = computed(() => suggestions.value.length > 0 || suggestedTags.value.length > 0)

  async function fetchSuggestions(targetUrl: string) {
    if (!targetUrl) return
    scanning.value = true
    try {
      const data = await $fetch<{ entities: EntitySuggestion[]; tags: string[] }>('/api/extract-entities', {
        params: { url: targetUrl },
      })
      suggestions.value = data.entities || []
      suggestedTags.value = (data.tags || []).filter((t) => !(item.value.tags || []).includes(t))
    } catch {
      suggestions.value = []
      suggestedTags.value = []
    } finally {
      scanning.value = false
    }
  }

  function getSuggestionIcon(type: string) {
    try {
      return getEntityTypeConfig(type as EntityType).icon
    } catch {
      return type === 'person' ? 'lucide:user' : 'lucide:building-2'
    }
  }

  function getSuggestionColor(type: string) {
    try {
      const color = getEntityTypeConfig(type as EntityType).color
      return `text-${color}-600 bg-${color}-500/10`
    } catch {
      return type === 'person' ? 'text-sky-600 bg-sky-500/10' : 'text-purple-600 bg-purple-500/10'
    }
  }

  async function acceptSuggestion(s: EntitySuggestion) {
    // Check for existing entity with same title+type
    const existing = allItems.value.find(
      (e: any) => e.type === s.type && e.title?.toLowerCase() === s.name.toLowerCase(),
    )

    let entityId: string
    let entityTitle: string

    if (existing) {
      entityId = existing.id
      entityTitle = existing.title || s.name
    } else {
      // Create new entity
      entityId = await createEntity({
        type: s.type as any,
        title: s.name,
        description: s.meta?.description || '',
      })
      entityTitle = s.name
    }

    // Add outgoing reference on this bookmark → target entity
    if (!item.value.references) item.value.references = []
    const alreadyLinked = item.value.references.some(
      (r: any) => r.kind === 'entity' && r.entityId === entityId,
    )
    if (!alreadyLinked) {
      const ref: EntityReference = {
        kind: 'entity',
        id: crypto.randomUUID(),
        entityId,
        entityType: s.type as EntityType,
        title: entityTitle,
        direction: 'outgoing',
      }
      item.value.references.push(ref)
    }

    // Add incoming reference on target entity → this bookmark (bi-directional)
    const targetEntity = allItems.value.find((e: any) => e.id === entityId)
    if (targetEntity) {
      const refs = (targetEntity as any).references || []
      const bookmarkId = item.value.id
      const hasBackRef = refs.some((r: any) => r.kind === 'entity' && r.entityId === bookmarkId)
      if (!hasBackRef && bookmarkId) {
        refs.push({
          kind: 'entity',
          id: crypto.randomUUID(),
          entityId: bookmarkId,
          entityType: 'bookmark',
          title: item.value.title || 'Bookmark',
          direction: 'incoming',
        } satisfies EntityReference)
        await updateEntity({ ...targetEntity, references: refs } as any)
      }
    }

    // Remove from suggestions list
    suggestions.value = suggestions.value.filter((x) => x !== s)
  }

  function dismissSuggestion(s: EntitySuggestion) {
    suggestions.value = suggestions.value.filter((x) => x !== s)
  }

  function acceptTag(tag: string) {
    if (!item.value.tags) item.value.tags = []
    if (!item.value.tags.includes(tag)) {
      item.value.tags.push(tag)
    }
    suggestedTags.value = suggestedTags.value.filter((t) => t !== tag)
  }

  function dismissTag(tag: string) {
    suggestedTags.value = suggestedTags.value.filter((t) => t !== tag)
  }

  // ── URL-first creation flow ────────────────────────────────────────────
  const urlInput = ref('')
  const unfurling = ref(false)
  const unfurlError = ref('')

  async function unfurlUrl(rawUrl: string) {
    let target = rawUrl.trim()
    if (!target) return

    // Auto-prepend https:// if missing
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`

    try {
      new URL(target)
    } catch {
      unfurlError.value = 'Please enter a valid URL'
      return
    }

    unfurling.value = true
    unfurlError.value = ''

    try {
      const meta = await $fetch<{
        url: string
        title: string
        description: string
        favicon: string
        thumbnail: string
        siteName: string
      }>('/api/unfurl', { params: { url: target } })

      // Populate all bookmark fields from metadata
      item.value.url = meta.url
      item.value.title = meta.title || item.value.title
      item.value.description = meta.description || item.value.description
      item.value.favicon = meta.favicon || ''
      item.value.thumbnail = meta.thumbnail || ''
      item.value.siteName = meta.siteName || ''
      item.value.excerpt = meta.description || ''

      // Auto-scan for entity suggestions
      fetchSuggestions(meta.url)
    } catch {
      // Even on error, set the URL so the user can continue
      item.value.url = target
      unfurlError.value = 'Could not fetch page info — you can fill in details manually'
    } finally {
      unfurling.value = false
    }
  }

  function handleUrlKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      unfurlUrl(urlInput.value)
    }
  }

  function handleUrlPaste(e: ClipboardEvent) {
    const pasted = e.clipboardData?.getData('text') || ''
    if (pasted && /^https?:\/\//i.test(pasted.trim())) {
      // Auto-unfurl pasted URLs after a tick (so the input value updates first)
      nextTick(() => unfurlUrl(pasted.trim()))
    }
  }

  // ── Embed URL conversion for known services ────────────────────────────
  const embedUrl = computed(() => {
    if (!url.value) return ''
    try {
      const u = new URL(url.value)
      const host = u.hostname.replace(/^www\./, '')

      // YouTube — youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
      if (host === 'youtube.com' || host === 'm.youtube.com') {
        const videoId = u.searchParams.get('v')
        if (videoId) return `https://www.youtube.com/embed/${videoId}`
        const shortsMatch = u.pathname.match(/\/shorts\/([^/?]+)/)
        if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`
        const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/)
        if (embedMatch) return url.value
      }
      if (host === 'youtu.be') {
        const videoId = u.pathname.slice(1).split('/')[0]
        if (videoId) return `https://www.youtube.com/embed/${videoId}`
      }

      // Vimeo — vimeo.com/ID
      if (host === 'vimeo.com') {
        const videoId = u.pathname.match(/^\/(\d+)/)
        if (videoId) return `https://player.vimeo.com/video/${videoId[1]}`
      }
      if (host === 'player.vimeo.com') return url.value

      // Spotify — open.spotify.com/track|album|playlist|episode|show/ID
      if (host === 'open.spotify.com') {
        const match = u.pathname.match(/^\/(track|album|playlist|episode|show)\/([^/?]+)/)
        if (match) return `https://open.spotify.com/embed/${match[1]}/${match[2]}`
      }

      return url.value
    } catch {
      return url.value
    }
  })

  const isEmbedService = computed(() => embedUrl.value !== url.value)

  // ── Iframe state ───────────────────────────────────────────────────────
  const iframeError = ref(false)
  const iframeLoading = ref(true)

  function onIframeLoad() {
    iframeLoading.value = false
  }

  function onIframeError() {
    iframeLoading.value = false
    iframeError.value = true
  }

  function openExternal() {
    window.open(url.value, '_blank', 'noopener,noreferrer')
  }

  watch(url, () => {
    iframeError.value = false
    iframeLoading.value = true
  })
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0">

    <!-- ================= CREATE: URL-first input ================= -->
    <template v-if="mode === 'create' && !url">
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="w-full max-w-md space-y-4">
          <div class="text-center space-y-2">
            <div class="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto">
              <Icon name="lucide:link" class="h-6 w-6 text-sky-500" />
            </div>
            <p class="text-sm font-medium">Add a bookmark</p>
            <p class="text-xs text-muted-foreground">Paste or type a URL to save it. We'll grab the title and details automatically.</p>
          </div>

          <div class="relative">
            <div class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
              <Icon v-if="!unfurling" name="lucide:globe" class="h-4 w-4 text-muted-foreground shrink-0" />
              <Icon v-else name="lucide:loader-2" class="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
              <input
                v-model="urlInput"
                type="url"
                placeholder="https://..."
                class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 font-mono"
                :disabled="unfurling"

                @keydown="handleUrlKeydown"
                @paste="handleUrlPaste" />
              <button
                v-if="urlInput && !unfurling"
                type="button"
                class="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                @click="unfurlUrl(urlInput)">
                Add
              </button>
            </div>
            <p v-if="unfurlError" class="mt-1.5 text-xs text-destructive">{{ unfurlError }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- ================= PREVIEW (edit/view or after URL set) ================= -->
    <template v-else-if="url">
      <!-- URL bar -->
      <div class="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30 shrink-0">
        <img
          v-if="item.favicon"
          :src="item.favicon"
          :alt="domain"
          class="h-4 w-4 shrink-0 rounded-sm"
          @error="($event.target as HTMLImageElement).style.display = 'none'" />
        <Icon v-else name="lucide:globe" class="h-4 w-4 shrink-0 text-muted-foreground" />
        <span class="text-xs text-muted-foreground font-mono truncate flex-1">{{ url }}</span>
        <button
          v-if="!scanning"
          type="button"
          class="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          title="Scan page for people, organizations, and tags"
          @click="fetchSuggestions(url)">
          <Icon name="lucide:sparkles" class="h-3 w-3" />
          Scan
        </button>
        <Icon v-else name="lucide:loader-2" class="h-3 w-3 text-muted-foreground animate-spin shrink-0" />
        <button
          type="button"
          class="shrink-0 flex items-center gap-1 text-xs text-primary hover:underline"
          @click="openExternal">
          <Icon name="lucide:external-link" class="h-3 w-3" />
          Open
        </button>
      </div>

      <!-- Suggested entities from page -->
      <div
        v-if="hasSuggestions || scanning"
        class="px-4 py-2.5 border-b border-border bg-muted/20 shrink-0 space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Icon name="lucide:sparkles" class="h-3 w-3 text-amber-500" />
            Suggested from page
          </p>
          <button
            v-if="hasSuggestions"
            type="button"
            class="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            @click="suggestionsCollapsed = !suggestionsCollapsed">
            {{ suggestionsCollapsed ? 'Show' : 'Hide' }}
          </button>
        </div>

        <template v-if="!suggestionsCollapsed">
          <!-- Entity suggestions -->
          <div v-if="suggestions.length" class="flex flex-wrap gap-1.5">
            <div
              v-for="s in suggestions"
              :key="`${s.type}::${s.name}`"
              class="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs transition-colors hover:bg-muted/50">
              <div :class="['w-5 h-5 rounded flex items-center justify-center shrink-0', getSuggestionColor(s.type)]">
                <Icon :name="getSuggestionIcon(s.type)" class="h-3 w-3" />
              </div>
              <span class="truncate max-w-[140px]">{{ s.name }}</span>
              <span class="shrink-0 text-[9px] font-medium text-muted-foreground bg-muted/60 rounded px-1 py-0.5 capitalize">
                {{ s.type }}
              </span>
              <button
                type="button"
                class="shrink-0 h-4 w-4 flex items-center justify-center rounded hover:bg-primary/10 text-primary transition-colors"
                title="Add as reference"
                @click.stop="acceptSuggestion(s)">
                <Icon name="lucide:plus" class="h-3 w-3" />
              </button>
              <button
                type="button"
                class="shrink-0 h-4 w-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                title="Dismiss"
                @click.stop="dismissSuggestion(s)">
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
                @click.stop="acceptTag(tag)">
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
            Scanning page for entities...
          </div>
        </template>
      </div>

      <!-- Iframe preview -->
      <div v-if="!iframeError" class="flex-1 relative min-h-0">
        <div
          v-if="iframeLoading"
          class="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div class="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon name="lucide:loader-2" class="h-5 w-5 animate-spin" />
            <span class="text-xs">Loading preview...</span>
          </div>
        </div>
        <iframe
          :src="embedUrl"
          :title="item.title || 'Bookmark preview'"
          class="w-full h-full border-0"
          :sandbox="isEmbedService ? undefined : 'allow-scripts allow-same-origin allow-popups allow-forms'"
          :referrerpolicy="isEmbedService ? undefined : 'no-referrer'"
          :allow="isEmbedService ? 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture' : undefined"
          loading="lazy"
          @load="onIframeLoad"
          @error="onIframeError" />
      </div>

      <!-- Fallback when iframe is blocked -->
      <div v-if="iframeError" class="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div v-if="item.thumbnail" class="w-full max-w-sm rounded-lg overflow-hidden border border-border shadow-sm">
          <img :src="item.thumbnail" :alt="item.title" class="w-full object-cover" />
        </div>
        <div v-else class="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon name="lucide:globe" class="h-8 w-8 text-muted-foreground/50" />
        </div>
        <div class="space-y-1.5 max-w-md">
          <p class="text-sm font-medium">{{ item.title || 'Untitled bookmark' }}</p>
          <p v-if="item.excerpt || item.description" class="text-xs text-muted-foreground leading-relaxed">
            {{ item.excerpt || item.description }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-muted-foreground/60">This site doesn't allow embedding</span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            @click="openExternal">
            <Icon name="lucide:external-link" class="h-3 w-3" />
            Open in new tab
          </button>
        </div>
      </div>
    </template>

    <!-- No URL (edit/view mode without URL) — show inline URL input -->
    <div v-else class="flex-1 flex items-center justify-center p-8">
      <div class="w-full max-w-md space-y-4">
        <div class="text-center space-y-2">
          <div class="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center mx-auto">
            <Icon name="lucide:link" class="h-6 w-6 text-sky-500" />
          </div>
          <p class="text-sm font-medium">Add a URL</p>
          <p class="text-xs text-muted-foreground">Paste or type a URL to save it. We'll grab the title and details automatically.</p>
        </div>

        <div class="relative">
          <div class="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
            <Icon v-if="!unfurling" name="lucide:globe" class="h-4 w-4 text-muted-foreground shrink-0" />
            <Icon v-else name="lucide:loader-2" class="h-4 w-4 text-muted-foreground shrink-0 animate-spin" />
            <input
              v-model="urlInput"
              type="url"
              placeholder="https://..."
              class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 font-mono"
              :disabled="unfurling"
              @keydown="handleUrlKeydown"
              @paste="handleUrlPaste" />
            <button
              v-if="urlInput && !unfurling"
              type="button"
              class="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              @click="unfurlUrl(urlInput)">
              Add
            </button>
          </div>
          <p v-if="unfurlError" class="mt-1.5 text-xs text-destructive">{{ unfurlError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
