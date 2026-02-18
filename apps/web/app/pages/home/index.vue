<script setup lang="ts">
  definePageMeta({
    title: 'Home',
    icon: 'lucide:house',
  })
</script>

<template>
  <Page
    variant="default"
    title="Home"
    subtitle="Trellis"
    description="Your personal knowledge graph dashboard"
    icon="lucide:house"
    :hide-sidebar="true">
    <div class="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6 text-center px-8">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
        <Icon name="lucide:house" class="h-8 w-8 text-primary" />
      </div>
      <div class="space-y-2">
        <h2 class="text-2xl font-bold tracking-tight">Welcome home</h2>
        <p class="text-muted-foreground max-w-sm">
          Your personal dashboard is coming soon. Head to Workspace to get started.
        </p>
      </div>
      <UiButton as-child>
        <NuxtLink to="/workspace">
          <Icon name="lucide:layout-grid" class="mr-2 h-4 w-4" />
          Go to Workspace
        </NuxtLink>
      </UiButton>
    </div>
  </Page>
</template>
