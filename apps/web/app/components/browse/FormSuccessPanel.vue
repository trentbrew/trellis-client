<script lang="ts" setup>
  const emit = defineEmits<{
    'submit-another': []
    'view-responses': []
  }>()

  const headingRef = ref<HTMLElement | null>(null)

  defineExpose({ focus: () => headingRef.value?.focus() })
</script>

<template>
  <div class="flex flex-col items-center gap-4 px-6 py-10 text-center">
    <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon name="lucide:check" class="h-6 w-6" />
    </div>
    <h2 ref="headingRef" tabindex="-1" class="text-lg font-semibold outline-none">Response recorded</h2>
    <p class="max-w-sm text-sm text-muted-foreground">Your response has been saved and will appear in the table view.</p>
    <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
      <UiButton variant="outline" @click="emit('submit-another')">Submit another</UiButton>
      <UiButton @click="emit('view-responses')">View responses</UiButton>
    </div>
  </div>
</template>
