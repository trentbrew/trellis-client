<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })

  const { data: navigation } = await useAsyncData('docs-navigation', () =>
    queryCollection('docs').select('path', 'title', 'description', 'meta', 'navigation').all(),
  )

  const categories = computed(() => {
    if (!navigation.value) return []
    return navigation.value
      .filter((item) => item.path?.split('/').length === 3) // Only top-level categories
      .sort((a, b) => (a.navigation?.order ?? 99) - (b.navigation?.order ?? 99))
  })
</script>

<template>
  <div class="container mx-auto max-w-6xl px-4 py-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold tracking-tight">Documentation</h1>
      <p class="text-muted-foreground mt-2">Comprehensive guides and references for the Toolkit UI monorepo.</p>
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="category in categories"
        :key="category.path"
        :to="category.path"
        class="group rounded-lg border bg-card p-6 transition-colors hover:bg-accent hover:text-accent-foreground">
        <div class="flex items-center gap-3 mb-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon :name="category.icon || 'lucide:file-text'" class="h-5 w-5 text-primary" />
          </div>
          <h2 class="font-semibold">{{ category.title }}</h2>
        </div>
        <p class="text-sm text-muted-foreground">{{ category.description }}</p>
      </NuxtLink>
    </div>
  </div>
</template>
