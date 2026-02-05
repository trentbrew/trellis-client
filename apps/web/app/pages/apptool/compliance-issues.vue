<script setup lang="ts">
  const issues = [
    {
      id: 1,
      title: 'SPCC Plan Review Overdue',
      facility: 'Texas Steel Mill',
      severity: 'high',
      dueDate: '2024-12-01',
      status: 'open',
      assignee: 'Sarah Chen',
    },
    {
      id: 2,
      title: 'Air Permit Renewal Required',
      facility: 'Indiana Bar Mill',
      severity: 'medium',
      dueDate: '2025-01-15',
      status: 'in_progress',
      assignee: 'Mike Johnson',
    },
    {
      id: 3,
      title: 'Stormwater Inspection Missing',
      facility: 'Arkansas Sheet Mill',
      severity: 'low',
      dueDate: '2024-12-20',
      status: 'open',
      assignee: 'Emily Davis',
    },
  ]

  function getSeverityClass(severity: string) {
    if (severity === 'high') return 'text-red-600 bg-red-100 dark:bg-red-900/30'
    if (severity === 'medium') return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
    return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
  }

  function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' {
    if (status === 'open') return 'destructive' as 'default'
    if (status === 'in_progress') return 'secondary'
    return 'default'
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Compliance Issues</h1>
          <p class="text-muted-foreground">Review and resolve compliance issues across facilities</p>
        </div>
        <UiButton variant="outline">
          <Icon name="lucide:filter" class="mr-2 size-4" />
          Filter
        </UiButton>
      </div>

      <div class="grid gap-4">
        <UiCard
          v-for="issue in issues"
          :key="issue.id"
          class="hover:border-primary/30 transition-colors cursor-pointer">
          <UiCardContent class="p-4">
            <div class="flex items-start gap-4">
              <div
                class="flex size-10 items-center justify-center rounded-lg"
                :class="getSeverityClass(issue.severity)">
                <Icon name="lucide:alert-triangle" class="size-5" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-medium">{{ issue.title }}</h3>
                  <UiBadge :variant="getStatusVariant(issue.status)" class="capitalize">
                    {{ issue.status.replace('_', ' ') }}
                  </UiBadge>
                </div>
                <p class="text-sm text-muted-foreground">{{ issue.facility }}</p>
                <div class="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <Icon name="lucide:calendar" class="size-3" />
                    Due: {{ issue.dueDate }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Icon name="lucide:user" class="size-3" />
                    {{ issue.assignee }}
                  </span>
                </div>
              </div>
              <UiButton variant="ghost" size="sm">
                <Icon name="lucide:arrow-right" class="size-4" />
              </UiButton>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </div>
  </Page>
</template>
