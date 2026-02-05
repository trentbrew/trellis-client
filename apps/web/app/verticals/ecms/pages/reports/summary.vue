<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const { selectedYear } = useYear()

  useHead(() => ({
    title: `Facility Summary | ${currentFacility.value?.name || 'Facility'}`,
  }))

  // Demo stats
  const stats = [
    {
      label: 'Open Tasks',
      value: 24,
      change: '+3',
      trend: 'up',
      icon: 'lucide:list-checks',
      color: 'text-emerald-500',
    },
    { label: 'Overdue', value: 3, change: '-2', trend: 'down', icon: 'lucide:alert-triangle', color: 'text-red-500' },
    {
      label: 'Active Permits',
      value: 12,
      change: '0',
      trend: 'neutral',
      icon: 'lucide:file-badge',
      color: 'text-blue-500',
    },
    {
      label: 'Compliance Score',
      value: '94%',
      change: '+2%',
      trend: 'up',
      icon: 'lucide:shield-check',
      color: 'text-violet-500',
    },
  ]
</script>

<template>
  <PageDashboard
    title="Facility Summary"
    :subtitle="currentFacility?.name"
    :description="`Compliance overview for ${selectedYear}`"
    icon="lucide:layout-dashboard"
    icon-class="text-blue-300"
    :stat-columns="4">
    <!-- Actions -->
    <template #actions>
      <UiButton variant="outline">
        <Icon name="lucide:download" class="mr-2 h-4 w-4" />
        Export Report
      </UiButton>
    </template>

    <!-- Stats Cards -->
    <template #stats>
      <UiCard v-for="stat in stats" :key="stat.label">
        <UiCardContent class="p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground">{{ stat.label }}</p>
              <p class="text-2xl font-bold">{{ stat.value }}</p>
              <p
                v-if="stat.change !== '0'"
                class="text-xs"
                :class="stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'">
                {{ stat.change }} from last month
              </p>
            </div>
            <div class="rounded-lg bg-muted p-3">
              <Icon :name="stat.icon" :class="['h-6 w-6', stat.color]" />
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </template>

    <!-- Charts Row -->
    <UiCard>
      <UiCardHeader>
        <UiCardTitle>Task Completion Trend</UiCardTitle>
        <UiCardDescription>Monthly task completion rate</UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <div class="flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
          <div class="text-center text-muted-foreground">
            <Icon name="lucide:line-chart" class="mx-auto h-8 w-8 mb-2" />
            <p class="text-sm">Chart placeholder</p>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

    <UiCard>
      <UiCardHeader>
        <UiCardTitle>Permit Status</UiCardTitle>
        <UiCardDescription>Current permit status breakdown</UiCardDescription>
      </UiCardHeader>
      <UiCardContent>
        <div class="flex h-48 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
          <div class="text-center text-muted-foreground">
            <Icon name="lucide:pie-chart" class="mx-auto h-8 w-8 mb-2" />
            <p class="text-sm">Chart placeholder</p>
          </div>
        </div>
      </UiCardContent>
    </UiCard>

    <!-- Full Width Section -->
    <template #fullWidth>
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Recent Activity</UiCardTitle>
          <UiCardDescription>Latest compliance activities at this facility</UiCardDescription>
        </UiCardHeader>
        <UiCardContent>
          <div class="space-y-4">
            <div
              v-for="i in 5"
              :key="i"
              class="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
              <div class="rounded-full bg-primary/10 p-2">
                <Icon name="lucide:check-circle" class="h-4 w-4 text-primary" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium">Task completed: Stormwater inspection #{{ i }}</p>
                <p class="text-xs text-muted-foreground">Completed by John Doe • {{ i }} days ago</p>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </template>
  </PageDashboard>
</template>
