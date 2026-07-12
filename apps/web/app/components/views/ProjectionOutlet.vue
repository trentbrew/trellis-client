<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { Entity, PropertyFieldId } from '~/types/entity'
import type { ProjectionType } from '~/types/database'
import type { ViewFieldDefinition } from '~/lib/view-field-catalog'
import EntityCardCollection from '~/components/views/EntityCardCollection.vue'
import BrowseSpreadsheetView from '~/components/views/BrowseSpreadsheetView.vue'
import BrowseKanbanView from '~/components/views/BrowseKanbanView.vue'
import BrowseCalendarView from '~/components/views/BrowseCalendarView.vue'
import GraphView from '~/components/views/GraphView.vue'

/**
 * Layout-first projection dispatcher.
 *
 * Given a canonical {@link ProjectionType}, renders the matching view and owns
 * the shared empty state — replacing the sprawling `v-if viewMode` ladder that
 * lived inline in the browse page. See `docs/artifacts/view_projections_design.md`
 * (M1). Renderers are grouped by binding "shape" (card / table / graph); types
 * without a wired renderer fall through to a coming-soon placeholder.
 *
 * Future shell contract: projection hosts may wrap this outlet with toolbar,
 * inspector, and unsupported slots, but renderer bodies should continue to
 * dispatch through this component instead of moving back into page templates.
 */
const props = withDefaults(
  defineProps<{
    type: ProjectionType
    /** Optional sub-mode (e.g. calendar month/week/agenda) — forwarded to renderers. */
    sub?: string
    items: Entity[]
    entityType?: string
    isSelected?: (_id: string) => boolean
    /** Inline grid-template style for the card-grid layout. */
    gridStyle?: StyleValue
    /** Enable pinch / ctrl+wheel density on card-grid. */
    pinchZoom?: boolean
    storageKey?: string
    /** Message shown when there are no items and no `#empty` slot is supplied. */
    emptyMessage?: string
    visibleFields?: string[] | null
    fieldCatalog?: ViewFieldDefinition[]
    showEmptyProperties?: boolean
  }>(),
  { isSelected: () => () => false, emptyMessage: 'Nothing here yet', showEmptyProperties: false, pinchZoom: false },
)

const emit = defineEmits<{
  openDetail: [item: Entity]
  toggleSelect: [id: string, event?: MouseEvent]
  toggleSelectAll: []
  fieldUpdate: [item: Entity, fieldId: PropertyFieldId, value: unknown]
  cellUpdate: [item: Entity, column: string, value: unknown]
  columnUpdate: [item: Entity, column: string, value: unknown]
  calendarCreate: [date: Date]
  calendarReschedule: [item: Entity, patch: Partial<Entity>]
  gridDensityWheel: [event: WheelEvent]
  gridDensityTouchStart: [event: TouchEvent]
  gridDensityTouchMove: [event: TouchEvent]
  gridDensityTouchEnd: [event: TouchEvent]
}>()

const CARD_LAYOUTS = new Set<ProjectionType>(['card-grid', 'list', 'moodboard'])
const TABLE_LAYOUTS = new Set<ProjectionType>(['table', 'spreadsheet'])

type RendererShape = 'card' | 'table' | 'kanban' | 'calendar' | 'graph' | 'unsupported'

/** Classify a projection type into the renderer shape that draws it. */
const shape = computed<RendererShape>(() => {
  if (CARD_LAYOUTS.has(props.type)) return 'card'
  if (TABLE_LAYOUTS.has(props.type)) return 'table'
  if (props.type === 'kanban') return 'kanban'
  if (props.type === 'calendar' || props.type === 'timeline') return 'calendar'
  if (props.type === 'graph') return 'graph'
  return 'unsupported'
})

const isEmpty = computed(() => props.items.length === 0)
const cardLayout = computed(() => props.type as 'card-grid' | 'list' | 'moodboard')
</script>

