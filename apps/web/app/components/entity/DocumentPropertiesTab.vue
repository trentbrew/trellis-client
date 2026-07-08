<script lang="ts" setup>
  import type { PropertyFieldId } from '~/types/entity'
  import { stripHtml } from '~/utils/stripHtml'

  const editableItem = defineModel<any>('editableItem', { required: true })
  const selectedRepeat = defineModel<string>('selectedRepeat', { default: 'none' })

  const props = defineProps<{
    hasField: (_fieldId: PropertyFieldId) => boolean
    isViewMode: boolean
    isDark: boolean
    owners: { id: string; name: string }[]
    folders: string[]
    scheduleDescription: {
      scheduleText: string
      statusText: string
      isOverdue: boolean
      isRecurring: boolean
    }
    summary?: string
    isGeneratingSummary?: boolean
  }>()

  const emit = defineEmits<{
    regenerateSummary: []
  }>()

  const contentLength = computed(() => stripHtml(editableItem.value?.content || '').trim().length)
</script>

<template>
  <div class="flex flex-col min-h-0">
    <DocumentPropertiesSummary
      :summary="summary || ''"
      :is-generating-summary="isGeneratingSummary"
      :content-length="contentLength"
      :summary-generated-at="editableItem.summaryGeneratedAt"
      @regenerate-summary="emit('regenerateSummary')" />
    <OntologyPropertiesTab
      v-model:editable-item="editableItem"
      v-model:selected-repeat="selectedRepeat"
      :has-field="hasField"
      :is-view-mode="isViewMode"
      :is-dark="isDark"
      :owners="owners"
      :folders="folders"
      :schedule-description="scheduleDescription" />
  </div>
</template>
