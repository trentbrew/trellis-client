<script setup lang="ts">
  definePageMeta({
    title: 'Graph',
    icon: 'lucide:git-graph',
    middleware: ['auth'],
    layout: 'fullscreen',
  })

  const route = useRoute()
  const { currentApp } = useInstantData()
  const isCreating = ref(false)

  // TODO: Replace with actual graphs data from composable when ready
  const savedGraphs = ref<any[]>([])

  const lastVisitedKey = computed(() => {
    const appId = currentApp.value?.id
    return appId ? `last-visited-graph:${appId}` : ''
  })

  const redirectToLastVisited = async () => {
    if (!import.meta.client) return
    if (!currentApp.value) return
    if (!Array.isArray(savedGraphs.value) || savedGraphs.value.length === 0) return
    if (route.path !== '/graph') return

    let storedId: string | null = null
    if (lastVisitedKey.value) {
      try {
        storedId = localStorage.getItem(lastVisitedKey.value)
      } catch {
        storedId = null
      }
    }
    const hasStored = !!storedId && savedGraphs.value.some((g: any) => g.id === storedId)
    const targetId = hasStored ? storedId! : savedGraphs.value[0]?.id
    if (targetId) {
      await navigateTo(`/graph/${targetId}`, { replace: true })
    }
  }

  watch(
    [savedGraphs, () => currentApp.value?.id, () => route.path],
    () => {
      void redirectToLastVisited()
    },
    { immediate: true },
  )
</script>

<template>
  <Page
    variant="sidebar"
    title="Graph Explorer"
    subtitle="Graph Layer"
    description="Visualize and navigate the semantic graph"
    icon="lucide:git-graph"
    :fill-height="true"
    :left-sidebar="savedGraphs.length > 0">
    <!-- Show sidebar only when graphs exist -->
    <template v-if="savedGraphs.length > 0" #sidebar>
      <AppSidebar />
    </template>

    <div v-if="savedGraphs.length === 0" class="flex h-full items-center justify-center p-8">
      <div class="text-center max-w-md">
        <Icon name="lucide:git-graph" class="text-muted-foreground mx-auto h-16 w-16 mb-4" />
        <h3 class="text-lg font-semibold mb-2">No Saved Graphs Yet</h3>
        <p class="text-muted-foreground text-sm mb-6">
          You haven't saved any graph snapshots yet. Explore the graph and save your favorite views for quick access.
        </p>
        <div class="flex gap-2 justify-center">
          <UiButton @click="isCreating = true">
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            Save Graph
          </UiButton>
          <UiButton variant="outline" as-child>
            <NuxtLink to="/graph/visualize">
              <Icon name="lucide:network" class="mr-2 h-4 w-4" />
              Graph Visualization
            </NuxtLink>
          </UiButton>
        </div>
      </div>
    </div>

    <div v-else class="flex h-full items-center justify-center p-8">
      <div class="text-center">
        <Icon name="lucide:git-graph" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">Graph Explorer</h2>
        <p class="text-muted-foreground mb-4">Select a saved graph from the sidebar or explore the visualization</p>
      </div>
    </div>

    <!-- Save Graph Modal -->
    <GraphCreateModal v-model:open="isCreating" />
  </Page>
</template>
