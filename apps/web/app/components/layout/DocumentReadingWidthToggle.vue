<script lang="ts" setup>
  const { isFullWidth, toggleFullWidth } = useDocumentReadingWidth()

  const label = computed(() => (isFullWidth.value ? 'Reading width' : 'Full width'))
</script>

<template>
  <UiButton
    variant="ghost"
    size="icon"
    class="h-7 w-7"
    data-testid="document-reading-width-toggle"
    :title="label"
    :aria-label="label"
    :aria-pressed="isFullWidth"
    @click="toggleFullWidth">
    <Icon :name="isFullWidth ? 'lucide:align-center' : 'lucide:align-justify'" class="h-4 w-4" />
  </UiButton>
</template>
