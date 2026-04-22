<script setup lang="ts">
  import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
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
  // Guard against stale blob: URLs baked into older file entities — those
  // blob handles are dead after reload and trigger WebKitBlobResource errors.
  const fileUrl = computed<string | null>(() => {
    const u = i.value.url
    if (typeof u !== 'string' || !u) return null
    if (u.startsWith('blob:')) return null
    return u
  })
  const isEmail = computed(() => i.value.type === 'email')
  const emailSrcdoc = computed(() =>
    isEmail.value ? buildEmailSrcdoc(i.value, { thumbnail: true }) : '',
  )

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

  // ─── Spreadsheet / CSV thumbnail data ───
  const isTableFile = computed(() =>
    i.value.fileCategory === 'spreadsheet' || i.value.fileExtension === 'csv'
  )
  const cardTableData = ref<{ headers: string[], rows: any[][] } | null>(null)

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
  }>()
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
      <Icon v-else-if="isFile" :name="fileMeta.icon" :class="['h-6 w-6', `text-${fileMeta.color}-500`]" />
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
    class="group relative flex flex-col rounded-xl border bg-card shadow-sm overflow-hidden cursor-pointer transition-all"
    :class="[
      layout === 'moodboard' ? 'mb-3 break-inside-avoid' : '',
      selected
        ? 'border-primary ring-2 ring-primary/30'
        : 'border-border hover:ring-1 hover:ring-primary/30',
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
      <div class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background/50 pointer-events-none z-10" />
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
      <div class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background/80 pointer-events-none z-10" />
      <!-- Header chip overlay: sender + read/starred state -->
      <div class="absolute top-0 left-0 right-0 z-20 p-2 flex items-center gap-1.5 min-w-0 bg-linear-to-b from-background/90 to-transparent">
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
    <div v-else-if="isFile" class="aspect-video border-b border-border overflow-hidden relative bg-muted/20">
      <img
        v-if="i.mimeType?.startsWith('image/') && fileUrl"
        :src="fileUrl"
        :alt="item.title"
        class="w-full h-full object-cover pointer-events-none"
        loading="lazy" />
      <iframe
        v-else-if="i.mimeType === 'application/pdf' && fileUrl"
        :src="fileUrl + '#toolbar=0&navpanes=0&scrollbar=0'"
        class="w-full h-full border-0 pointer-events-none" />
      <video
        v-else-if="i.mimeType?.startsWith('video/') && fileUrl"
        :src="fileUrl"
        class="w-full h-full object-cover pointer-events-none"
        preload="metadata"
        muted />
      <!-- Spreadsheet / CSV table thumbnail -->
      <div v-else-if="isTableFile && cardTableData" class="absolute inset-0 overflow-hidden bg-card pointer-events-none">
        <table class="w-full text-[8px] border-collapse">
          <thead class="bg-muted sticky top-0">
            <tr>
              <th v-for="(col, c) in cardTableData.headers.slice(0, 8)" :key="c"
                class="px-1.5 py-0.5 text-left font-semibold text-muted-foreground border-b border-border truncate max-w-[60px]">
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, r) in cardTableData.rows" :key="r"
              :class="r % 2 === 0 ? 'bg-card' : 'bg-muted/30'">
              <td v-for="(_, c) in cardTableData.headers.slice(0, 8)" :key="c"
                class="px-1.5 py-0.5 truncate max-w-[60px] text-muted-foreground border-b border-border/30">
                {{ row[c] ?? '' }}
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Fade overlay at bottom to indicate more rows -->
        <div class="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-card to-transparent" />
      </div>
      <div v-else class="h-full flex flex-col items-center justify-center gap-2">
        <Icon :name="fileMeta.icon" :class="['h-10 w-10', `text-${fileMeta.color}-500`]" />
        <span class="text-[10px] text-muted-foreground/50 uppercase tracking-wide font-medium">
          {{ i.fileExtension || fileMeta.label }}
        </span>
      </div>
    </div>

    <!-- ─── Preview: Generic document icon (slide_deck, etc.) ─── -->
    <div
      v-else-if="entityClass === 'document'"
      class="aspect-video bg-muted/20 flex items-center justify-center border-b border-border">
      <Icon :name="config?.icon || 'lucide:file-text'" :class="['h-10 w-10', `text-${config?.color || 'gray'}-500/50`]" />
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
          <p class="text-2xl font-bold tabular-nums">
            {{ i.currency || '$' }}{{ Number(i.amount).toLocaleString() }}
          </p>
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
          <Icon name="lucide:flag" :class="['h-10 w-10', i.achieved ? 'text-emerald-500' : 'text-muted-foreground/15']" />
          <span v-if="i.achieved" class="text-xs font-medium text-emerald-500">Achieved</span>
        </div>
      </template>
      <!-- Generic temporal: type icon -->
      <template v-else>
        <Icon :name="config?.icon || 'lucide:calendar'" class="h-10 w-10 text-muted-foreground/15" />
      </template>
    </div>

    <!-- ─── Preview: Container progress ─── -->
    <div v-else-if="isContainer" class="aspect-video border-b border-border bg-muted/20 overflow-hidden">
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

    <!-- ─── Preview: Custom fields (dynamic entity types) ─── -->
    <div v-else-if="fields?.length" class="aspect-video border-b border-border bg-muted/20 p-4 overflow-hidden">
      <div class="grid grid-cols-2 gap-x-4 gap-y-3 content-start">
        <div v-for="field in fields.slice(0, 4)" :key="field.key" class="min-w-0">
          <p class="text-[9px] font-medium text-muted-foreground/50 uppercase tracking-wide truncate leading-none mb-0.5">
            {{ field.label }}
          </p>
          <p class="text-xs font-medium truncate">{{ field.value ?? '—' }}</p>
        </div>
      </div>
    </div>

    <!-- ─── Content area ─── -->
    <div class="p-3 space-y-1.5 flex-1">
      <!-- Meta row -->
      <div class="flex items-center gap-1.5 min-w-0">
        <Icon
          :name="config?.icon || 'lucide:layers'"
          :class="['h-3 w-3 shrink-0', `text-${config?.color || 'gray'}-500`]" />
        <span class="text-[11px] text-muted-foreground/60 font-medium truncate">
          {{ config?.label || item.type }}
        </span>

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

      <!-- Email: from address + date -->
      <template v-if="isEmail">
        <p class="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <Icon name="lucide:user-circle" class="h-3 w-3 shrink-0 opacity-50" />
          <span class="truncate">{{ i.from || 'Unknown sender' }}</span>
        </p>
        <p v-if="i.date" class="text-[10px] text-muted-foreground/50 flex items-center gap-1">
          <Icon name="lucide:clock" class="h-3 w-3 shrink-0 opacity-50" />
          {{ new Date(i.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
        </p>
      </template>
      <!-- Description for all other types -->
      <p
        v-else
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


      <!-- File size -->
      <p v-if="isFile && i.sizeBytes" class="text-xs text-muted-foreground">{{ formatBytes(i.sizeBytes) }}</p>
    </div>

  </div>
</template>
