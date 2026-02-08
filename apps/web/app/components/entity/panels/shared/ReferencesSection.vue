<script lang="ts" setup>
  import type { Reference, EntityReference, FileType, EntityType } from '~/types/entity'
  import { isFileReference, isEntityReference } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'

  const props = defineProps<{
    modelValue: Reference[]
    readonly?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: Reference[]]
    openEntity: [ref: EntityReference]
    addFile: []
    addEntity: []
    addEntityOfType: [type: EntityType]
  }>()

  // ── Quick-add pill definitions ────────────────────────────────────────
  const quickAddOptions = computed(() => {
    const entityTypes: { type: EntityType; label: string; icon: string; color: string }[] = [
      { type: 'note', label: 'Note', icon: 'lucide:sticky-note', color: 'text-yellow-600 bg-yellow-500/10' },
      { type: 'task', label: 'Task', icon: 'lucide:check-square', color: 'text-blue-600 bg-blue-500/10' },
      { type: 'event', label: 'Event', icon: 'lucide:calendar', color: 'text-purple-600 bg-purple-500/10' },
      { type: 'project', label: 'Project', icon: 'lucide:folder-kanban', color: 'text-blue-600 bg-blue-500/10' },
      { type: 'person', label: 'Person', icon: 'lucide:user', color: 'text-sky-600 bg-sky-500/10' },
    ]
    return entityTypes
  })

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

  const removeRef = (id: string) => {
    references.value = references.value.filter((r) => r.id !== id)
  }

  // ── File reference helpers ──────────────────────────────────────────
  const getFileIcon = (fileType: FileType) => {
    const m: Record<FileType, string> = {
      pdf: 'lucide:file-text',
      spreadsheet: 'lucide:file-spreadsheet',
      image: 'lucide:image',
      document: 'lucide:file',
      other: 'lucide:file',
    }
    return m[fileType] || 'lucide:file'
  }

  const getFileColor = (fileType: FileType) => {
    const m: Record<FileType, string> = {
      pdf: 'text-rose-600 bg-rose-500/10',
      spreadsheet: 'text-green-600 bg-green-500/10',
      image: 'text-violet-600 bg-violet-500/10',
      document: 'text-blue-600 bg-blue-500/10',
      other: 'text-gray-600 bg-gray-500/10',
    }
    return m[fileType] || 'text-gray-600 bg-gray-500/10'
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
      return `text-${color}-600 bg-${color}-500/10`
    } catch {
      return 'text-gray-600 bg-gray-500/10'
    }
  }

  const getEntityLabel = (ref: EntityReference) => {
    try {
      return getEntityTypeConfig(ref.entityType).label
    } catch {
      return ref.entityType
    }
  }

</script>

<template>
  <div v-if="outgoingRefs.length || incomingRefs.length || !readonly" class="p-4 space-y-2">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">References</p>
    </div>

    <!-- Quick-add pills -->
    <div v-if="!readonly" class="flex flex-wrap items-center gap-1.5">
      <button
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/50 transition-colors"
        @click="emit('addFile')">
        <Icon name="lucide:paperclip" class="h-3 w-3" />
        File
      </button>
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

    <!-- Outgoing references (files + outgoing entity links) -->
    <div v-if="outgoingRefs.length" class="space-y-1">
      <div
        v-for="ref in outgoingRefs"
        :key="ref.id"
        class="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
        :class="{ 'cursor-pointer': isEntityReference(ref) }"
        @click="isEntityReference(ref) && emit('openEntity', ref)">
        <!-- Icon -->
        <div
          v-if="isFileReference(ref)"
          :class="['w-7 h-7 rounded flex items-center justify-center shrink-0', getFileColor(ref.fileType)]">
          <Icon :name="getFileIcon(ref.fileType)" class="h-3.5 w-3.5" />
        </div>
        <div
          v-else-if="isEntityReference(ref)"
          :class="['w-7 h-7 rounded flex items-center justify-center shrink-0', getEntityColor(ref)]">
          <Icon :name="getEntityIcon(ref)" class="h-3.5 w-3.5" />
        </div>

        <!-- Label -->
        <span v-if="isFileReference(ref)" class="flex-1 text-xs truncate">{{ ref.name }}</span>
        <span v-else-if="isEntityReference(ref)" class="flex-1 text-xs truncate">{{ ref.title }}</span>

        <!-- Type badge (entity refs only) -->
        <span
          v-if="isEntityReference(ref)"
          class="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
          {{ getEntityLabel(ref) }}
        </span>

        <!-- Remove button (outgoing only, edit mode) -->
        <button
          v-if="!readonly"
          class="shrink-0 h-5 w-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
          @click.stop="removeRef(ref.id)">
          <Icon name="lucide:x" class="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>

    <!-- Incoming references ("Referenced by") -->
    <div v-if="incomingRefs.length" class="space-y-1">
      <p
        class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mt-2 mb-0.5 flex items-center gap-1">
        <Icon name="lucide:arrow-left" class="h-3 w-3" />
        Referenced by
      </p>
      <div
        v-for="ref in incomingRefs"
        :key="ref.id"
        class="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer opacity-70 hover:opacity-100"
        @click="isEntityReference(ref) && emit('openEntity', ref)">
        <div
          :class="[
            'w-6 h-6 rounded flex items-center justify-center shrink-0',
            getEntityColor(ref as EntityReference),
          ]">
          <Icon :name="getEntityIcon(ref as EntityReference)" class="h-3 w-3" />
        </div>
        <span class="flex-1 text-xs truncate">{{ (ref as EntityReference).title }}</span>
        <span class="shrink-0 text-[10px] font-medium text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
          {{ getEntityLabel(ref as EntityReference) }}
        </span>
      </div>
    </div>

    <!-- Empty state (readonly only — edit mode has the pills) -->
    <p v-if="readonly && !outgoingRefs.length && !incomingRefs.length" class="text-xs text-muted-foreground italic">
      No references
    </p>
  </div>
</template>
