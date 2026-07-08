<script setup lang="ts">
  import { getCleanPath } from '~/config/routes'
  import { canvasPathFromEntityId, canvasSlugFromEntityId } from '~/lib/canvas-routes'
  import { startCanvasEntityDrag } from '~/lib/canvas-dnd'
  import { getEntityTypeConfig } from '~/config/entityRegistry'

  const { wp } = useWorkspacePath()
  const route = useRoute()
  const { canvases } = useCanvasList()
  const { items, loading } = useEntities()
  const { createCanvas, creating } = useCreateCanvas()

  const activeSlug = computed(() => {
    const clean = getCleanPath(route.path)
    const match = /^\/canvases\/([^/]+)/.exec(clean)
    return match?.[1] ? decodeURIComponent(match[1]) : undefined
  })

  const onCanvasDetail = computed(() => !!activeSlug.value)

  const dragEntities = computed(() =>
    (items.value || [])
      .filter((e) => e.type !== 'canvas' && e.title)
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      .slice(0, 24),
  )

  function canvasLabel(canvas: { id: string; title?: string }) {
    return canvas.title || canvasSlugFromEntityId(canvas.id)
  }

  function isCanvasActive(canvasId: string) {
    if (!activeSlug.value) return false
    return canvasSlugFromEntityId(canvasId) === activeSlug.value
  }

  function entityIcon(type: string) {
    return getEntityTypeConfig(type)?.icon ?? 'lucide:circle'
  }

  function onEntityDragStart(event: DragEvent, entityId: string) {
    startCanvasEntityDrag(event, entityId)
  }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <p class="shrink-0 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Canvases</p>

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div v-if="loading" class="space-y-2 px-3">
        <div v-for="i in 4" :key="i" class="h-8 animate-pulse rounded-lg bg-muted/40" />
      </div>

      <p v-else-if="canvases.length === 0" class="px-3 py-4 text-xs text-muted-foreground">No canvases yet.</p>

      <nav v-else class="space-y-0.5 px-2 pb-2">
        <NuxtLink
          v-for="canvas in canvases"
          :key="canvas.id"
          :to="wp(canvasPathFromEntityId(canvas.id))"
          class="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-muted/60"
          :class="isCanvasActive(canvas.id) ? 'bg-cyan-500/10 font-semibold text-foreground' : 'text-sidebar-foreground'">
          <Icon name="lucide:layout-dashboard" class="h-3.5 w-3.5 shrink-0 text-cyan-400/80" />
          <span class="min-w-0 flex-1 truncate">{{ canvasLabel(canvas) }}</span>
        </NuxtLink>
      </nav>

      <div v-if="onCanvasDetail && dragEntities.length > 0" class="mt-2 border-t border-border/40 px-2 pt-3">
        <p class="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Drag onto canvas
        </p>
        <ul class="space-y-0.5 pb-2">
          <li
            v-for="entity in dragEntities"
            :key="entity.id"
            draggable="true"
            class="flex cursor-grab items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-sidebar-foreground hover:bg-muted/60 active:cursor-grabbing"
            data-testid="canvas-sidebar-entity-drag"
            @dragstart="onEntityDragStart($event, entity.id)">
            <Icon :name="entityIcon(entity.type)" class="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span class="min-w-0 flex-1 truncate">{{ entity.title }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-auto shrink-0 border-t border-border/40 p-2 pb-3">
      <UiButton
        class="w-full justify-center gap-2"
        size="sm"
        variant="secondary"
        :disabled="creating"
        data-testid="canvas-create-button"
        @click="createCanvas()">
        <Icon :name="creating ? 'lucide:loader-2' : 'lucide:plus'" :class="['h-4 w-4', creating && 'animate-spin']" />
        New canvas
      </UiButton>
    </div>
  </div>
</template>
