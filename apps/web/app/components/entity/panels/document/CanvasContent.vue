<script setup lang="ts">
  import { canvasPathFromEntityId } from '~/lib/canvas-routes'

  const props = defineProps<{
    modelValue: { id: string; title?: string }
    mode: 'view' | 'create' | 'edit'
  }>()

  const { wp } = useWorkspacePath()
</script>

<template>
  <div class="flex flex-col items-start gap-3 p-4">
    <p class="text-sm text-muted-foreground">Open this board on the spatial canvas to arrange entity references.</p>
    <NuxtLink
      v-if="modelValue?.id"
      :to="wp(canvasPathFromEntityId(modelValue.id))"
      class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
      <Icon name="lucide:layout-dashboard" class="h-4 w-4" />
      Open canvas
    </NuxtLink>
  </div>
</template>
