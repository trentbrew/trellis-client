<script setup lang="ts">
  import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { getEntityClass } from '~/types/entity'
  import { stripHtml } from '~/utils/stripHtml'
  import { formatRecurrenceLabel } from '~/utils/recurrence'

  const props = withDefaults(
    defineProps<{
      item: Entity
      layout?: 'grid' | 'list' | 'moodboard'
      /** Whether this card is currently selected */
      selected?: boolean
      /** Enable inline field editing on this card */
      editable?: boolean
      /** Owner list for the owner picker */
      owners?: { id: string; name: string }[]
    }>(),
    { layout: 'grid', selected: false, editable: false, owners: () => [] },
  )

  const config = computed(() => getEntityTypeConfig(props.item.type as any))
  const entityClass = computed(() => getEntityClass(props.item.type as EntityType))
  const i = computed(() => props.item as any)

  // ─── Entity class booleans ───
  const isTemporal = computed(() => entityClass.value === 'temporal')
  const isDocument = computed(() => entityClass.value === 'document')
  const isActor = computed(() => entityClass.value === 'actor')
  const isContainer = computed(() => entityClass.value === 'container')

  // ─── Entity type booleans ───
  const isBookmark = computed(() => i.value.type === 'bookmark')
  const isNote = computed(() => i.value.type === 'note')
  const isFile = computed(() => i.value.type === 'file')
  const isOrg = computed(() => i.value.type === 'organization')

  // ─── Preview detection ───
  const thumbnailSrc = computed(() => i.value.thumbnail || null)
  const avatarSrc = computed(() => i.value.logo || i.value.avatar || null)
  const _hasPreview = computed(() => {
    if (isBookmark.value) return true
    if (isNote.value && i.value.content) return true
    if (isFile.value) return true
    if (isActor.value) return true
    return false
  })

  const initials = computed(() => {
    const t = typeof props.item.title === 'string' ? props.item.title : String(props.item.title ?? '')
    return t
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  })

  // ─── File type icons ───
  const mimeIconMap: Record<string, { icon: string; color: string }> = {
    'application/pdf': { icon: 'lucide:file-text', color: 'text-red-500' },
    'image/': { icon: 'lucide:image', color: 'text-purple-500' },
    'video/': { icon: 'lucide:video', color: 'text-blue-500' },
    'audio/': { icon: 'lucide:music', color: 'text-pink-500' },
    'text/': { icon: 'lucide:file-code', color: 'text-emerald-500' },
    'application/vnd': { icon: 'lucide:file-spreadsheet', color: 'text-green-500' },
  }
  const fileMeta = computed(() => {
    const mime = i.value.mimeType || ''
    for (const [prefix, meta] of Object.entries(mimeIconMap)) if (mime.startsWith(prefix)) return meta
    return { icon: 'lucide:file', color: 'text-muted-foreground' }
  })

  // ─── Content helpers ───
  const description = computed(() => {
    const d = i.value.description || i.value.excerpt || ''
    return stripHtml(d).slice(0, 300)
  })

  const contentPreview = computed(() => {
    if (!i.value.content) return ''
    return stripHtml(i.value.content).slice(0, 300)
  })

  // ─── Display helpers (placeholders for empty fields) ───
  const displayTitle = computed(() => props.item.title || 'Untitled')
  const hasRealTitle = computed(() => !!props.item.title)
  const displayDescription = computed(() => description.value || contentPreview.value || 'No description')
  const hasRealDescription = computed(() => !!(description.value || contentPreview.value))

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  // ─── Status / priority / category colors ───
  const itemStatus = computed(() => {
    if (isTemporal.value)
      return (
        i.value.taskStatus ||
        i.value.tripStatus ||
        i.value.paymentStatus ||
        i.value.sprintStatus ||
        i.value.budgetStatus ||
        ''
      )
    if (isContainer.value) return i.value.status || ''
    return ''
  })

  const statusColors: Record<string, string> = {
    pending: 'bg-gray-500/10 text-gray-400',
    'in-progress': 'bg-blue-500/10 text-blue-400',
    'on-track': 'bg-emerald-500/10 text-emerald-400',
    'due-soon': 'bg-amber-500/10 text-amber-400',
    overdue: 'bg-red-500/10 text-red-400',
    completed: 'bg-emerald-500/10 text-emerald-400',
    planning: 'bg-purple-500/10 text-purple-400',
    booked: 'bg-blue-500/10 text-blue-400',
    active: 'bg-emerald-500/10 text-emerald-400',
    cancelled: 'bg-red-500/10 text-red-400',
    paid: 'bg-emerald-500/10 text-emerald-400',
    draft: 'bg-gray-500/10 text-gray-400',
    closed: 'bg-gray-500/10 text-gray-400',
    'over-budget': 'bg-red-500/10 text-red-400',
    archived: 'bg-gray-500/10 text-gray-400',
    'on-hold': 'bg-amber-500/10 text-amber-400',
  }

  const categoryColors: Record<string, string> = {
    work: 'bg-blue-500/10 text-blue-400',
    personal: 'bg-emerald-500/10 text-emerald-400',
    health: 'bg-rose-500/10 text-rose-400',
    travel: 'bg-amber-500/10 text-amber-400',
    general: 'bg-gray-500/10 text-gray-400',
    client: 'bg-purple-500/10 text-purple-400',
    vendor: 'bg-orange-500/10 text-orange-400',
  }

  const priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
  }

  // ─── Progress (containers / goals only) ───
  const progressPercent = computed(() => {
    if (!isContainer.value) return null
    if (i.value.targetValue && i.value.targetValue > 0)
      return Math.min(100, Math.round(((i.value.currentValue ?? 0) / i.value.targetValue) * 100))
    if (i.value.progress != null) return Math.round(i.value.progress * 100)
    return null
  })

  // ─── Metric (budget/payment amounts, sprint velocity) ───
  const metricDisplay = computed(() => {
    if ((i.value.type === 'budget' || i.value.type === 'payment') && i.value.amount != null)
      return `${i.value.currency || '$'}${i.value.amount.toLocaleString()}`
    if (i.value.type === 'sprint' && i.value.velocity) return `${i.value.velocity} pts`
    return null
  })

  const formatBytes = (bytes: number | undefined) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (d: string) => {
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return d
    }
  }

  const dateDisplay = computed(() => {
    if (!isTemporal.value && !isContainer.value) return null
    const start = i.value.startDate
    const end = i.value.endDate || i.value.targetDate
    if (!start && !end) return null
    return formatDate(start || end)
  })

  const endDateDisplay = computed(() => {
    if (!isTemporal.value && !isContainer.value) return null
    const end = i.value.endDate || i.value.targetDate
    if (!end || !i.value.startDate) return null
    return formatDate(end)
  })

  const isCompleted = computed(
    () => isTemporal.value && (i.value.taskStatus === 'completed' || i.value.achieved === true),
  )

  const refCount = computed(() => (i.value.references || []).filter((r: any) => r.kind === 'entity').length)

  const recurrenceLabel = computed(() => {
    if (!isTemporal.value) return null
    if (i.value.recurrence?.frequency) return formatRecurrenceLabel(i.value.recurrence)
    if (i.value._recurringLabel) return i.value._recurringLabel
    if (i.value.recurringEventId || (i.value.googleEventId && String(i.value.googleEventId).includes('_'))) {
      return 'Recurring event'
    }
    return null
  })

  // ─── Inline tag input (footer) ───
  const showTagInput = ref(false)
  const cardTagInput = ref('')
  const tagInputEl = ref<HTMLInputElement | null>(null)

  const emit = defineEmits<{
    click: []
    select: [event: MouseEvent]
    'field-update': [fieldId: PropertyFieldId, value: unknown]
  }>()

  const addCardTag = () => {
    const t = cardTagInput.value.trim()
    if (t) {
      const existing = props.item.tags || []
      if (!existing.includes(t)) {
        emit('field-update', 'tags', [...existing, t])
      }
    }
    cardTagInput.value = ''
    showTagInput.value = false
  }

  const openTagInput = () => {
    showTagInput.value = true
    nextTick(() => tagInputEl.value?.focus())
  }
