<script setup lang="ts">
import type { Entity, EntityType, PropertyFieldId } from '~/types/entity'
import type { ViewFieldDefinition } from '~/lib/view-field-catalog'
import { getEntityTypeConfig } from '~/config/entityRegistry'
import { getEntityClass } from '~/types/entity'
import { stripHtml } from '~/utils/stripHtml'
import { formatRecurrenceLabel } from '~/utils/recurrence'
import CardPropertyRow from '~/components/entity/cards/CardPropertyRow.vue'
import EntityFieldEditor from '~/components/entity/EntityFieldEditor.vue'
import TagsSection from '~/components/entity/panels/shared/TagsSection.vue'

const props = withDefaults(
  defineProps<{
    item: Entity
    layout: 'grid' | 'list' | 'moodboard'
    orderedMetaKeys: string[]
    orderedBodyKeys: string[]
    ontologyDefByKey: Record<string, ViewFieldDefinition>
    editable?: boolean
    showEmptyProperties?: boolean
    /** Compact kanban/list face — tiny title icon, badge props, tags-only collapse. */
    compact?: boolean
    propertiesExpanded?: boolean
  }>(),
  { editable: false, showEmptyProperties: false, compact: false, propertiesExpanded: false },
)

const emit = defineEmits<{
  'field-update': [fieldId: PropertyFieldId, value: unknown]
  'column-update': [key: string, value: unknown]
  'toggle-properties': []
}>()

const config = computed(() => getEntityTypeConfig(props.item.type as EntityType))
const entityClass = computed(() => getEntityClass(props.item.type as EntityType))
const i = computed(() => props.item as unknown as Record<string, unknown>)

const isTemporal = computed(() => entityClass.value === 'temporal')
const isDocument = computed(() => entityClass.value === 'document')
const isActor = computed(() => entityClass.value === 'actor')
const isContainer = computed(() => entityClass.value === 'container')
const isProject = computed(() => i.value.type === 'project')
const isFile = computed(() => i.value.type === 'file')
const isEmail = computed(() => i.value.type === 'email')

const description = computed(() => {
  const d = String(i.value.description || i.value.excerpt || '')
  return stripHtml(d).slice(0, 300)
})

const contentPreview = computed(() => {
  if (!i.value.content) return ''
  return stripHtml(String(i.value.content)).slice(0, 300)
})

const displayTitle = computed(() => props.item.title || 'Untitled')
const hasRealTitle = computed(() => !!props.item.title)
const displayDescription = computed(() => description.value || contentPreview.value || 'No description')
const hasRealDescription = computed(() => !!(description.value || contentPreview.value))

