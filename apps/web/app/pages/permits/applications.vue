<script setup lang="ts">
  const applications = [
    {
      id: '1',
      name: 'Title V Renewal',
      facility: 'Texas Steel Mill',
      submittedAt: '2024-11-15',
      dueDate: '2025-03-15',
      status: 'under_review',
      agency: 'EPA Region 6',
    },
    {
      id: '2',
      name: 'RCRA Permit Modification',
      facility: 'Indiana Bar Mill',
      submittedAt: '2024-12-01',
      dueDate: '2025-02-28',
      status: 'pending',
      agency: 'IDEM',
    },
    {
      id: '3',
      name: 'Air Permit Amendment',
      facility: 'Carolina Rebar',
      submittedAt: '2024-12-05',
      dueDate: '2025-04-01',
      status: 'draft',
      agency: 'NC DEQ',
    },
    {
      id: '4',
      name: 'NPDES Renewal',
      facility: 'Utah Plate Mill',
      submittedAt: '2024-10-20',
      dueDate: '2025-01-20',
      status: 'approved',
      agency: 'Utah DEQ',
    },
    {
      id: '5',
      name: 'Stormwater Permit',
      facility: 'Arkansas Sheet Mill',
      submittedAt: '2024-11-30',
      dueDate: '2025-02-15',
      status: 'under_review',
      agency: 'ADEQ',
    },
  ]

  function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'approved') return 'default'
    if (status === 'under_review') return 'secondary'
    if (status === 'pending') return 'outline'
    if (status === 'rejected') return 'destructive'
    return 'outline'
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function getDaysUntil(dateStr: string): number {
    const diff = new Date(dateStr).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Permit Applications</h1>
          <p class="text-muted-foreground">Track permit application and renewal status</p>
        </div>
        <UiButton>
          <Icon name="lucide:plus" class="mr-2 size-4" />
          New Application
        </UiButton>
      </div>

      <div class="grid gap-4">
        <UiCard
          v-for="app in applications"
          :key="app.id"
          class="hover:border-primary/30 transition-colors cursor-pointer">
          <UiCardContent class="p-4">
            <div class="flex items-start gap-4">
              <div class="flex size-12 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <Icon name="lucide:file-plus" class="size-6 text-rose-600 dark:text-rose-400" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-medium">{{ app.name }}</h3>
                  <UiBadge :variant="getStatusVariant(app.status)" class="capitalize">
                    {{ app.status.replace('_', ' ') }}
                  </UiBadge>
                </div>
                <p class="text-sm text-muted-foreground">{{ app.facility }}</p>
                <div class="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span class="flex items-center gap-1">
                    <Icon name="lucide:building-2" class="size-3" />
                    {{ app.agency }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Icon name="lucide:calendar" class="size-3" />
                    Submitted {{ formatDate(app.submittedAt) }}
                  </span>
                  <span
                    class="flex items-center gap-1"
                    :class="getDaysUntil(app.dueDate) < 30 ? 'text-amber-600 dark:text-amber-400' : ''">
                    <Icon name="lucide:clock" class="size-3" />
                    Due {{ formatDate(app.dueDate) }}
                    <span v-if="getDaysUntil(app.dueDate) < 60">({{ getDaysUntil(app.dueDate) }} days)</span>
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
