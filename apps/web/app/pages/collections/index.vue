<script setup lang="ts">
  definePageMeta({
    title: 'Pages',
    icon: 'lucide:database',
    middleware: ['auth'],
    layout: 'fullscreen',
  })

  const route = useRoute()
  const { collections, currentApp } = useInstantData()
  const isCreating = ref(false)
  const showImportDialog = ref(false)

  const lastVisitedKey = computed(() => {
    const appId = currentApp.value?.id
    return appId ? `last-visited-collection:${appId}` : ''
  })

  const redirectToLastVisited = async () => {
    if (!import.meta.client) return
    if (!currentApp.value) return
    if (!Array.isArray(collections.value) || collections.value.length === 0) return
    if (route.path !== '/collections') return

    let storedSlug: string | null = null
    if (lastVisitedKey.value) {
      try {
        storedSlug = localStorage.getItem(lastVisitedKey.value)
      } catch {
        storedSlug = null
      }
    }
    const hasStored = !!storedSlug && collections.value.some((c) => c.slug === storedSlug)
    const targetSlug = hasStored ? storedSlug! : collections.value[0]!.slug
    await navigateTo(`/collections/${targetSlug}`, { replace: true })
  }

  watch(
    [collections, () => currentApp.value?.id, () => route.path],
    () => {
      void redirectToLastVisited()
    },
    { immediate: true },
  )
</script>

<template>
  <Page
    variant="sidebar"
    title="Pages"
    subtitle="Workspace"
    description="Create and manage databases"
    icon="lucide:database"
    :fill-height="true"
    :left-sidebar="collections.length > 0">
    <!-- Show sidebar only when collections exist -->
    <template v-if="collections.length > 0" #sidebar>
      <AppSidebar />
    </template>

    <div v-if="collections.length === 0" class="flex h-full items-center justify-center p-8">
      <div class="text-center max-w-md">
        <Icon name="lucide:folder-code" class="text-muted-foreground mx-auto h-16 w-16 mb-4" />
        <h3 class="text-lg font-semibold mb-2">No Pages Yet</h3>
        <p class="text-muted-foreground text-sm mb-6">Create your first database to start tracking anything.</p>
        <div class="flex gap-2 justify-center mb-4">
          <UiButton @click="isCreating = true">
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            New database
          </UiButton>
          <UiButton variant="outline" @click="showImportDialog = true">
            <Icon name="lucide:upload" class="mr-2 h-4 w-4" />
            Import
          </UiButton>
        </div>
      </div>
    </div>

    <div v-else class="flex h-full items-center justify-center p-8">
      <div class="text-center">
        <Icon name="lucide:database" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">Pages</h2>
        <p class="text-muted-foreground mb-4">Select a database from the sidebar to get started</p>
      </div>
    </div>

    <!-- Create Collection Modal -->
    <CollectionCreateModal v-model:open="isCreating" />

    <!-- Import Collection Dialog -->
    <CollectionImportDialog v-model:open="showImportDialog" />
  </Page>
</template>
