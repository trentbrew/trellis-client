<script lang="ts" setup>
  import type { Reference, EntityReference, FileType } from '~/types/entity'
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
  }>()

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

  const addMenuOpen = ref(false)
</script>

<template>
  <div v-if="outgoingRefs.length || incomingRefs.length || !readonly" class="p-4 space-y-2">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">References</p>
      <div v-if="!readonly" class="relative">
        <button
          class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          @click="addMenuOpen = !addMenuOpen">
          <Icon name="lucide:plus" class="h-3 w-3" />
          Add
        </button>
        <!-- Add menu popover -->
        <Transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-75 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95">
          <div
            v-if="addMenuOpen"
            class="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-border bg-popover p-1 shadow-md"
            @mouseleave="addMenuOpen = false">
            <button
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors"
              @click="() => {
                addMenuOpen = false
                emit('addFile')
              }">
              <Icon name="lucide:paperclip" class="h-3.5 w-3.5 text-muted-foreground" />
              <span>File</span>
            </button>
            <button
              class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors"
              @click="() => {
                addMenuOpen = false
                emit('addEntity')
              }">
              <Icon name="lucide:link" class="h-3.5 w-3.5 text-muted-foreground" />
              <span>Entity</span>
            </button>
          </div>
        </Transition>
      </div>
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

    <!-- Empty state -->
    <p v-if="!outgoingRefs.length && !incomingRefs.length" class="text-xs text-muted-foreground italic">
      No references
    </p>
  </div>
</template>
