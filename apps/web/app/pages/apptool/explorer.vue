<script setup lang="ts">
  const searchQuery = ref('')
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="p-6 space-y-6 overflow-y-auto">
      <div>
        <h1 class="text-2xl font-bold">Response Explorer</h1>
        <p class="text-muted-foreground">Search and explore questionnaire responses across all facilities</p>
      </div>

      <div class="flex gap-4">
        <div class="relative flex-1">
          <Icon name="lucide:search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <UiInput v-model="searchQuery" placeholder="Search responses..." class="pl-10" />
        </div>
        <UiButton variant="outline">
          <Icon name="lucide:filter" class="mr-2 size-4" />
          Filters
        </UiButton>
      </div>

      <UiCard>
        <UiCardContent class="flex flex-col items-center justify-center py-12 text-center">
          <div class="flex size-16 items-center justify-center rounded-full bg-muted mb-4">
            <Icon name="lucide:search" class="size-8 text-muted-foreground" />
          </div>
          <h3 class="font-medium text-lg mb-1">Search Responses</h3>
          <p class="text-muted-foreground max-w-md">
            Enter a search term to find questionnaire responses across all facilities and standards.
          </p>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