</script>

<template>
  <!-- ═══════ LIST LAYOUT ═══════ -->
  <div
    v-if="layout === 'list'"
    class="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-all cursor-pointer group"
    @click="$emit('click')">
    <!-- Preview thumbnail (left) -->
    <div class="shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted/40 flex items-center justify-center">
      <img
        v-if="isBookmark && thumbnailSrc"
        :src="thumbnailSrc"
        :alt="item.title"
        class="w-full h-full object-cover"
        loading="lazy" />
      <img
        v-else-if="isActor && avatarSrc"
        :src="avatarSrc"
        :alt="item.title"
        class="w-full h-full object-cover"
        :class="isOrg ? 'rounded-md' : 'rounded-full'" />
      <span v-else-if="isActor" :class="['text-xs font-semibold', `text-${config.color}-500`]">{{ initials }}</span>
      <Icon v-else-if="isFile" :name="fileMeta.icon" :class="['h-6 w-6', fileMeta.color]" />
      <Icon v-else :name="config.icon" :class="['h-5 w-5', `text-${config.color}-500`]" />
    </div>

    <!-- Content (right) -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-0.5">
        <h3 class="text-sm font-medium truncate" :class="{ 'line-through text-muted-foreground': isCompleted }">
          {{ item.title }}
        </h3>
        <Icon v-if="isDocument && i.pinned" name="lucide:pin" class="h-3 w-3 text-amber-500 shrink-0" />
        <span
          v-if="itemStatus"
          :class="[
            'ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            statusColors[itemStatus] || 'bg-muted text-muted-foreground',
          ]">
          {{ itemStatus }}
        </span>
      </div>

      <p v-if="isActor && (i.jobTitle || i.organization)" class="text-xs text-muted-foreground truncate mb-0.5">
        {{ [i.jobTitle, i.organization].filter(Boolean).join(' · ') }}
      </p>

      <p v-if="description || contentPreview" class="text-xs text-muted-foreground line-clamp-1 mb-1">
        {{ description || contentPreview }}
      </p>

      <div class="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span
          v-if="i.category"
          :class="[
            'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            categoryColors[i.category] || 'bg-muted text-muted-foreground',
          ]">
          {{ i.category }}
        </span>
        <span v-if="(isTemporal || isContainer) && dateDisplay" class="flex items-center gap-1">
          <Icon name="lucide:calendar" class="h-3 w-3 opacity-50" />
          {{ dateDisplay }}
        </span>
        <span v-if="isFile && i.sizeBytes" class="opacity-60">{{ formatBytes(i.sizeBytes) }}</span>
        <template v-if="(item.tags || []).length">
          <span
            v-for="tag in item.tags.slice(0, 2)"
            :key="tag"
            class="bg-muted/80 px-1.5 py-0.5 rounded text-[10px] font-medium">
            #{{ tag }}
          </span>
        </template>
      </div>
    </div>
  </div>

  <!-- ═══════ GRID / MOODBOARD LAYOUT ═══════ -->
  <div
    v-else
    class="group relative flex flex-col rounded-lg border bg-card overflow-hidden cursor-pointer transition-all"
    :class="[
      layout === 'moodboard' ? 'mb-3 break-inside-avoid' : '',
      selected
        ? 'border-primary ring-2 ring-primary/30 bg-primary/2'
        : 'border-border hover:ring-1 hover:ring-primary/30',
    ]"
    @click="$emit('click')">
    <!-- Pinned indicator (absolute overlay, documents only) -->
    <div v-if="isDocument && i.pinned" class="absolute top-2 right-2 z-20">
      <Icon name="lucide:pin" class="h-3.5 w-3.5 text-amber-500 drop-shadow" />
    </div>

    <!-- ─── Preview: Bookmark thumbnail ─── -->
    <div
      v-if="isBookmark"
      class="overflow-hidden border-b border-border/50"
      :class="layout === 'grid' ? 'aspect-video' : ''">
      <img
        v-if="thumbnailSrc"
        :src="thumbnailSrc"
        :alt="item.title"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy" />
      <div
        v-else
        class="h-full min-h-24 flex flex-col items-center justify-center bg-muted/40 text-muted-foreground/40">
        <Icon name="lucide:globe" class="h-8 w-8" />
        <span class="text-xs font-mono mt-1">{{ getDomain(i.url || '') }}</span>
      </div>
    </div>

    <!-- ─── Preview: File icon ─── -->
    <div v-else-if="isFile" class="aspect-video bg-muted/40 flex items-center justify-center border-b border-border/50">
      <Icon :name="fileMeta.icon" :class="['h-10 w-10', fileMeta.color]" />
    </div>

    <!-- ─── Preview: Note rendered content ─── -->
    <div v-else-if="isNote" class="relative border-b bg-background/50 border-border">
      <div
        class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background/50 pointer-events-none z-10" />
      <div
        v-if="i.content"
        class="prose prose-sm dark:prose-invert max-w-none text-[8px] leading-relaxed p-3 overflow-hidden opacity-50"
        :class="layout === 'grid' ? 'h-32' : 'h-48'"
        v-html="i.content" />
      <div
        v-else
        class="flex items-center justify-center text-muted-foreground/30"
        :class="layout === 'grid' ? 'h-32' : 'h-48'">
        <Icon name="lucide:sticky-note" class="h-8 w-8" />
      </div>
    </div>

    <!-- ─── Preview: Generic document icon (page, template, slide_deck, etc.) ─── -->
    <div
      v-else-if="entityClass === 'document'"
      class="aspect-video bg-muted/40 flex items-center justify-center border-b border-border/50">
      <Icon :name="config.icon" :class="['h-10 w-10', `text-${config.color}-500/50`]" />
    </div>

    <!-- ─── Preview: Actor avatar ─── -->
    <div
      v-else-if="isActor"
      class="aspect-video flex items-center justify-center bg-muted/40 border-b border-border/50">
      <div
        :class="[
          'flex items-center justify-center text-lg font-semibold overflow-hidden',
          isOrg ? 'h-12 w-12 rounded-lg' : 'h-12 w-12 rounded-full',
          `bg-${config.color}-500/10 text-${config.color}-500`,
        ]">
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          class="h-full w-full object-cover"
          :class="isOrg ? 'rounded-lg' : 'rounded-full'"
          :alt="item.title" />
        <template v-else>{{ initials }}</template>
      </div>
    </div>

    <!-- ─── Content area ─── -->
    <div class="p-3 space-y-1.5 flex-1">
      <!-- Meta row -->
      <div class="flex items-center gap-1.5 min-w-0">
        <template v-if="isBookmark">
          <img
            v-if="i.favicon"
            :src="i.favicon"
            :alt="i.siteName || ''"
            class="h-3.5 w-3.5 shrink-0 rounded-sm"
            @error="($event.target as HTMLImageElement).style.display = 'none'" />
          <Icon v-else name="lucide:bookmark" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <span class="text-[11px] text-muted-foreground truncate font-mono">
            {{ i.siteName || getDomain(i.url || '') }}
          </span>
        </template>
        <template v-else>
          <Icon :name="config.icon" :class="['h-3.5 w-3.5 shrink-0', `text-${config.color}-500`]" />
        </template>

        <!-- Category: inline editor or static badge -->
        <template v-if="i.category">
          <div v-if="editable" @click.stop>
            <EntityFieldEditor
              :field-id="'category'"
              :model-value="i.category"
              :entity-type="i.type"
              compact
              display="pill"
              @update:model-value="$emit('field-update', 'category', $event)" />
          </div>
          <span
            v-else
            :class="[
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              categoryColors[i.category] || 'bg-muted text-muted-foreground',
            ]">
            {{ i.category }}
          </span>
        </template>

        <div class="flex-1" />

        <!-- Priority: inline editor or static badge (temporal only) -->
        <template v-if="isTemporal && i.priority">
          <div v-if="editable" @click.stop>
            <EntityFieldEditor
              :field-id="'priority'"
              :model-value="i.priority"
              :entity-type="i.type"
              compact
              display="pill"
              @update:model-value="$emit('field-update', 'priority', $event)" />
          </div>
          <span v-else :class="['text-[10px] font-medium', priorityColors[i.priority] || 'text-muted-foreground']">
            {{ i.priority }}
          </span>
        </template>

        <!-- Status: inline editor or static badge (temporal + container only) -->
        <template v-if="(isTemporal || isContainer) && itemStatus">
          <div v-if="editable" @click.stop>
            <EntityFieldEditor
              :field-id="'status'"
              :model-value="itemStatus"
              :entity-type="i.type"
              compact
              display="pill"
              @update:model-value="$emit('field-update', 'status', $event)" />
          </div>
          <span
            v-else
            :class="[
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              statusColors[itemStatus] || 'bg-muted text-muted-foreground',
            ]">
            {{ itemStatus }}
          </span>
        </template>
      </div>

      <!-- Title -->
      <h3
        class="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors"
        :class="[
          isCompleted ? 'line-through text-muted-foreground' : '',
          !hasRealTitle ? 'text-muted-foreground/50 italic' : '',
        ]">
        {{ displayTitle }}
      </h3>

      <!-- Actor subtitle -->
      <p v-if="isActor && (i.jobTitle || i.organization)" class="text-xs text-muted-foreground truncate">
        {{ [i.jobTitle, i.organization].filter(Boolean).join(' · ') }}
      </p>

      <!-- Description -->
      <p
        class="text-xs"
        :class="[
          layout === 'moodboard' ? 'line-clamp-4' : 'line-clamp-2',
          hasRealDescription ? 'text-muted-foreground' : 'text-muted-foreground/40 italic',
        ]">
        {{ displayDescription }}
      </p>

      <!-- Recurrence badge -->
      <div v-if="recurrenceLabel" class="flex items-center gap-1 text-[10px] text-primary/70">
        <Icon name="lucide:repeat" class="h-3 w-3 shrink-0" />
        <span class="truncate">{{ recurrenceLabel }}</span>
      </div>

      <!-- Actor contact info -->
      <div v-if="isActor && (i.email || i.phone)" class="flex items-center gap-3 text-xs text-muted-foreground">
        <span v-if="i.email" class="flex items-center gap-1 truncate">
          <Icon name="lucide:mail" class="h-3 w-3 shrink-0 opacity-50" />
          {{ i.email }}
        </span>
        <span v-if="i.phone" class="flex items-center gap-1">
          <Icon name="lucide:phone" class="h-3 w-3 shrink-0 opacity-50" />
          {{ i.phone }}
        </span>
      </div>

      <!-- Metric (budget/payment amount, sprint velocity) -->
      <p v-if="metricDisplay" class="text-base font-semibold">{{ metricDisplay }}</p>

      <!-- Progress bar (containers only) -->
      <div v-if="isContainer && progressPercent != null" class="space-y-1">
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>{{ i.metric || 'Progress' }}</span>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>

      <!-- File size -->
      <p v-if="isFile && i.sizeBytes" class="text-xs text-muted-foreground">{{ formatBytes(i.sizeBytes) }}</p>
    </div>

    <!-- ─── Footer ─── -->
    <div
      class="flex items-center justify-between text-xs text-muted-foreground px-3 h-9 mt-auto border-t border-border/50">
      <!-- Left: checkbox + date -->
      <div class="flex items-center gap-2">
        <button
          v-if="editable"
          type="button"
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors"
          :class="[
            selected ? 'bg-primary border-primary' : 'border-border hover:border-primary/60',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          ]"
          @click.stop="$emit('select', $event)">
          <Icon v-if="selected" name="lucide:check" class="h-2.5 w-2.5 text-primary-foreground" />
        </button>
        <div class="flex items-center gap-1.5">
          <Icon v-if="dateDisplay" name="lucide:calendar" class="h-3 w-3 opacity-50" />
          <span v-if="dateDisplay">{{ dateDisplay }}</span>
          <template v-if="endDateDisplay">
            <span class="opacity-40">→</span>
            <span>{{ endDateDisplay }}</span>
          </template>
        </div>
      </div>
      <!-- Right: tags + inline tag input -->
      <div class="flex items-center gap-1.5 min-w-0" @click.stop>
        <span v-if="isActor && refCount" class="flex items-center gap-0.5 text-[10px] opacity-60">
          <Icon name="lucide:link" class="h-3 w-3" />
          {{ refCount }}
        </span>
        <template v-if="(item.tags || []).length">
          <span
            v-for="tag in item.tags.slice(0, 2)"
            :key="tag"
            class="bg-muted/80 px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[80px]">
            #{{ tag }}
          </span>
          <span v-if="item.tags.length > 2" class="text-[10px] opacity-60">+{{ item.tags.length - 2 }}</span>
        </template>
        <!-- Inline tag input (visible on click) -->
        <input
          v-if="editable && showTagInput"
          ref="tagInputEl"
          v-model="cardTagInput"
          type="text"
          placeholder="tag..."
          class="bg-transparent text-[10px] outline-none w-16 placeholder:text-muted-foreground/40"
          @keydown.enter.prevent="addCardTag"
          @blur="addCardTag"
          @keydown.escape.prevent="((showTagInput = false), (cardTagInput = ''))" />
        <!-- Add tag trigger (visible on hover when no input shown) -->
        <button
          v-else-if="editable"
          type="button"
          class="flex items-center gap-0.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
          @click.stop="openTagInput">
          <Icon name="lucide:hash" class="h-3 w-3" />
        </button>
      </div>
    </div>
  </div>
</template>
