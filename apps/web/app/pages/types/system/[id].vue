<script setup lang="ts">
  import { findSystemTypeById } from '~/lib/systemTypes'

  definePageMeta({
    title: 'System Type',
    layout: 'fullscreen',
    middleware: ['auth'],
  })

  const route = useRoute()
  const id = computed(() => String(route.params.id || ''))

  const systemType = computed(() => {
    const value = id.value
    if (!value) return null
    return findSystemTypeById(value)
  })

  const isCreating = ref(false)
</script>

<template>
  <Page :fill-height="true" :full-width="true" subtitle="Schema Layer" :show-back-button="true">
    <template v-if="systemType" #header>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="bg-foreground/10 flex h-10 w-10 items-center justify-center rounded-lg">
              <Icon :name="systemType.icon || 'lucide:box'" class="h-5 w-5" />
            </div>
            <div>
              <div class="text-3xl font-bold">{{ systemType.name }}</div>
            </div>
          </div>
        </div>
        <div class="ml-0">
          <div class="text-sm text-foreground/50 px-2 -ml-2 max-w-[800px]">
            {{ systemType.description || '—' }}
          </div>
        </div>
      </div>
    </template>

    <div v-if="systemType" class="space-y-6 p-6">
      <p class="text-muted-foreground text-sm">
        System types are canonical and read-only. Create a custom type that extends this system type to add app-specific
        fields.
      </p>

      <div class="flex flex-wrap gap-2">
        <UiButton @click="isCreating = true">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Create custom type extending {{ systemType.name }}
        </UiButton>
        <UiButton variant="outline" as-child>
          <NuxtLink to="/types">Back to Types</NuxtLink>
        </UiButton>
      </div>

      <TypeCreateModal v-model:open="isCreating" :default-extends="systemType.id" />
    </div>

    <div v-else class="flex items-center justify-center h-full">
      <div class="text-center">
        <Icon name="lucide:alert-circle" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">System Type Not Found</h2>
        <UiButton as-child>
          <NuxtLink to="/types">Back to Types</NuxtLink>
        </UiButton>
      </div>
    </div>
  </Page>
</template>
