<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()

  useHead(() => ({
    title: `Task Templates | ${currentFacility.value?.name || 'Facility'}`,
  }))

  const templates = [
    { id: 't-1', title: 'Quarterly Inspections', status: 'Active' },
    { id: 't-2', title: 'Permit Renewal Checklist', status: 'Draft' },
    { id: 't-3', title: 'Stormwater Sampling', status: 'Active' },
  ]
</script>

<template>
  <Page
    variant="browse"
    title="Task Templates"
    subtitle="Templates"
    description="Reusable task blueprints for recurring compliance requirements."
    icon="lucide:layout-template"
    icon-class="text-fuchsia-300">
    <UiCard>
      <UiCardHeader>
        <UiCardTitle>Facility templates</UiCardTitle>
        <UiCardDescription>Standardized tasks for repeatable compliance workflows.</UiCardDescription>
      </UiCardHeader>
      <UiCardContent class="space-y-3">
        <div
          v-for="template in templates"
          :key="template.id"
          class="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p class="text-sm font-medium text-foreground">{{ template.title }}</p>
            <p class="text-xs text-muted-foreground">Status: {{ template.status }}</p>
          </div>
          <UiButton variant="outline" size="sm">Open</UiButton>
        </div>
      </UiCardContent>
    </UiCard>
  </Page>
</template>
