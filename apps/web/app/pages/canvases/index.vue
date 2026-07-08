<script setup lang="ts">
  import { canvasPathFromEntityId, canvasSlugFromEntityId } from '~/lib/canvas-routes'

  definePageMeta({
    layout: 'default',
    middleware: ['auth'],
  })

  useHead({ title: 'Canvases' })

  const { wp } = useWorkspacePath()
  const { canvases } = useCanvasList()
  const { loading } = useEntities()
  const { createCanvas, creating } = useCreateCanvas()
</script>

<template>
  <Page variant="browse" title="Canvases" icon="lucide:layout-dashboard">
    <template #actions>
      <UiButton size="sm" :disabled="creating || loading" data-testid="canvas-create-button" @click="createCanvas()">
        <Icon :name="creating ? 'lucide:loader-2' : 'lucide:plus'" :class="['h-4 w-4', creating && 'animate-spin']" />
        New canvas
      </UiButton>
    </template>

    <template v-if="loading">
      <div class="flex h-48 items-center justify-center text-muted-foreground" data-testid="canvas-index-loading">
        <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin" />
      </div>
    </template>

    <template v-else-if="canvases.length === 0">
      <div class="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground" data-testid="canvas-index-ready">
        <Icon name="lucide:layout-dashboard" class="h-10 w-10 opacity-25" />
        <div class="space-y-1 text-center">
          <p class="text-sm font-medium text-foreground">No canvases yet</p>
          <p class="text-xs max-w-sm">Create a spatial board to arrange entities on an infinite canvas.</p>
        </div>
        <UiButton size="sm" :disabled="creating || loading" data-testid="canvas-create-button" @click="createCanvas()">
          <Icon name="lucide:plus" class="h-4 w-4" />
          New canvas
        </UiButton>
      </div>
    </template>

    <ul v-else class="divide-y divide-border rounded-lg border border-border bg-card" data-testid="canvas-index-ready">
      <li v-for="canvas in canvases" :key="canvas.id">
        <NuxtLink
          :to="wp(canvasPathFromEntityId(canvas.id))"
          class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
          <Icon name="lucide:layout-dashboard" class="h-4 w-4 shrink-0 text-cyan-400" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-foreground">
              {{ canvas.title || canvasSlugFromEntityId(canvas.id) }}
            </p>
            <p class="truncate font-data text-[11px] text-muted-foreground">
              {{ canvasPathFromEntityId(canvas.id) }}
            </p>
          </div>
          <Icon name="lucide:chevron-right" class="h-4 w-4 shrink-0 text-muted-foreground/50" />
        </NuxtLink>
      </li>
    </ul>
  </Page>
</template>
