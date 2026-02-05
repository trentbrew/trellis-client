<script setup lang="ts">
  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  const projectionName = ref('')
  const projectionDescription = ref('')
  const projectionType = ref('table')
  const sourceCollection = ref('')
  const isSubmitting = ref(false)

  const { collections } = useInstantData()

  const handleSubmit = async () => {
    if (!projectionName.value.trim() || !sourceCollection.value) return

    isSubmitting.value = true
    try {
      // TODO: Implement projection creation when data layer is ready
      // const { createProjection } = useInstantData()
      // await createProjection({
      //   name: projectionName.value,
      //   description: projectionDescription.value,
      //   type: projectionType.value,
      //   sourceCollection: sourceCollection.value,
      // })

      // Reset form
      projectionName.value = ''
      projectionDescription.value = ''
      projectionType.value = 'table'
      sourceCollection.value = ''

      // Close modal
      emit('update:open', false)
    } finally {
      isSubmitting.value = false
    }
  }

  const handleOpen = (state: boolean) => {
    emit('update:open', state)
    if (!state) {
      projectionName.value = ''
      projectionDescription.value = ''
      projectionType.value = 'table'
      sourceCollection.value = ''
    }
  }
</script>

<template>
  <UiDialog :open="props.open" @update:open="handleOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Create Projection</UiDialogTitle>
        <UiDialogDescription>
          Create a new view of your data with custom filters, sorting, and layout.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <UiLabel for="projection-name">Projection Name</UiLabel>
          <UiInput
            id="projection-name"
            v-model="projectionName"
            placeholder="e.g., Active Users, Recent Orders"
            :disabled="isSubmitting" />
        </div>

        <div class="space-y-2">
          <UiLabel for="source-collection">Source Collection</UiLabel>
          <UiSelect v-model="sourceCollection" :disabled="isSubmitting">
            <UiSelectTrigger id="source-collection">
              <UiSelectValue placeholder="Select a collection" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="collection in collections" :key="collection.id" :value="collection.id">
                {{ collection.title }}
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>

        <div class="space-y-2">
          <UiLabel for="projection-type">View Type</UiLabel>
          <UiSelect v-model="projectionType" :disabled="isSubmitting">
            <UiSelectTrigger id="projection-type">
              <UiSelectValue placeholder="Select view type" />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem value="table">Table</UiSelectItem>
              <UiSelectItem value="kanban">Kanban</UiSelectItem>
              <UiSelectItem value="grid">Grid</UiSelectItem>
              <UiSelectItem value="calendar">Calendar</UiSelectItem>
              <UiSelectItem value="timeline">Timeline</UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>

        <div class="space-y-2">
          <UiLabel for="projection-description">Description</UiLabel>
          <UiTextarea
            id="projection-description"
            v-model="projectionDescription"
            placeholder="What is this projection for?"
            :disabled="isSubmitting"
            :rows="2" />
        </div>
      </div>

      <UiDialogFooter>
        <UiButton :disabled="isSubmitting" variant="outline" @click="handleOpen(false)">Cancel</UiButton>
        <UiButton :disabled="!projectionName.trim() || !sourceCollection || isSubmitting" @click="handleSubmit">
          {{ isSubmitting ? 'Creating...' : 'Create Projection' }}
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
