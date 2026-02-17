<script lang="ts" setup>
  import type { Reference, EntityReference, FileReference, EntityType } from '~/types/entity'
  import { isEntityReference, isFileReference } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'

  const props = withDefaults(defineProps<{
    modelValue: Reference[]
    readonly?: boolean
    grouped?: boolean
  }>(), {
    grouped: false,
  })

  const emit = defineEmits<{
    'update:modelValue': [value: Reference[]]
    openEntity: [ref: EntityReference]
    removeRef: [id: string]
    addEntity: []
    addEntityOfType: [type: EntityType]
  }>()

  // ── Quick-add pill definitions ────────────────────────────────────────
  const quickAddOptions: { type: EntityType; label: string; icon: string }[] = [
    { type: 'file', label: 'Add File', icon: 'lucide:paperclip' },
    { type: 'bookmark', label: 'Add Bookmark', icon: 'lucide:link' },
    { type: 'note', label: 'Add Note', icon: 'lucide:sticky-note' },
    { type: 'task', label: 'Add Task', icon: 'lucide:check-square' },
    { type: 'event', label: 'Add Event', icon: 'lucide:calendar' },
    { type: 'project', label: 'Add Project', icon: 'lucide:folder-kanban' },
    { type: 'person', label: 'Add Person', icon: 'lucide:user' },
  ]

  const references = computed({
    get: () => props.modelValue ?? [],
    set: (v) => emit('update:modelValue', v),
  })

  const outgoingRefs = computed(() =>
    references.value.filter((r) => !isEntityReference(r) || r.direction === 'outgoing'),
  )
  const incomingRefs = computed(() =>
    references.value.filter((r) => isEntityReference(r) && r.direction === 'incoming'),
  )

  // ── Group outgoing refs by type ───────────────────────────────────────
  interface RefGroup {
    key: string
    label: string
    icon: string
    refs: Reference[]
  }

  const groupedOutgoing = computed<RefGroup[]>(() => {
    const groups = new Map<string, { label: string; icon: string; refs: Reference[] }>()

    for (const ref of outgoingRefs.value) {
      let key: string, label: string, icon: string

      if (isEntityReference(ref)) {
        key = ref.entityType
        try {
          const cfg = getEntityTypeConfig(ref.entityType)
          label = cfg.labelPlural || cfg.label + 's'
          icon = cfg.icon
        } catch {
          label = ref.entityType
          icon = 'lucide:link'
        }
      } else if (isFileReference(ref)) {
        key = `__file_${ref.fileType}`
        label = ref.fileType === 'image' ? 'Images' : 'Files'
        icon = getFileIcon(ref)
      } else {
        continue
      }

      if (!groups.has(key)) {
        groups.set(key, { label, icon, refs: [] })
      }
      groups.get(key)!.refs.push(ref)
    }

    return Array.from(groups.entries()).map(([key, g]) => ({ key, ...g }))
  })

  const removeRef = (id: string) => {
    emit('removeRef', id)
  }

  // ── Entity reference helpers ────────────────────────────────────────
  const getEntityIcon = (ref: EntityReference) => {
    try {
      return getEntityTypeConfig(ref.entityType).icon
    } catch {
      return 'lucide:link'
    }
  }

  const getEntityColor = (ref: EntityReference) => {
    try {
      const color = getEntityTypeConfig(ref.entityType).color
      return `text-${color}-500 bg-${color}-500/10`
    } catch {
      return 'text-gray-500 bg-gray-500/10'
    }
  }

  const getEntityLabel = (ref: EntityReference) => {
    try {
      return getEntityTypeConfig(ref.entityType).label
    } catch {
      return ref.entityType
    }
  }

  // ── File reference helpers ─────────────────────────────────────────
  const FILE_TYPE_ICONS: Record<string, string> = {
    image: 'lucide:image',
    pdf: 'lucide:file-text',
    spreadsheet: 'lucide:sheet',
    document: 'lucide:file',
    other: 'lucide:paperclip',
  }

  const getFileIcon = (ref: FileReference): string =>
    FILE_TYPE_ICONS[ref.fileType] || 'lucide:paperclip'

  const getFileLabel = (ref: FileReference): string => {
    const labels: Record<string, string> = { image: 'Image', pdf: 'PDF', spreadsheet: 'Sheet', document: 'Doc', other: 'File' }
    return labels[ref.fileType] || 'File'
  }

  const getRefName = (ref: Reference): string => {
    if (isEntityReference(ref)) return ref.title
    if (isFileReference(ref)) return ref.name || 'Untitled'
    return ''
  }

  const getRefIcon = (ref: Reference): string => {
    if (isEntityReference(ref)) return getEntityIcon(ref)
    if (isFileReference(ref)) return getFileIcon(ref)
    return 'lucide:link'
  }

  const getRefColor = (ref: Reference): string => {
    if (isEntityReference(ref)) return getEntityColor(ref)
    if (isFileReference(ref)) return 'text-sky-500 bg-sky-500/10'
    return 'text-gray-500 bg-gray-500/10'
  }

  const getRefBadge = (ref: Reference): string | null => {
    if (isEntityReference(ref)) return getEntityLabel(ref)
    if (isFileReference(ref)) return getFileLabel(ref)
    return null
  }

  const handleCardClick = (ref: Reference) => {
    if (isEntityReference(ref)) {
      emit('openEntity', ref)
    } else if (isFileReference(ref) && ref.url) {
      window.open(ref.url, '_blank', 'noopener')
    }
  }
