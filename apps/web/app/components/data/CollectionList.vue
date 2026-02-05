<script setup lang="ts">
  import type { Collection } from '~/types/database'

  const { collections: instantCollections } = useInstantData()

  const collections = computed<Collection[]>(() => instantCollections.value)
  const isCreating = ref(false)

  const getCollectionIcon = (icon: string) => {
    return icon || 'lucide:database'
  }

  const getCollectionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      database: 'text-blue-500',
      document: 'text-gray-500',
      board: 'text-purple-500',
      calendar: 'text-green-500',
      gallery: 'text-pink-500',
    }
    return colors[type] || 'text-gray-500'
  }
</script>

<template>
  <div class="flex h-full flex-col border-r border-border bg-card">
    <!-- Header -->
    <div class="border-b border-border p-4">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">Collections</h2>
        <UiButton size="sm" variant="ghost" @click="isCreating = true">
          <Icon name="lucide:plus" class="h-4 w-4" />
        </UiButton>
      </div>
    </div>

    <!-- Page List -->
    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="collections.length === 0" class="flex flex-col items-center justify-center py-8 text-center">
        <Icon name="lucide:database" class="text-muted-foreground mb-2 h-8 w-8" />
        <p class="text-muted-foreground text-sm">No collections yet</p>
        <UiButton size="sm" variant="ghost" class="mt-2" @click="isCreating = true">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          Create Collection
        </UiButton>
      </div>

      <div v-else class="space-y-1">
        <NuxtLink
          v-for="collection in collections"
          :key="collection.id"
          :to="`/collections/${collection.slug}`"
          class="hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors"
        >
          <Icon
            :name="getCollectionIcon(collection.icon)"
            class="h-4 w-4 shrink-0"
            :class="getCollectionTypeColor(collection.type)"
          />
          <span class="flex-1 truncate">{{ collection.title }}</span>
          <Icon
            v-if="!collection.isPublished"
            name="lucide:eye-off"
            class="text-muted-foreground h-3.5 w-3.5 shrink-0"
          />
        </NuxtLink>
      </div>
    </div>

    <!-- Create Collection Modal -->
    <CollectionCreateModal v-model:open="isCreating" />
  </div>
</template>
