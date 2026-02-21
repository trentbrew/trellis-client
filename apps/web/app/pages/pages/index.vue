<script setup lang="ts">
  definePageMeta({ layout: 'default' })
  useHead({ title: 'Pages' })

  const { pages, loading, createPage } = usePageNotes()

  const firstPage = computed(() => pages.value[0])

  // Auto-redirect to the first page if one exists
  watch([loading, pages], async ([isLoading]) => {
    if (!isLoading && firstPage.value) {
      navigateTo(`/pages/${firstPage.value.id}`, { replace: true })
    }
  }, { immediate: true })

  const creating = ref(false)
  async function handleCreateFirst() {
    if (creating.value) return
    creating.value = true
    try {
      const id = await createPage({ title: '' })
      if (id) navigateTo(`/pages/${id}`)
    } finally {
      creating.value = false
    }
  }
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
    <template v-if="loading">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin opacity-30" />
    </template>
    <template v-else-if="!firstPage">
      <Icon name="lucide:notebook" class="h-12 w-12 opacity-20" />
      <div class="text-center space-y-2">
        <p class="text-sm font-medium text-foreground">No pages yet</p>
        <p class="text-xs">Create your first page to get started.</p>
        <UiButton size="sm" :disabled="creating" @click="handleCreateFirst">
          <Icon name="lucide:plus" class="h-3.5 w-3.5 mr-1.5" />
          New Page
        </UiButton>
      </div>
    </template>
  </div>
</template>
