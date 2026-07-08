<script setup lang="ts">
  import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
  import type { CardPropertyKey } from '~/lib/card-property-visibility'
  import type { ViewFieldDefinition } from '~/lib/view-field-catalog'
  import { buildViewFieldCatalog, partitionViewFields } from '~/lib/view-field-catalog'
  import { filterFileCardVisibleKeys, getFileCategoryBadges } from '~/lib/file-card-view-profiles'
  import EntityCardOrderedFields from '~/components/entity/cards/EntityCardOrderedFields.vue'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { getEntityClass } from '~/types/entity'
  import { stripHtml } from '~/utils/stripHtml'
  import { formatRecurrenceLabel } from '~/utils/recurrence'
  import { getFileCategoryMeta, type FileCategory } from '~/utils/fileClassification'
  import { buildEmailSrcdoc } from '~/lib/emailRender'
  import * as XLSX from 'xlsx'

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
      /** Custom fields for dynamic entity types — rendered in preview area */
      fields?: { key: string; label: string; value: unknown }[]
      /** Ordered card-face property keys to show. Omit for all defaults. */
      visibleProperties?: CardPropertyKey[] | null
      /** P1: ordered visible field keys (builtins + ontology). */
      visibleFields?: string[] | null
      fieldCatalog?: ViewFieldDefinition[]
      /** When false, hide description placeholders for empty values. */
      showEmptyProperties?: boolean
      /** Dense list/kanban face — tiny title icon, collapsible badge props. */
      compact?: boolean
      propertiesExpanded?: boolean
    }>(),
    { layout: 'grid', selected: false, editable: false, owners: () => [], showEmptyProperties: false, compact: false, propertiesExpanded: false },
  )

  const resolvedCatalog = computed(() =>
    props.fieldCatalog?.length ? props.fieldCatalog : buildViewFieldCatalog('all'),
  )

  const effectiveVisible = computed(() => props.visibleFields ?? props.visibleProperties ?? null)

  const fieldPartition = computed(() => partitionViewFields(effectiveVisible.value, resolvedCatalog.value))

  const ontologyDefByKey = computed(() => {
    const map: Record<string, ViewFieldDefinition> = {}
    for (const field of resolvedCatalog.value) {
      if (field.source === 'ontology') map[field.key] = field
    }
    return map
  })

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
  const isProject = computed(() => i.value.type === 'project')
  const isFile = computed(() => i.value.type === 'file')

  const cardFieldPartition = computed(() => {
    const part = fieldPartition.value
    if (!isFile.value) return part
    const filtered = filterFileCardVisibleKeys(
      [...part.meta, ...part.body],
      i.value as Record<string, unknown>,
    )
    return {
      meta: filtered.filter((k) => part.meta.includes(k)),
      body: filtered.filter((k) => part.body.includes(k)),
    }
  })

  const fileCategoryBadges = computed(() => {
    if (!isFile.value) return []
    // Preview overlay already shows extension + size — footer badges are category enrichment only.
    return getFileCategoryBadges(i.value as Record<string, unknown>).filter(
      (b) => !['sizeBytes', 'fileExtension', 'mimeType'].includes(b.key),
    )
  })

  // Guard against stale blob: URLs baked into older file entities — those
  // blob handles are dead after reload and trigger WebKitBlobResource errors.
  const fileUrl = computed<string | null>(() => {
    const u = i.value.url
    if (typeof u !== 'string' || !u) return null
    if (u.startsWith('blob:')) return null
    return u
  })
  const isEmail = computed(() => i.value.type === 'email')
  const emailSrcdoc = computed(() => (isEmail.value ? buildEmailSrcdoc(i.value, { thumbnail: true }) : ''))

  // ─── Lazy-mount email thumbnail iframe ───
  // Rendering 50+ iframes at once blocks the main thread and triggers
  // external font/stylesheet/image loads for every off-screen card. Only
  // mount the iframe when the card actually enters the viewport.
  const emailThumbRef = ref<HTMLElement | null>(null)
  const emailThumbVisible = ref(false)

  onMounted(() => {
    if (!isEmail.value) return
    if (typeof IntersectionObserver === 'undefined') {
      emailThumbVisible.value = true
      return
    }
    const el = emailThumbRef.value
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            emailThumbVisible.value = true
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    onUnmounted(() => observer.disconnect())
  })
  const isOrg = computed(() => i.value.type === 'organization')

  // ─── Transport icon (trip preview) ───
  const transportIcons: Record<string, string> = {
    flight: 'lucide:plane',
    drive: 'lucide:car',
    train: 'lucide:train-front',
    bus: 'lucide:bus',
    other: 'lucide:navigation',
  }
  const transportIcon = computed(() => transportIcons[i.value.transportation as string] || 'lucide:arrow-right')

  // ─── Preview detection ───
  const thumbnailSrc = computed(() => i.value.thumbnail || null)
  const avatarSrc = computed(() => i.value.logo || i.value.avatar || null)
  const initials = computed(() => {
    const t = typeof props.item.title === 'string' ? props.item.title : String(props.item.title ?? '')
    return t
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  })

  // ─── File type metadata ───
  const fileMeta = computed(() => {
    const category = (i.value.fileCategory as FileCategory) || 'other'
    return getFileCategoryMeta(category)
  })

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const fileExtensionLabel = computed(() => {
    const ext = i.value.fileExtension
    if (typeof ext === 'string' && ext.trim()) return ext.toUpperCase()
    return fileMeta.value.label
  })

  // ─── Spreadsheet / CSV thumbnail data ───
  const isTableFile = computed(() => i.value.fileCategory === 'spreadsheet' || i.value.fileExtension === 'csv')
  const cardTableData = ref<{ headers: string[]; rows: any[][] } | null>(null)

  watchEffect(async () => {
    if (!isTableFile.value || !i.value.url) {
      cardTableData.value = null
      return
    }
    try {
      const res = await fetch(i.value.url)
      if (!res.ok) return
      const ab = await res.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0] as string]
      const json = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 })
      cardTableData.value = {
        headers: (json[0] || []).map(String),
        rows: json.slice(1, 8), // only 7 rows needed for the thumbnail
      }
    } catch {
      cardTableData.value = null
    }
  })

  // ─── Content helpers ───
  const description = computed(() => {
    const d = i.value.description || i.value.excerpt || ''
    return stripHtml(d).slice(0, 300)
  })

  const fileCardSubtitle = computed(() => {
    if (!isFile.value) return ''
    const desc = description.value.trim()
    if (desc) return desc
    if (i.value.updatedAt) return `Edited ${formatRelativeTime(i.value.updatedAt)}`
    return ''
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

  const formatTime = (t: string) => {
    try {
      const parts = t.split(':').map(Number)
      const h = parts[0] ?? 0
      const m = parts[1] ?? 0
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hour = h % 12 || 12
      return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
    } catch {
      return t
    }
  }

  // ─── Stylized date parts for event / appointment preview ───
  const eventDateParts = computed(() => {
    if (i.value.type !== 'event' && i.value.type !== 'appointment') return null
    const dateStr = i.value.startDate
    if (!dateStr) return null
    const d = new Date(dateStr + 'T00:00:00')
    return {
      dayOfWeek: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'long' }),
      year: d.getFullYear(),
      timeRange:
        i.value.startTime && i.value.endTime
          ? `${formatTime(i.value.startTime)} – ${formatTime(i.value.endTime)}`
          : null,
    }
  })

  const dateDisplay = computed(() => {
    if (!isTemporal.value && !isContainer.value) return null
    const start = i.value.startDate
    const end = i.value.endDate || i.value.targetDate
    if (!start && !end) return null
    return formatDate(start || end)
  })

  const isCompleted = computed(
    () => isTemporal.value && (i.value.taskStatus === 'completed' || i.value.achieved === true),
  )

  const recurrenceLabel = computed(() => {
    if (!isTemporal.value) return null
    if (i.value.recurrence?.frequency) return formatRecurrenceLabel(i.value.recurrence)
    if (i.value._recurringLabel) return i.value._recurringLabel
    if (i.value.recurringEventId || (i.value.googleEventId && String(i.value.googleEventId).includes('_'))) {
      return 'Recurring event'
    }
    return null
  })

  const emit = defineEmits<{
    click: []
    select: [event: MouseEvent]
    'field-update': [fieldId: PropertyFieldId, value: unknown]
    'column-update': [key: string, value: unknown]
    'toggle-properties': []
  }>()
