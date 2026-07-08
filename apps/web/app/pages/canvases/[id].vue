<script setup lang="ts">
  import CanvasProjectionFrame from '~/components/canvas/CanvasProjectionFrame.vue'
  import { canvasEntityIdFromSlug, canvasSlugFromEntityId } from '~/lib/canvas-routes'

  definePageMeta({
    layout: 'default',
    middleware: ['auth'],
  })

  const route = useRoute()
  const canvasId = computed(() => {
    const p = route.params.id
    const slug = Array.isArray(p) ? p[0] : p
    return slug ? canvasEntityIdFromSlug(String(slug)) : ''
  })

  const canvasSlug = computed(() => canvasSlugFromEntityId(canvasId.value))

  useHead({ title: () => `${canvasSlug.value} | Canvas` })
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div v-if="canvasId" class="h-full min-h-0" data-testid="canvas-page">
      <CanvasProjectionFrame :canvas-id="canvasId" class="h-full min-h-0" />
    </div>
  </Page>
</template>
