<script lang="ts" setup>
  import type { PropertyFieldId } from '~/types/entity'

  const editableItem = defineModel<any>('editableItem', { required: true })
  const selectedRepeat = defineModel<string>('selectedRepeat', { default: 'none' })

  const props = defineProps<{
    hasField: (_fieldId: PropertyFieldId) => boolean
    isViewMode: boolean
    isDark: boolean
    owners: { id: string; name: string }[]
    folders: string[]
    scheduleDescription: { scheduleText: string; statusText: string; isOverdue: boolean; isRecurring: boolean }
  }>()
</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto">
    <div v-if="props.hasField('startDate')" class="border-b border-border">
      <EntityScheduleSidebar
        v-model:editable-item="editableItem"
        v-model:selected-repeat="selectedRepeat"
        :has-field="props.hasField"
        :is-view-mode="props.isViewMode"
        :is-dark="props.isDark" />
    </div>

    <div class="px-3 py-3 flex flex-col gap-1.5 text-xs [&>*]:justify-start">
      <EntityPropertyPills
        v-model:editable-item="editableItem"
        :has-field="props.hasField"
        :is-view-mode="props.isViewMode"
        :owners="props.owners"
        :folders="props.folders"
        :schedule-panel-open="true"
        :schedule-description="props.scheduleDescription" />
    </div>
  </div>
</template>