const itemStatus = computed(() => {
  if (isTemporal.value) {
    return (
      i.value.taskStatus ||
      i.value.tripStatus ||
      i.value.paymentStatus ||
      i.value.sprintStatus ||
      i.value.budgetStatus ||
      ''
    )
  }
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

const dateDisplay = computed(() => {
  if (!isTemporal.value && !isContainer.value) return null
  const start = i.value.startDate
  const end = i.value.endDate || i.value.targetDate
  if (!start && !end) return null
  try {
    const d = String(start || end)
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return String(start || end)
  }
})

const isCompleted = computed(
  () => isTemporal.value && (i.value.taskStatus === 'completed' || i.value.achieved === true),
)

const recurrenceLabel = computed(() => {
  if (!isTemporal.value) return null
  const recurrence = i.value.recurrence as { frequency?: string } | undefined
  if (recurrence?.frequency) return formatRecurrenceLabel(recurrence as any)
  if (i.value._recurringLabel) return String(i.value._recurringLabel)
  return null
})

const formatBytes = (bytes: number | undefined) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const showMetaRow = computed(() =>
  props.orderedMetaKeys.some((key) => {
    if (key === 'type') return true
    if (key === 'priority') return isTemporal.value && !!i.value.priority
    if (key === 'status') return (isTemporal.value || (isContainer.value && !isProject.value)) && !!itemStatus.value
    return false
  }),
)

function isOntologyKey(key: string) {
  return !!props.ontologyDefByKey[key]
}

const ontologyBodyKeys = computed(() => props.orderedBodyKeys.filter((k) => isOntologyKey(k)))

const descriptionVisibleInBody = computed(
  () =>
    props.orderedBodyKeys.includes('description') &&
    !isEmail.value &&
    (hasRealDescription.value || props.showEmptyProperties),
)

function shouldRenderOntologyBadgeRow(fieldKey: string) {
  if (!ontologyBodyKeys.value.length) return false
  if (descriptionVisibleInBody.value) return fieldKey === 'description' && !isEmail.value
  const firstNonOntology = props.orderedBodyKeys.find((k) => !isOntologyKey(k) && k !== 'tags')
  return fieldKey === firstNonOntology
}

const tagsFieldVisible = computed(() => props.orderedBodyKeys.includes('tags'))

const showTagsRow = computed(
  () => tagsFieldVisible.value && ((props.item.tags || []).length > 0 || props.showEmptyProperties),
)

const compactHiddenFieldCount = computed(() => {
  if (!props.compact) return 0
  const keys = [...props.orderedMetaKeys, ...props.orderedBodyKeys].filter((k) => k !== 'tags' && k !== 'type')
  return keys.length
})

const compactShowProperties = computed(() => props.compact && props.propertiesExpanded)

const compactBadgeMetaKeys = computed(() =>
  props.orderedMetaKeys.filter((k) => k !== 'type'),
)

const compactBadgeBodyKeys = computed(() =>
  props.orderedBodyKeys.filter((k) => k !== 'tags' && k !== 'description'),
)

const compactOntologyKeys = computed(() =>
  props.orderedBodyKeys.filter((k) => isOntologyKey(k)),
)

function shouldShowCompactBadge(fieldKey: string): boolean {
  if (!compactShowProperties.value) return false
  if (fieldKey === 'tags' || fieldKey === 'type') return false
  if (fieldKey === 'description') return hasRealDescription.value || props.showEmptyProperties
  if (fieldKey === 'date') return !!(dateDisplay.value || props.showEmptyProperties)
  if (fieldKey === 'recurrence') return !!recurrenceLabel.value
  if (fieldKey === 'subtitle') return isActor.value && !!(i.value.jobTitle || i.value.organization)
  if (fieldKey === 'contact') return isActor.value && !!(i.value.email || i.value.phone || props.showEmptyProperties)
  if (fieldKey === 'fileSize') return isFile.value && !!(i.value.sizeBytes || props.showEmptyProperties)
  if (fieldKey === 'status') return (isTemporal.value || (isContainer.value && !isProject.value)) && !!(itemStatus.value || props.showEmptyProperties)
  if (fieldKey === 'priority') return isTemporal.value && !!(i.value.priority || props.showEmptyProperties)
  return false
}
</script>

<template>
  <!-- Compact face (kanban / dense list) -->
  <div v-if="compact" class="space-y-1.5">
    <div class="flex items-start gap-1.5 min-w-0">
      <Icon
        :name="config?.icon || 'lucide:layers'"
        :class="['mt-0.5 h-3.5 w-3.5 shrink-0', `text-${config?.color || 'gray'}-500`]" />
      <h3
        class="min-w-0 flex-1 truncate text-sm font-medium"
        :class="[
          isCompleted ? 'line-through text-muted-foreground' : '',
          !hasRealTitle ? 'text-muted-foreground/50 italic' : '',
        ]">
        {{ displayTitle }}
      </h3>
      <Icon v-if="isDocument && i.pinned" name="lucide:pin" class="h-3 w-3 shrink-0 text-amber-500" />
      <button
        v-if="compactHiddenFieldCount > 0"
        type="button"
        class="no-drag flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 hover:bg-foreground/5 hover:text-foreground"
        :aria-expanded="propertiesExpanded"
        :aria-label="propertiesExpanded ? 'Hide properties' : 'Show properties'"
        @click.stop="emit('toggle-properties')">
        <Icon
          :name="propertiesExpanded ? 'lucide:chevron-up' : 'lucide:chevron-down'"
          class="h-3.5 w-3.5" />
      </button>
    </div>

    <div v-if="compactShowProperties" class="no-drag flex flex-wrap items-center gap-1">
      <template v-for="fieldKey in compactBadgeMetaKeys" :key="`compact-meta-${fieldKey}`">
        <div v-if="fieldKey === 'status' && shouldShowCompactBadge('status')" @click.stop>
          <div v-if="editable" class="inline-flex items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium">
            <Icon name="lucide:circle" class="h-3 w-3 shrink-0 opacity-60" />
            <EntityFieldEditor
              field-id="status"
              :model-value="itemStatus"
              :entity-type="i.type as EntityType"
              compact
              display="pill"
              @update:model-value="emit('field-update', 'status', $event)" />
          </div>
          <span
            v-else
            :class="[
              'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              statusColors[String(itemStatus)] || 'bg-muted text-muted-foreground',
            ]">
            <Icon name="lucide:circle" class="h-3 w-3 shrink-0 opacity-60" />
            {{ itemStatus }}
          </span>
        </div>
        <div v-else-if="fieldKey === 'priority' && shouldShowCompactBadge('priority')" @click.stop>
          <div v-if="editable" class="inline-flex items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium">
            <Icon name="lucide:flag" class="h-3 w-3 shrink-0 opacity-60" />
            <EntityFieldEditor
              field-id="priority"
              :model-value="i.priority"
              :entity-type="i.type as EntityType"
              compact
              display="pill"
              @update:model-value="emit('field-update', 'priority', $event)" />
          </div>
          <span
            v-else
            :class="[
              'inline-flex items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium',
              priorityColors[String(i.priority)] || 'text-muted-foreground',
            ]">
            <Icon name="lucide:flag" class="h-3 w-3 shrink-0 opacity-60" />
            {{ i.priority }}
          </span>
        </div>
      </template>

      <template v-for="fieldKey in compactBadgeBodyKeys" :key="`compact-body-${fieldKey}`">
        <span
          v-if="fieldKey === 'date' && shouldShowCompactBadge('date')"
          class="inline-flex items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Icon name="lucide:calendar" class="h-3 w-3 shrink-0 opacity-60" />
          {{ dateDisplay || '—' }}
        </span>
        <span
          v-else-if="fieldKey === 'recurrence' && shouldShowCompactBadge('recurrence')"
          class="inline-flex items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-primary/80">
          <Icon name="lucide:repeat" class="h-3 w-3 shrink-0 opacity-60" />
          {{ recurrenceLabel }}
        </span>
        <span
          v-else-if="fieldKey === 'description' && shouldShowCompactBadge('description')"
          class="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Icon name="lucide:align-left" class="h-3 w-3 shrink-0 opacity-60" />
          <span class="truncate">{{ displayDescription }}</span>
        </span>
        <span
          v-else-if="fieldKey === 'subtitle' && shouldShowCompactBadge('subtitle')"
          class="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Icon name="lucide:briefcase" class="h-3 w-3 shrink-0 opacity-60" />
          <span class="truncate">{{ [i.jobTitle, i.organization].filter(Boolean).join(' · ') }}</span>
        </span>
        <span
          v-else-if="fieldKey === 'contact' && shouldShowCompactBadge('contact')"
          class="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Icon name="lucide:mail" class="h-3 w-3 shrink-0 opacity-60" />
          <span class="truncate">{{ i.email || i.phone || '—' }}</span>
        </span>
        <span
          v-else-if="fieldKey === 'fileSize' && shouldShowCompactBadge('fileSize')"
          class="inline-flex items-center gap-1 rounded-full bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          <Icon name="lucide:hard-drive" class="h-3 w-3 shrink-0 opacity-60" />
          {{ i.sizeBytes ? formatBytes(Number(i.sizeBytes)) : '—' }}
        </span>
      </template>

      <CardPropertyRow
        v-for="ontologyKey in compactOntologyKeys"
        :key="`compact-ontology-${ontologyKey}`"
        :item="item"
        :field="ontologyDefByKey[ontologyKey]!"
        :editable="editable"
        :show-empty="showEmptyProperties"
        variant="badge"
        @column-update="(key, value) => emit('column-update', key, value)" />
    </div>

    <div v-if="showTagsRow" class="no-drag min-w-0 w-full">
      <TagsSection
        v-if="(item.tags || []).length"
        :model-value="item.tags || []"
        readonly
        inline />
      <p v-else class="flex items-center gap-1.5 text-xs text-muted-foreground/40 italic">
        <Icon name="lucide:hash" class="h-3 w-3 shrink-0 opacity-50" />
        No tags
      </p>
    </div>
  </div>

  <!-- Default card face -->
  <div v-else :class="layout === 'list' ? 'space-y-1' : 'space-y-1.5'">
    <!-- Meta row (ordered) -->
    <div
      v-if="showMetaRow && layout !== 'list'"
      class="flex items-center gap-1.5 min-w-0 flex-wrap">
      <template v-for="fieldKey in orderedMetaKeys" :key="`meta-${fieldKey}`">
        <template v-if="fieldKey === 'type'">
          <Icon
            :name="config?.icon || 'lucide:layers'"
            :class="['h-3 w-3 shrink-0', `text-${config?.color || 'gray'}-500`]" />
          <span class="text-[11px] text-muted-foreground/60 font-medium truncate">
            {{ config?.label || item.type }}
          </span>
        </template>
        <template v-else-if="fieldKey === 'priority' && isTemporal && i.priority">
          <div v-if="editable" @click.stop>
            <EntityFieldEditor
              field-id="priority"
              :model-value="i.priority"
              :entity-type="i.type as EntityType"
              compact
              display="pill"
              @update:model-value="emit('field-update', 'priority', $event)" />
          </div>
          <span v-else :class="['text-[10px] font-medium', priorityColors[String(i.priority)] || 'text-muted-foreground']">
            {{ i.priority }}
          </span>
        </template>
        <template v-else-if="fieldKey === 'status' && (isTemporal || (isContainer && !isProject)) && itemStatus">
          <div v-if="editable" @click.stop>
            <EntityFieldEditor
              field-id="status"
              :model-value="itemStatus"
              :entity-type="i.type as EntityType"
              compact
              display="pill"
              @update:model-value="emit('field-update', 'status', $event)" />
          </div>
          <span
            v-else
            :class="[
              'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              statusColors[String(itemStatus)] || 'bg-muted text-muted-foreground',
            ]">
            {{ itemStatus }}
          </span>
        </template>
      </template>
    </div>

    <!-- Title -->
    <div class="flex items-center gap-2" :class="layout === 'list' ? 'mb-0.5' : ''">
      <h3
        class="text-sm font-medium"
        :class="[
          layout === 'list' ? 'truncate' : 'leading-snug line-clamp-2 group-hover:text-primary transition-colors',
          isCompleted ? 'line-through text-muted-foreground' : '',
          !hasRealTitle ? 'text-muted-foreground/50 italic' : '',
        ]">
        {{ displayTitle }}
      </h3>
      <Icon v-if="isDocument && i.pinned" name="lucide:pin" class="h-3 w-3 text-amber-500 shrink-0" />
      <template v-if="layout === 'list'">
        <template v-for="fieldKey in orderedMetaKeys" :key="`list-meta-${fieldKey}`">
          <span
            v-if="fieldKey === 'status' && (isTemporal || (isContainer && !isProject)) && itemStatus"
            :class="[
              'ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
              statusColors[String(itemStatus)] || 'bg-muted text-muted-foreground',
            ]">
            {{ itemStatus }}
          </span>
        </template>
      </template>
    </div>

    <!-- Body fields (ordered) -->
    <template v-for="fieldKey in orderedBodyKeys" :key="`body-${fieldKey}`">
      <p
        v-if="fieldKey === 'subtitle' && isActor && (i.jobTitle || i.organization)"
        class="text-xs text-muted-foreground truncate">
        {{ [i.jobTitle, i.organization].filter(Boolean).join(' · ') }}
      </p>

      <template v-else-if="fieldKey === 'description' && isEmail">
        <p class="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <Icon name="lucide:user-circle" class="h-3 w-3 shrink-0 opacity-50" />
          <span class="truncate">{{ i.from || 'Unknown sender' }}</span>
        </p>
        <p v-if="i.date" class="text-[10px] text-muted-foreground/50 flex items-center gap-1">
          <Icon name="lucide:clock" class="h-3 w-3 shrink-0 opacity-50" />
          {{ new Date(String(i.date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}
        </p>
      </template>

      <p
        v-else-if="fieldKey === 'description' && !isEmail && (hasRealDescription || showEmptyProperties)"
        class="text-xs"
        :class="[
          layout === 'list' ? 'line-clamp-1' : layout === 'moodboard' ? 'line-clamp-4' : 'line-clamp-2',
          hasRealDescription ? 'text-muted-foreground' : 'text-muted-foreground/40 italic',
        ]">
        {{ displayDescription }}
      </p>

      <div
        v-else-if="fieldKey === 'recurrence' && recurrenceLabel"
        class="flex items-center gap-1 text-[10px] text-primary/70">
        <Icon name="lucide:repeat" class="h-3 w-3 shrink-0" />
        <span class="truncate">{{ recurrenceLabel }}</span>
      </div>

      <div
        v-else-if="fieldKey === 'date' && (isTemporal || isContainer) && (dateDisplay || showEmptyProperties)"
        class="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        <span v-if="dateDisplay" class="flex items-center gap-1">
          <Icon name="lucide:calendar" class="h-3 w-3 opacity-50" />
          {{ dateDisplay }}
        </span>
        <span v-else-if="showEmptyProperties" class="text-muted-foreground/40 italic">No date</span>
      </div>

      <div
        v-else-if="fieldKey === 'contact' && isActor && (i.email || i.phone || showEmptyProperties)"
        class="flex items-center gap-3 text-xs text-muted-foreground">
        <span v-if="i.email" class="flex items-center gap-1 truncate">
          <Icon name="lucide:mail" class="h-3 w-3 shrink-0 opacity-50" />
          {{ i.email }}
        </span>
        <span v-if="i.phone" class="flex items-center gap-1">
          <Icon name="lucide:phone" class="h-3 w-3 shrink-0 opacity-50" />
          {{ i.phone }}
        </span>
        <span v-if="!i.email && !i.phone && showEmptyProperties" class="italic text-muted-foreground/40">No contact</span>
      </div>

      <p
        v-else-if="fieldKey === 'fileSize' && isFile && (i.sizeBytes || showEmptyProperties)"
        class="text-xs text-muted-foreground">
        {{ i.sizeBytes ? formatBytes(Number(i.sizeBytes)) : '—' }}
      </p>

      <div
        v-else-if="shouldRenderOntologyBadgeRow(fieldKey)"
        class="flex flex-wrap items-center gap-1">
        <CardPropertyRow
          v-for="ontologyKey in ontologyBodyKeys"
          :key="`ontology-${ontologyKey}`"
          :item="item"
          :field="ontologyDefByKey[ontologyKey]!"
          :editable="editable"
          :show-empty="showEmptyProperties"
          variant="badge"
          @column-update="(key, value) => emit('column-update', key, value)" />
      </div>
    </template>

    <!-- Tags — own row, dialog inline styling -->
    <div v-if="showTagsRow" class="min-w-0 w-full">
      <TagsSection
        v-if="(item.tags || []).length"
        :model-value="item.tags || []"
        readonly
        inline />
      <p v-else class="flex items-center gap-1.5 text-xs text-muted-foreground/40 italic">
        <Icon name="lucide:hash" class="h-3 w-3 shrink-0 opacity-50" />
        No tags
      </p>
    </div>
  </div>
</template>