</script>

<template>
  <div v-if="outgoingRefs.length || incomingRefs.length || !readonly" class="p-4 space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">References</p>
    </div>

    <!-- Quick-add pills -->
    <div v-if="!readonly" class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="opt in quickAddOptions"
        :key="opt.type"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors"
        @click="emit('addEntityOfType', opt.type)">
        <Icon :name="opt.icon" class="h-3 w-3" />
        {{ opt.label }}
      </button>
      <button
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors"
        @click="emit('addEntity')">
        <Icon name="lucide:plus" class="h-3 w-3" />
        Other
      </button>
    </div>

    <!-- Outgoing references — grouped mode -->
    <template v-if="grouped">
      <div v-for="group in groupedOutgoing" :key="group.key" class="space-y-1.5">
        <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Icon :name="group.icon" class="h-3 w-3" />
          {{ group.label }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="ref in group.refs"
            :key="ref.id"
            class="ref-pill group inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-muted/60 hover:bg-muted transition-colors cursor-pointer"
            @click="handleCardClick(ref)">
            <div :class="['w-5 h-5 rounded flex items-center justify-center shrink-0', getRefColor(ref)]">
              <Icon :name="getRefIcon(ref)" class="h-3 w-3" />
            </div>
            <span class="text-[11px] font-medium truncate max-w-[140px]">
              {{ getRefName(ref) }}
            </span>
            <span v-if="getRefBadge(ref)" class="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground capitalize shrink-0">
              {{ getRefBadge(ref) }}
            </span>
            <Icon name="lucide:external-link" class="h-3 w-3 text-muted-foreground/50 shrink-0" />
            <button
              v-if="!readonly"
              class="h-4 w-4 flex items-center justify-center rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-0.5"
              @click.stop="removeRef(ref.id)">
              <Icon name="lucide:x" class="h-2.5 w-2.5 text-muted-foreground" />
            </button>
          </button>
        </div>
      </div>
    </template>

    <!-- Outgoing references — flat mode (default) -->
    <div v-else-if="outgoingRefs.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="ref in outgoingRefs"
        :key="ref.id"
        class="ref-pill group inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-muted/60 hover:bg-muted transition-colors cursor-pointer"
        @click="handleCardClick(ref)">
        <div :class="['w-5 h-5 rounded flex items-center justify-center shrink-0', getRefColor(ref)]">
          <Icon :name="getRefIcon(ref)" class="h-3 w-3" />
        </div>
        <span class="text-[11px] font-medium truncate max-w-[140px]">
          {{ getRefName(ref) }}
        </span>
        <span v-if="getRefBadge(ref)" class="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground capitalize shrink-0">
          {{ getRefBadge(ref) }}
        </span>
        <Icon name="lucide:external-link" class="h-3 w-3 text-muted-foreground/50 shrink-0" />
        <button
          v-if="!readonly"
          class="h-4 w-4 flex items-center justify-center rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-0.5"
          @click.stop="removeRef(ref.id)">
          <Icon name="lucide:x" class="h-2.5 w-2.5 text-muted-foreground" />
        </button>
      </button>
    </div>

    <!-- Divider between outgoing and incoming refs -->
    <div v-if="incomingRefs.length && outgoingRefs.length" class="border-t border-border" />

    <!-- Incoming references ("Referenced by") — same pill style -->
    <div v-if="incomingRefs.length" class="space-y-1.5">
      <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Icon name="lucide:arrow-left" class="h-3 w-3" />
        Referenced by
      </p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="ref in incomingRefs"
          :key="ref.id"
          class="ref-pill group inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-muted/60 hover:bg-muted transition-colors cursor-pointer"
          @click="isEntityReference(ref) && emit('openEntity', ref)">
          <div :class="['w-5 h-5 rounded flex items-center justify-center shrink-0', getEntityColor(ref as EntityReference)]">
            <Icon :name="getEntityIcon(ref as EntityReference)" class="h-2.5 w-2.5" />
          </div>
          <span class="text-[11px] font-medium truncate max-w-[140px]">{{ (ref as EntityReference).title }}</span>
          <span class="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground capitalize shrink-0">
            {{ getEntityLabel(ref as EntityReference) }}
          </span>
          <Icon name="lucide:external-link" class="h-3 w-3 text-muted-foreground/50 shrink-0" />
        </button>
      </div>
    </div>

    <!-- Empty state (readonly only — edit mode has the pills) -->
    <p v-if="readonly && !outgoingRefs.length && !incomingRefs.length" class="text-xs text-muted-foreground italic">
      No references
    </p>
  </div>
</template>