</script>

<template>
  <!-- ═══════ LIST LAYOUT ═══════ -->
  <div
    v-if="layout === 'list'"
    class="rounded-lg border border-border bg-card hover:bg-muted/50 transition-all cursor-pointer group"
    :class="compact ? 'p-2' : 'flex items-start gap-3 p-3'"
    @click="$emit('click')">
    <!-- Preview thumbnail (default list only) -->
    <div
      v-if="!compact"
      class="shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted/40 flex items-center justify-center">
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
      <Icon v-else-if="isFile" :name="fileMeta.icon" :class="['h-6 w-6', `text-${fileMeta.color}-500`]" />
      <Icon v-else :name="config.icon" :class="['h-5 w-5', `text-${config.color}-500`]" />
    </div>

    <!-- Content -->
    <EntityCardOrderedFields
      :class="compact ? 'min-w-0 w-full' : 'flex-1 min-w-0'"
      :item="item"
      layout="list"
      :ordered-meta-keys="cardFieldPartition.meta"
      :ordered-body-keys="cardFieldPartition.body"
      :ontology-def-by-key="ontologyDefByKey"
      :editable="editable"
      :show-empty-properties="showEmptyProperties"
      :compact="compact"
      :properties-expanded="propertiesExpanded"
      @field-update="(fieldId, value) => emit('field-update', fieldId, value)"
      @column-update="(key, value) => emit('column-update', key, value)"
      @toggle-properties="emit('toggle-properties')" />
  </div>

  <!-- ═══════ GRID / MOODBOARD LAYOUT ═══════ -->
  <div
    v-else
    class="group relative flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden cursor-pointer transition-all"
    :class="[
      layout === 'moodboard' ? 'mb-3 break-inside-avoid' : '',
      selected ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:ring-1 hover:ring-primary/30',
    ]"
    @click="$emit('click')">
    <!-- Select checkbox (absolute, top-left) -->
    <button
      v-if="editable"
      type="button"
      class="absolute top-2 left-2 z-20 flex h-5 w-5 shrink-0 items-center justify-center rounded border backdrop-blur-sm transition-all"
      :class="[
        selected
          ? 'bg-primary border-primary opacity-100'
          : 'border-border/60 bg-background/70 opacity-0 group-hover:opacity-100',
      ]"
      @click.stop="$emit('select', $event)">
      <Icon v-if="selected" name="lucide:check" class="h-3 w-3 text-primary-foreground" />
    </button>
    <!-- Pinned indicator (absolute overlay, documents only) -->
    <div v-if="isDocument && i.pinned" class="absolute top-2 right-2 z-20">
      <Icon name="lucide:pin" class="h-3.5 w-3.5 text-amber-500 drop-shadow" />
    </div>

    <!-- ─── Preview: Bookmark thumbnail ─── -->
    <div v-if="isBookmark" class="aspect-video overflow-hidden border-b border-border">
      <img
        v-if="thumbnailSrc"
        :src="thumbnailSrc"
        :alt="item.title"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy" />
      <div v-else class="h-full flex flex-col items-center justify-center bg-muted/40 text-muted-foreground/40">
        <Icon name="lucide:globe" class="h-8 w-8" />
        <span class="text-xs font-mono mt-1">{{ getDomain(i.url || '') }}</span>
      </div>
    </div>

    <!-- ─── Preview: Note / page / template / diagram rendered content ─── -->
    <div
      v-else-if="isNote || ['page', 'template', 'diagram'].includes(i.type)"
      class="aspect-video relative border-b bg-background/50 border-border overflow-hidden">
      <div
        class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background/50 pointer-events-none z-10" />
      <div
        v-if="i.content"
        class="prose prose-sm dark:prose-invert max-w-none text-[8px] leading-relaxed p-3 overflow-hidden opacity-50 h-full"
        v-html="i.content" />
      <div v-else class="h-full flex items-center justify-center text-muted-foreground/20">
        <Icon :name="config?.icon || 'lucide:sticky-note'" class="h-8 w-8" />
      </div>
    </div>

    <!-- ─── Preview: Email (scaled iframe of rendered body) ─── -->
    <div
      v-else-if="isEmail"
      ref="emailThumbRef"
      class="aspect-video relative border-b border-border bg-white overflow-hidden">
      <!-- Scaled-down email render. 400% size + scale(0.25) keeps layout crisp.
           Iframe is only mounted once the card enters the viewport. -->
      <iframe
        v-if="emailThumbVisible && (i.bodyHtml || i.bodyText || i.snippet)"
        :srcdoc="emailSrcdoc"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        referrerpolicy="no-referrer"
        loading="lazy"
        class="absolute top-0 left-0 border-0 origin-top-left pointer-events-none"
        style="width: 400%; height: 400%; transform: scale(0.25)" />
      <div
        v-else-if="!(i.bodyHtml || i.bodyText || i.snippet)"
        class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/40">
        No preview
      </div>
      <!-- Bottom fade into card background -->
      <div
        class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background/80 pointer-events-none z-10" />
      <!-- Header chip overlay: sender + read/starred state -->
      <div
        class="absolute top-0 left-0 right-0 z-20 p-2 flex items-center gap-1.5 min-w-0 bg-linear-to-b from-background/90 to-transparent">
        <div v-if="i.isRead === false" class="shrink-0 h-1.5 w-1.5 rounded-full bg-blue-500" />
        <Icon v-else name="lucide:mail-open" class="h-3 w-3 shrink-0 text-muted-foreground/50" />
        <span class="text-xs truncate" :class="i.isRead === false ? 'font-semibold' : 'text-muted-foreground'">
          {{ i.from || 'Unknown sender' }}
        </span>
        <Icon v-if="i.isStarred" name="lucide:star" class="ml-auto shrink-0 h-3 w-3 text-amber-400 fill-amber-400" />
      </div>
    </div>

    <!-- ─── Preview: Event / Appointment — horizontal date visual ─── -->
    <div
      v-else-if="(i.type === 'event' || i.type === 'appointment') && isTemporal"
      class="aspect-video border-b border-border bg-muted/25 flex items-center justify-center overflow-hidden select-none">
      <template v-if="eventDateParts">
        <div class="flex items-center gap-5 px-6">
          <span class="text-6xl font-bold leading-none tabular-nums shrink-0">{{ eventDateParts.day }}</span>
          <div class="w-px h-12 bg-border/40 shrink-0" />
          <div class="flex flex-col gap-0.5 min-w-0">
            <span class="text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase">
              {{ eventDateParts.dayOfWeek }}
            </span>
            <span class="text-sm font-medium truncate">{{ eventDateParts.month }} {{ eventDateParts.year }}</span>
            <span v-if="eventDateParts.timeRange" class="text-[10px] text-muted-foreground/50 tabular-nums">
              {{ eventDateParts.timeRange }}
            </span>
          </div>
        </div>
      </template>
      <template v-else>
        <Icon name="lucide:calendar" class="h-10 w-10 text-muted-foreground/15" />
      </template>
    </div>

    <!-- ─── Preview: File (actual content for images/video/pdf, table thumbnail, icon otherwise) ─── -->
    <div v-else-if="isFile" class="relative aspect-video overflow-hidden border-b border-border bg-muted/20">
      <img
        v-if="i.mimeType?.startsWith('image/') && fileUrl"
        :src="fileUrl"
        :alt="item.title"
        class="pointer-events-none h-full w-full object-cover"
        loading="lazy" />
      <iframe
        v-else-if="i.mimeType === 'application/pdf' && fileUrl"
        :src="fileUrl + '#toolbar=0&navpanes=0&scrollbar=0'"
        class="pointer-events-none h-full w-full border-0" />
      <video
        v-else-if="i.mimeType?.startsWith('video/') && fileUrl"
        :src="fileUrl"
        class="pointer-events-none h-full w-full object-cover"
        preload="metadata"
        muted />
      <!-- Spreadsheet / CSV table thumbnail -->
      <div
        v-else-if="isTableFile && cardTableData"
        class="pointer-events-none absolute inset-0 overflow-hidden bg-card">
        <table class="w-full border-collapse text-[8px]">
          <thead class="sticky top-0 bg-muted">
            <tr>
              <th
                v-for="(col, c) in cardTableData.headers.slice(0, 8)"
                :key="c"
                class="max-w-[60px] truncate border-b border-border px-1.5 py-0.5 text-left font-semibold text-muted-foreground">
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in cardTableData.rows" :key="r" :class="r % 2 === 0 ? 'bg-card' : 'bg-muted/30'">
              <td
                v-for="(_, c) in cardTableData.headers.slice(0, 8)"
                :key="c"
                class="max-w-[60px] truncate border-b border-border/30 px-1.5 py-0.5 text-muted-foreground">
                {{ row[c] ?? '' }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
      </div>
      <div v-else class="flex h-full flex-col items-center justify-center gap-2">
        <Icon :name="fileMeta.icon" :class="['h-10 w-10', `text-${fileMeta.color}-500`]" />
        <span class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/50">
          {{ fileExtensionLabel }}
        </span>
      </div>
      <!-- Finder-style type + size chip on preview -->
      <div
        class="pointer-events-none absolute bottom-2 left-2 z-10 flex max-w-[calc(100%-1rem)] items-center gap-1">
        <span
          class="truncate rounded-md border border-border/40 bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/90 backdrop-blur-sm">
          {{ fileExtensionLabel }}
        </span>
        <span
          v-if="i.sizeBytes"
          class="shrink-0 rounded-md border border-border/40 bg-background/85 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
          {{ formatFileSize(Number(i.sizeBytes)) }}
        </span>
      </div>
    </div>

    <!-- ─── Preview: Generic document icon (slide_deck, etc.) ─── -->
    <div
      v-else-if="entityClass === 'document'"
      class="aspect-video bg-muted/20 flex items-center justify-center border-b border-border">
      <Icon
        :name="config?.icon || 'lucide:file-text'"
        :class="['h-10 w-10', `text-${config?.color || 'gray'}-500/50`]" />
    </div>

    <!-- ─── Preview: Actor avatar ─── -->
    <div v-else-if="isActor" class="aspect-video flex items-center justify-center bg-muted/20 border-b border-border">
      <div
        :class="[
          'flex items-center justify-center text-lg font-semibold overflow-hidden',
          isOrg ? 'h-16 w-16 rounded-xl' : 'h-16 w-16 rounded-full',
          `bg-${config?.color || 'gray'}-500/10 text-${config?.color || 'gray'}-500`,
        ]">
        <img
          v-if="avatarSrc"
          :src="avatarSrc"
          class="h-full w-full object-cover"
          :class="isOrg ? 'rounded-xl' : 'rounded-full'"
          :alt="item.title" />
        <template v-else>{{ initials }}</template>
      </div>
    </div>

    <!-- ─── Preview: Other temporal (task, trip, payment, budget, sprint, milestone, etc.) ─── -->
    <div
      v-else-if="isTemporal"
      class="aspect-video border-b border-border bg-muted/20 flex items-center justify-center overflow-hidden">
      <!-- Trip: origin → destination -->
      <template v-if="i.type === 'trip' && (i.origin || i.destination)">
        <div class="flex items-center gap-3 px-4 text-sm font-medium w-full justify-center">
          <span class="truncate max-w-[38%] text-right">{{ i.origin || '?' }}</span>
          <div class="flex flex-col items-center shrink-0 gap-0.5">
            <Icon :name="transportIcon" class="h-4 w-4 text-muted-foreground/50" />
            <div class="h-px w-6 bg-border/70" />
          </div>
          <span class="truncate max-w-[38%]">{{ i.destination || '?' }}</span>
        </div>
      </template>
      <!-- Payment / Budget: amount -->
      <template v-else-if="(i.type === 'payment' || i.type === 'budget') && i.amount != null">
        <div class="text-center px-3">
          <p class="text-2xl font-bold tabular-nums">{{ i.currency || '$' }}{{ Number(i.amount).toLocaleString() }}</p>
          <p v-if="i.payee || i.budgetStatus" class="text-xs text-muted-foreground mt-0.5 truncate">
            {{ i.payee || i.budgetStatus }}
          </p>
        </div>
      </template>
      <!-- Sprint: velocity -->
      <template v-else-if="i.type === 'sprint' && i.velocity">
        <div class="text-center">
          <p class="text-2xl font-bold tabular-nums">{{ i.velocity }}</p>
          <p class="text-xs text-muted-foreground mt-0.5">velocity pts</p>
        </div>
      </template>
      <!-- Milestone: achieved indicator -->
      <template v-else-if="i.type === 'milestone'">
        <div class="flex flex-col items-center gap-2">
          <Icon
            name="lucide:flag"
            :class="['h-10 w-10', i.achieved ? 'text-emerald-500' : 'text-muted-foreground/15']" />
          <span v-if="i.achieved" class="text-xs font-medium text-emerald-500">Achieved</span>
        </div>
      </template>
      <!-- Generic temporal: type icon -->
      <template v-else>
        <Icon :name="config?.icon || 'lucide:calendar'" class="h-10 w-10 text-muted-foreground/15" />
      </template>
    </div>

    <!-- ─── Preview: Container progress ─── -->
    <div v-else-if="isContainer && !isProject" class="aspect-video border-b border-border bg-muted/20 overflow-hidden">
      <div v-if="progressPercent != null" class="h-full flex flex-col justify-center px-5 gap-2">
        <div class="flex items-center justify-between text-xs text-muted-foreground">
          <span>{{ i.metric || 'Progress' }}</span>
          <span class="font-semibold tabular-nums text-foreground">{{ progressPercent }}%</span>
        </div>
        <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>
      <div v-else class="h-full flex flex-col items-center justify-center text-muted-foreground/15">
        <Icon :name="config?.icon || 'lucide:folder'" class="h-10 w-10" />
      </div>
    </div>

    <!-- ─── Preview: Project icon ─── -->
    <div v-else-if="isProject" class="aspect-video border-b border-border bg-muted/20 flex items-center justify-center">
      <Icon :name="config?.icon || 'lucide:folder'" class="h-10 w-10 text-muted-foreground/15" />
    </div>

    <!-- ─── Preview: Custom fields (dynamic entity types) ─── -->
    <div v-else-if="fields?.length" class="aspect-video border-b border-border bg-muted/20 p-4 overflow-hidden">
      <div class="grid grid-cols-2 gap-x-4 gap-y-3 content-start">
        <div v-for="field in fields.slice(0, 4)" :key="field.key" class="min-w-0">
          <p
            class="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wide truncate leading-none mb-0.5">
            {{ field.label }}
          </p>
          <p class="text-xs font-medium truncate">{{ field.value ?? '—' }}</p>
        </div>
      </div>
    </div>

    <!-- ─── Content area ─── -->
    <!-- File cards: compact footer (metadata on preview + dialog sidebar) -->
    <div v-if="isFile && layout !== 'list'" class="flex flex-col gap-1 p-3">
      <h3
        class="text-sm font-medium leading-snug line-clamp-2 transition-colors group-hover:text-primary"
        :class="item.title ? '' : 'italic text-muted-foreground/50'">
        {{ item.title || 'Untitled' }}
      </h3>
      <p v-if="fileCardSubtitle" class="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
        {{ fileCardSubtitle }}
      </p>
      <div
        v-if="fileCategoryBadges.length"
        class="flex flex-wrap items-stretch gap-1.5">
        <span
          v-for="badge in fileCategoryBadges"
          :key="badge.key"
          class="inline-flex min-h-8 min-w-[5.5rem] max-w-full flex-col justify-center gap-0.5 rounded bg-muted/80 px-2 py-1 text-[10px] font-medium text-muted-foreground"
          :title="`${badge.label}: ${badge.value}`">
          <span class="truncate text-[9px] font-medium uppercase tracking-wide text-muted-foreground/55">
            {{ badge.label }}
          </span>
          <span class="truncate text-xs font-medium text-foreground/85">{{ badge.value }}</span>
        </span>
      </div>
      <TagsSection
        v-if="(item.tags || []).length"
        :model-value="item.tags || []"
        readonly
        inline
        class="mt-0.5" />
    </div>

    <EntityCardOrderedFields
      v-else
      class="p-3 flex-1"
      :item="item"
      :layout="layout === 'moodboard' ? 'moodboard' : 'grid'"
      :ordered-meta-keys="cardFieldPartition.meta"
      :ordered-body-keys="cardFieldPartition.body"
      :ontology-def-by-key="ontologyDefByKey"
      :editable="editable"
      :show-empty-properties="showEmptyProperties"
      @field-update="(fieldId, value) => emit('field-update', fieldId, value)"
      @column-update="(key, value) => emit('column-update', key, value)" />
  </div>
</template>
