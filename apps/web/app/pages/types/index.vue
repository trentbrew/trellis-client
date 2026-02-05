<script setup lang="ts">
  definePageMeta({
    title: 'Types',
    icon: 'lucide:blocks',
    middleware: ['auth'],
    layout: 'fullscreen',
  })

  const route = useRoute()
  const { currentApp, customTypes } = useInstantData()
  const isCreating = ref(false)

  const lastVisitedKey = computed(() => {
    const appId = currentApp.value?.id
    return appId ? `last-visited-type:${appId}` : ''
  })

  const redirectToLastVisited = async () => {
    if (!import.meta.client) return
    if (!currentApp.value) return
    if (!Array.isArray(customTypes.value) || customTypes.value.length === 0) return
    if (route.path !== '/types') return

    let storedId: string | null = null
    if (lastVisitedKey.value) {
      try {
        storedId = localStorage.getItem(lastVisitedKey.value)
      } catch {
        storedId = null
      }
    }
    const hasStored = !!storedId && customTypes.value.some((t: any) => t.id === storedId)
    let targetId: string | null = null
    if (hasStored) {
      targetId = storedId
    } else if (customTypes.value.length > 0) {
      targetId = (customTypes.value[0] as any)?.id || null
    }
    if (targetId) {
      await navigateTo(`/types/${targetId}`, { replace: true })
    }
  }

  watch(
    [customTypes, () => currentApp.value?.id, () => route.path],
    () => {
      void redirectToLastVisited()
    },
    { immediate: true },
  )
</script>

<template>
  <Page
    variant="sidebar"
    title="Types"
    subtitle="Schema"
    description="Define custom types and extend your ontology"
    icon="lucide:blocks"
    :fill-height="true"
    :left-sidebar="customTypes.length > 0">
    <div v-if="customTypes.length === 0" class="flex h-full items-center justify-center p-8">
      <div class="text-center max-w-md">
        <Icon name="lucide:blocks" class="text-muted-foreground mx-auto h-16 w-16 mb-4" />
        <h3 class="text-lg font-semibold mb-2">No Custom Types Yet</h3>
        <p class="text-muted-foreground text-sm mb-6">
          You haven't created any custom types yet. Get started by creating your first type to extend the system
          ontology.
        </p>
        <div class="flex gap-2 justify-center">
          <UiButton @click="isCreating = true">
            <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
            Create Type
          </UiButton>
          <UiButton variant="outline" as-child>
            <NuxtLink to="/types/ontology">
              <Icon name="lucide:book-open" class="mr-2 h-4 w-4" />
              View System Types
            </NuxtLink>
          </UiButton>
        </div>
      </div>
    </div>

    <div v-else class="flex h-full items-center justify-center p-8">
      <div class="text-center">
        <Icon name="lucide:blocks" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">Types</h2>
        <p class="text-muted-foreground mb-4">Select a type from the sidebar to view and edit</p>
      </div>
    </div>

    <!-- Create Type Modal -->
    <TypeCreateModal v-model:open="isCreating" />
  </Page>
</template>