<template>
  <!-- Projection type known to the registry but not yet wired into browse -->
  <div
    v-if="shape === 'unsupported'"
    class="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
    <Icon name="lucide:layout-dashboard" class="h-6 w-6 text-muted-foreground/30" />
    <p class="text-sm">The <span class="font-medium">{{ type }}</span> view isn’t available here yet.</p>
  </div>

  <!-- Centralized empty state (shared across every card/table projection) -->
  <div
    v-else-if="isEmpty && shape !== 'graph' && shape !== 'calendar'"
    class="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
    <slot name="empty">
      <Icon name="lucide:search-x" class="h-6 w-6 text-muted-foreground/30" />
      <p class="text-sm">{{ emptyMessage }}</p>
    </slot>
  </div>

  <!-- Card projections: card-grid / list / moodboard -->
  <EntityCardCollection
    v-else-if="shape === 'card'"
    :items="items"
    :layout="cardLayout"
    :is-selected="isSelected"
    :grid-style="gridStyle"
    :pinch-zoom="pinchZoom && type === 'card-grid'"
    :visible-fields="visibleFields"
    :field-catalog="fieldCatalog"
    :show-empty-properties="showEmptyProperties"
    @open-detail="emit('openDetail', $event)"
    @toggle-select="(id: string, event?: MouseEvent) => emit('toggleSelect', id, event)"
    @field-update="(item: Entity, fieldId: PropertyFieldId, value: unknown) => emit('fieldUpdate', item, fieldId, value)"
    @column-update="(item: Entity, column: string, value: unknown) => emit('columnUpdate', item, column, value)"
    @grid-density-wheel="emit('gridDensityWheel', $event)"
    @grid-density-touch-start="emit('gridDensityTouchStart', $event)"
    @grid-density-touch-move="emit('gridDensityTouchMove', $event)"
    @grid-density-touch-end="emit('gridDensityTouchEnd', $event)" />

  <!-- Calendar projection -->
  <div v-else-if="shape === 'calendar'" class="flex h-full min-h-0 flex-1 flex-col">
    <BrowseCalendarView
      class="min-h-0 flex-1"
      :items="items"
      :entity-type="entityType"
      @open-detail="emit('openDetail', $event)"
      @create-request="emit('calendarCreate', $event)"
      @reschedule="(item: Entity, patch: Partial<Entity>) => emit('calendarReschedule', item, patch)" />
  </div>

  <!-- Kanban projection -->
  <div v-else-if="shape === 'kanban'" class="flex h-full min-h-0 flex-1 flex-col">
    <BrowseKanbanView
      class="min-h-0 flex-1"
      :items="items"
      :entity-type="entityType"
      :is-selected="isSelected"
      :visible-fields="visibleFields"
      :field-catalog="fieldCatalog"
      :show-empty-properties="showEmptyProperties"
      @open-detail="emit('openDetail', $event)"
      @toggle-select="(id: string, event?: MouseEvent) => emit('toggleSelect', id, event)"
      @field-update="(item: Entity, fieldId: PropertyFieldId, value: unknown) => emit('fieldUpdate', item, fieldId, value)"
      @column-update="(item: Entity, column: string, value: unknown) => emit('columnUpdate', item, column, value)" />
  </div>

  <!-- Table projections: table / spreadsheet -->
  <div v-else-if="shape === 'table'" class="flex min-h-0 flex-1 flex-col">
    <BrowseSpreadsheetView
      class="min-h-0 flex-1"
      :items="items"
      :is-selected="isSelected"
      :entity-type="entityType"
      :storage-key="storageKey"
      @toggle-select="(id: string, event?: MouseEvent) => emit('toggleSelect', id, event)"
      @toggle-select-all="emit('toggleSelectAll')"
      @open-detail="emit('openDetail', $event)"
      @cell-update="(item: Entity, column: string, value: unknown) => emit('cellUpdate', item, column, value)" />
  </div>

  <!-- Graph projection: one canvas, owns its own empty/stats chrome -->
  <div
    v-else-if="shape === 'graph'"
    class="h-[calc(100vh-200px)] -mx-4 -mb-4 rounded-lg border border-border/50 bg-card/30 overflow-hidden">
    <GraphView :entities="items" @open-entity="emit('openDetail', $event)" />
  </div>
</template>
