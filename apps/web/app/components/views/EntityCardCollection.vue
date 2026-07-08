<script setup lang="ts">
import type { StyleValue } from 'vue'
import type { Entity, PropertyFieldId } from '~/types/entity'
import type { ViewFieldDefinition } from '~/lib/view-field-catalog'
import EntityCard from '~/components/entity/cards/EntityCard.vue'

/**
 * Card-based projection renderer (card-grid / list / moodboard).
 */
const props = withDefaults(
  defineProps<{
    items: Entity[]
    layout?: 'card-grid' | 'list' | 'moodboard'
    isSelected?: (id: string) => boolean
    gridStyle?: StyleValue
    editable?: boolean
    visibleFields?: string[] | null
    fieldCatalog?: ViewFieldDefinition[]
    showEmptyProperties?: boolean
  }>(),
  { layout: 'card-grid', editable: true, isSelected: () => () => false, showEmptyProperties: false },
)

const emit = defineEmits<{
  openDetail: [item: Entity]
  toggleSelect: [id: string, event?: MouseEvent]
  fieldUpdate: [item: Entity, fieldId: PropertyFieldId, value: unknown]
  columnUpdate: [item: Entity, column: string, value: unknown]
}>()

const cardLayout = computed<'grid' | 'list' | 'moodboard'>(() =>
  props.layout === 'card-grid' ? 'grid' : props.layout,
)

const containerClass = computed(() => {
  switch (props.layout) {
    case 'list':
      return 'flex flex-col gap-2'
    case 'moodboard':
      return 'columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4'
    case 'card-grid':
    default:
      return 'grid gap-4'
  }
})
</script>

<template>
  <div :class="containerClass" :style="layout === 'card-grid' ? gridStyle : undefined">
    <EntityCard
      v-for="item in items"
      :key="item.id"
      :item="item"
      :layout="cardLayout"
      editable
      :selected="isSelected(item.id)"
      :visible-fields="visibleFields"
      :field-catalog="fieldCatalog"
      :show-empty-properties="showEmptyProperties"
      @click="emit('openDetail', item)"
      @select="(event: MouseEvent) => emit('toggleSelect', item.id, event)"
      @field-update="(fieldId: PropertyFieldId, value: unknown) => emit('fieldUpdate', item, fieldId, value)"
      @column-update="(column: string, value: unknown) => emit('columnUpdate', item, column, value)" />
  </div>
</template>
