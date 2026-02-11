<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'

  const route = useRoute()
  const entityType = computed(() => route.params.entityType as string)

  const { getDynamicEntityTypeConfig } = useOntologyRegistry()

  const typeConfig = computed(() => getDynamicEntityTypeConfig(entityType.value))

  const pageTitle = computed(() => typeConfig.value?.labelPlural || typeConfig.value?.label || entityType.value)
  const pageIcon = computed(() => typeConfig.value?.icon || 'lucide:database')
  const pageColor = computed(() => typeConfig.value?.color || 'blue')

  const items = ref<any[]>([])

  const stats = computed<PageStat[]>(() => [
    { label: 'Total', value: items.value.length, icon: 'lucide:database' },
  ])

  useHead({
    title: () => `${pageTitle.value} | Browse`,
  })
</script>

<template>
  <Page
    v-if="typeConfig"
    variant="browse"
    :title="pageTitle"
    subtitle="Custom Type"
    :icon="pageIcon"
    :icon-class="`text-${pageColor}-400`"
    search-placeholder="Search..."
    :stats="stats"
    :fill-height="true">
    <template #content>
      <div class="flex h-full flex-col items-center justify-center text-center p-8">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-2xl mb-6"
          :class="`bg-${pageColor}-500/10`">
          <Icon :name="pageIcon" class="h-8 w-8" :class="`text-${pageColor}-400`" />
        </div>
        <h2 class="text-lg font-semibold text-foreground">{{ pageTitle }}</h2>
        <p class="mt-2 text-sm text-muted-foreground max-w-md">
          This is a dynamically scaffolded page for the <strong>{{ entityType }}</strong> type.
          Create entities of this type using the CLI or API to see them here.
        </p>
        <div v-if="typeConfig && 'fields' in typeConfig" class="mt-6 w-full max-w-md">
          <p class="text-xs text-muted-foreground/70 uppercase tracking-wide mb-3">Schema Fields</p>
          <div class="grid gap-2">
            <div
              v-for="field in (typeConfig as any).fields"
              :key="field.name"
              class="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-sm">
              <span class="font-medium text-foreground/80">{{ field.name }}</span>
              <span class="text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">{{ field.valueType }}</span>
            </div>
          </div>
        </div>
        <div class="mt-6 flex gap-3">
          <UiButton variant="outline" size="sm" @click="$router.back()">
            <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
            Back
          </UiButton>
        </div>
      </div>
    </template>
  </Page>

  <div v-else class="flex h-full items-center justify-center">
    <UiCard class="max-w-md">
      <UiCardContent class="p-6 text-center">
        <Icon name="lucide:alert-circle" class="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h2 class="mt-4 text-lg font-semibold">Type Not Found</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The entity type "{{ entityType }}" is not registered.
        </p>
        <UiButton class="mt-4" variant="outline" @click="$router.back()">
          <Icon name="lucide:arrow-left" class="mr-2 h-4 w-4" />
          Go Back
        </UiButton>
      </UiCardContent>
    </UiCard>
  </div>
</template>
