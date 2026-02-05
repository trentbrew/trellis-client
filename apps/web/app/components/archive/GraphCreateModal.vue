<script setup lang="ts">
  const props = defineProps<{
    open: boolean
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
  }>()

  const graphName = ref('')
  const graphDescription = ref('')
  const isSubmitting = ref(false)

  const handleSubmit = async () => {
    if (!graphName.value.trim()) return

    isSubmitting.value = true
    try {
      // TODO: Implement graph saving when data layer is ready
      // const { saveGraph } = useInstantData()
      // await saveGraph({
      //   name: graphName.value,
      //   description: graphDescription.value,
      //   // Capture current visualization state (filters, layout, zoom, pan)
      // })

      // Reset form
      graphName.value = ''
      graphDescription.value = ''

      // Close modal
      emit('update:open', false)
    } finally {
      isSubmitting.value = false
    }
  }

  const handleOpen = (state: boolean) => {
    emit('update:open', state)
    if (!state) {
      graphName.value = ''
      graphDescription.value = ''
    }
  }
</script>

<template>
  <UiDialog :open="props.open" @update:open="handleOpen">
    <UiDialogContent class="sm:max-w-md">
      <UiDialogHeader>
        <UiDialogTitle>Save Graph</UiDialogTitle>
        <UiDialogDescription>
          Save the current graph view with filters and layout for quick access later.
        </UiDialogDescription>
      </UiDialogHeader>

      <div class="space-y-4">
        <div class="space-y-2">
          <UiLabel for="graph-name">Graph Name</UiLabel>
          <UiInput
            id="graph-name"
            v-model="graphName"
            placeholder="e.g., Sales Network, User Relationships"
            :disabled="isSubmitting" />
        </div>

        <div class="space-y-2">
          <UiLabel for="graph-description">Description</UiLabel>
          <UiTextarea
            id="graph-description"
            v-model="graphDescription"
            placeholder="What does this graph visualization show?"
            :disabled="isSubmitting"
            :rows="3" />
        </div>

        <div class="bg-muted p-3 rounded text-sm">
          <p class="text-muted-foreground">
            This will save your current visualization including filters, layout algorithm, zoom level, and pan position.
          </p>
        </div>
      </div>

      <UiDialogFooter>
        <UiButton :disabled="isSubmitting" variant="outline" @click="handleOpen(false)">Cancel</UiButton>
        <UiButton :disabled="!graphName.trim() || isSubmitting" @click="handleSubmit">
          {{ isSubmitting ? 'Saving...' : 'Save Graph' }}
        </UiButton>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>
