<script lang="ts" setup>
  import type { Reference, EntityReference, FileReference, Entity } from '~/types/entity'
  import { isEntityReference, isFileReference } from '~/types/entity'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import { stripHtml } from '~/utils/stripHtml'
  import DiagramEmbedPreview from '~/components/editor/DiagramEmbedPreview.vue'

  const props = defineProps<{
    modelValue: Reference[]
    readonly?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: Reference[]]
    openEntity: [ref: EntityReference]
    removeRef: [id: string]
    addEntity: []
    addEntityOfType: [type: string]
  }>()

  // ── Dynamic entity type list from ontology registry ──────────────────
  const { serverTypes } = useOntologyRegistry()
  const { items: allItems } = useEntities()

  const availableEntityTypes = computed(() => {
    return serverTypes.value
      .filter(t => t.tier !== 'core')
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(t => ({
        type: t.type,
        label: t.label,
        icon: t.icon,
        color: t.color,
      }))
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
    emit('removeRef', id)
  }

  // ── Entity content for reference cards ────────────────────────────
  function getEntityHtmlContent(ref: EntityReference): string {
    const entity = allItems.value.find((e: Entity) => e.id === ref.entityId)
    if (!entity) return ''
    return (entity as any).content || ''
  }

  function isDiagramRef(ref: EntityReference): boolean {
    return ref.entityType === 'diagram'
  }

  function getEntityContentPreview(ref: EntityReference): string {
    const entity = allItems.value.find((e: Entity) => e.id === ref.entityId)
    if (!entity) return ''
    const raw = (entity as any).description || (entity as any).excerpt || ''
    return stripHtml(raw).slice(0, 120)
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
    <!-- Header with add button -->
    <div class="flex items-center justify-between">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">References</p>
      <!-- "+" dropdown (always shown when not readonly) -->
      <UiDropdownMenu v-if="!readonly">
        <UiDropdownMenuTrigger as-child>
          <button
            class="h-5 w-5 rounded flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Add reference">
            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
          </button>
        </UiDropdownMenuTrigger>
        <UiDropdownMenuContent align="end" :side-offset="4" class="w-48 max-h-64 overflow-y-auto p-1">
          <UiDropdownMenuItem
            v-for="opt in availableEntityTypes"
            :key="opt.type"
            class="gap-2 text-xs"
            @select="emit('addEntityOfType', opt.type)">
            <div :class="['w-5 h-5 rounded flex items-center justify-center shrink-0', `bg-${opt.color}-500/10`]">
              <Icon :name="opt.icon" :class="['h-3 w-3', `text-${opt.color}-500`]" />
            </div>
            <span class="flex-1">{{ opt.label }}</span>
          </UiDropdownMenuItem>
          <UiDropdownMenuSeparator />
          <UiDropdownMenuItem class="gap-2 text-xs text-muted-foreground" @select="emit('addEntity')">
            <Icon name="lucide:search" class="h-3 w-3" />
            <span>Browse all…</span>
          </UiDropdownMenuItem>
        </UiDropdownMenuContent>
      </UiDropdownMenu>
    </div>

    <!-- Outgoing references — full-width cards with preview -->
    <div v-if="outgoingRefs.length" class="space-y-1.5">
      <template v-for="ref in outgoingRefs" :key="(ref as any).id">
        <EntityPreviewPopover
          v-if="isEntityReference(ref)"
          :entity-id="(ref as EntityReference).entityId"
          :entity-type="(ref as EntityReference).entityType"
          side="left"
          align="start">
          <template #trigger>
            <button
              class="ref-card group w-full flex flex-col rounded-lg border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all text-left overflow-hidden cursor-pointer"
              @click="handleCardClick(ref)">
              <div
                v-if="getEntityHtmlContent(ref as EntityReference)"
                class="relative w-full h-20 overflow-hidden bg-muted/30 border-b border-border/30 shrink-0">
                <div class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-card/80 pointer-events-none z-10" />
                <DiagramEmbedPreview
                  v-if="isDiagramRef(ref as EntityReference)"
                  :source="getEntityHtmlContent(ref as EntityReference)"
                  compact
                  class="absolute inset-0 p-2 pointer-events-none" />
                <div
                  v-else
                  class="prose prose-sm dark:prose-invert max-w-none text-[9px] leading-relaxed p-2 h-full overflow-hidden opacity-60 select-none"
                  v-html="getEntityHtmlContent(ref as EntityReference)" />
              </div>
              <div class="flex items-center gap-2.5 p-2.5 h-full">
                <div :class="['w-7 h-7 rounded-md flex items-center justify-center shrink-0', getRefColor(ref)]">
                  <Icon :name="getRefIcon(ref)" class="h-3.5 w-3.5" />
                </div>
                <div class="flex-1 min-w-0 items-center h-full">
                  <div class="flex items-center gap-1.5 mb-0.5 h-full">
                    <span class="text-xs font-medium truncate flex-1">{{ getRefName(ref) }}</span>
                    <span v-if="getRefBadge(ref)" class="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground capitalize shrink-0">
                      {{ getRefBadge(ref) }}
                    </span>
                  </div>
                  <p v-if="!getEntityHtmlContent(ref as EntityReference) && getEntityContentPreview(ref as EntityReference)" class="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {{ getEntityContentPreview(ref as EntityReference) }}
                  </p>
                </div>
                <button
                  v-if="!readonly"
                  class="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                  @click.stop="removeRef((ref as any).id)">
                  <Icon name="lucide:x" class="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            </button>
          </template>
        </EntityPreviewPopover>

        <button
          v-else
          class="ref-card group w-full flex items-start gap-2.5 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all text-left cursor-pointer"
          @click="handleCardClick(ref)">
          <div :class="['w-7 h-7 rounded-md flex items-center justify-center shrink-0', getRefColor(ref)]">
            <Icon :name="getRefIcon(ref)" class="h-3.5 w-3.5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-medium truncate flex-1">{{ getRefName(ref) }}</span>
              <span v-if="getRefBadge(ref)" class="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground capitalize shrink-0">
                {{ getRefBadge(ref) }}
              </span>
            </div>
          </div>
          <button
            v-if="!readonly"
            class="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            @click.stop="removeRef((ref as any).id)">
            <Icon name="lucide:x" class="h-3 w-3 text-muted-foreground" />
          </button>
        </button>
      </template>
    </div>

    <!-- Divider between outgoing and incoming refs -->
    <div v-if="incomingRefs.length && outgoingRefs.length" class="border-t border-border" />

    <!-- Incoming references ("Referenced by") — same card style with preview -->
    <div v-if="incomingRefs.length" class="space-y-1.5">
      <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Icon name="lucide:arrow-left" class="h-3 w-3" />
        Referenced by
      </p>
      <template v-for="ref in incomingRefs" :key="ref.id">
        <EntityPreviewPopover
          :entity-id="(ref as EntityReference).entityId"
          :entity-type="(ref as EntityReference).entityType"
          side="left"
          align="start">
          <template #trigger>
            <button
              class="ref-card group w-full flex flex-col rounded-lg border border-border/50 bg-card hover:bg-muted/50 hover:border-border transition-all cursor-pointer text-left overflow-hidden"
              @click="isEntityReference(ref) && emit('openEntity', ref as EntityReference)">
              <!-- Content thumbnail -->
              <div
                v-if="getEntityHtmlContent(ref as EntityReference)"
                class="relative w-full h-20 overflow-hidden bg-muted/30 border-b border-border/30 shrink-0">
                <div class="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-card/80 pointer-events-none z-10" />
                <DiagramEmbedPreview
                  v-if="isDiagramRef(ref as EntityReference)"
                  :source="getEntityHtmlContent(ref as EntityReference)"
                  compact
                  class="absolute inset-0 p-2 pointer-events-none" />
                <div
                  v-else
                  class="prose prose-sm dark:prose-invert max-w-none text-[9px] leading-relaxed p-2 h-full overflow-hidden opacity-60 select-none"
                  v-html="getEntityHtmlContent(ref as EntityReference)" />
              </div>
              <div class="flex items-start gap-2.5 p-2.5">
                <div :class="['w-7 h-7 rounded-md flex items-center justify-center shrink-0', getEntityColor(ref as EntityReference)]">
                  <Icon :name="getEntityIcon(ref as EntityReference)" class="h-3.5 w-3.5" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="text-xs font-medium truncate flex-1">{{ (ref as EntityReference).title }}</span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground capitalize shrink-0">
                      {{ getEntityLabel(ref as EntityReference) }}
                    </span>
                  </div>
                  <p v-if="!getEntityHtmlContent(ref as EntityReference) && getEntityContentPreview(ref as EntityReference)" class="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {{ getEntityContentPreview(ref as EntityReference) }}
                  </p>
                </div>
              </div>
            </button>
          </template>
        </EntityPreviewPopover>
      </template>
    </div>

    <!-- Empty state (readonly only — edit mode has the pills) -->
    <p v-if="readonly && !outgoingRefs.length && !incomingRefs.length" class="text-xs text-muted-foreground italic">
      No references
    </p>
  </div>
</template>
