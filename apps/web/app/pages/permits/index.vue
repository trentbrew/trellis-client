<script setup lang="ts">
  // Dashboard metrics
  const stats = computed(() => ({
    totalPermits: 24,
    activeApplications: 3,
    pendingReview: 7,
    expiringThisMonth: 2,
  }))

  const recentPermits = [
    {
      id: '1',
      name: 'Air Quality Operating Permit',
      facility: 'Texas Steel Mill',
      status: 'active',
      expiresAt: '2025-12-15',
    },
    {
      id: '2',
      name: 'NPDES Discharge Permit',
      facility: 'Indiana Bar Mill',
      status: 'active',
      expiresAt: '2025-08-30',
    },
    {
      id: '3',
      name: 'Hazardous Waste Permit',
      facility: 'Arkansas Sheet Mill',
      status: 'pending',
      expiresAt: '2025-06-01',
    },
    { id: '4', name: 'Stormwater Permit', facility: 'Utah Plate Mill', status: 'active', expiresAt: '2026-01-15' },
  ]

  const pendingApplications = [
    {
      id: '1',
      name: 'Title V Renewal',
      facility: 'Texas Steel Mill',
      submittedAt: '2024-11-15',
      status: 'under_review',
    },
    {
      id: '2',
      name: 'RCRA Permit Modification',
      facility: 'Indiana Bar Mill',
      submittedAt: '2024-12-01',
      status: 'pending',
    },
    { id: '3', name: 'Air Permit Amendment', facility: 'Carolina Rebar', submittedAt: '2024-12-05', status: 'draft' },
  ]

  function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'active') return 'default'
    if (status === 'pending' || status === 'under_review') return 'secondary'
    if (status === 'expired') return 'destructive'
    return 'outline'
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="space-y-6 p-6 overflow-y-auto">
      <!-- Hero Section -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Main Hero Card -->
        <UiCard class="lg:col-span-2 overflow-hidden p-0! rounded-xl">
          <div class="relative h-full min-h-[280px] bg-linear-to-br from-violet-700 to-violet-900">
            <div class="absolute inset-0 bg-linear-to-t from-violet-900/90 via-violet-900/50 to-transparent" />
            <div class="relative z-10 flex flex-col h-full p-6 text-white">
              <div class="flex items-start justify-between mb-auto">
                <div class="flex items-center gap-2">
                  <Icon name="lucide:file-text" class="size-5 opacity-80" />
                  <span class="text-sm opacity-80">Permit Management</span>
                </div>
                <div class="flex items-center gap-3">
                  <UiButton class="bg-white text-violet-900 hover:bg-white/90">
                    <Icon name="lucide:plus" class="mr-2 size-4" />
                    New Application
                  </UiButton>
                </div>
              </div>
              <div class="mt-auto pb-12">
                <h1 class="text-2xl font-bold mb-2">Permits Dashboard</h1>
                <p class="text-white/70 max-w-md">
                  Manage permits, track applications, and monitor compliance conditions across all facilities.
                </p>
              </div>
              <!-- Stats Row -->
              <div class="flex items-center gap-6 text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold">{{ stats.totalPermits }}</span>
                  <span class="text-white/70">Permits</span>
                </div>
                <div class="w-px h-6 bg-white/30" />
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold">{{ stats.pendingReview }}</span>
                  <span class="text-white/70">Pending Review</span>
                </div>
                <div class="w-px h-6 bg-white/30" />
                <div class="flex items-center gap-2">
                  <span class="text-2xl font-bold">{{ stats.activeApplications }}</span>
                  <span class="text-white/70">Applications</span>
                </div>
              </div>
            </div>
          </div>
        </UiCard>

        <!-- Quick Access -->
        <UiCard class="p-0!">
          <UiCardHeader class="pb-3">
            <UiCardTitle class="text-lg">Quick Access</UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="space-y-2 pt-0">
            <NuxtLink
              to="/permits/indexing"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group cursor-pointer">
              <div class="flex size-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Icon name="lucide:file-search" class="size-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">Permit Indexing</p>
                <p class="text-xs text-muted-foreground">Review and annotate conditions</p>
              </div>
              <Icon
                name="lucide:chevron-right"
                class="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </NuxtLink>
            <NuxtLink
              to="/permits/applications"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group cursor-pointer">
              <div class="flex size-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <Icon name="lucide:file-plus" class="size-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">Applications</p>
                <p class="text-xs text-muted-foreground">{{ stats.activeApplications }} in progress</p>
              </div>
              <Icon
                name="lucide:chevron-right"
                class="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </NuxtLink>
            <NuxtLink
              to="/permits/conditions"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group cursor-pointer">
              <div class="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Icon name="lucide:list-tree" class="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm">Conditions Library</p>
                <p class="text-xs text-muted-foreground">Manage permit conditions</p>
              </div>
              <Icon
                name="lucide:chevron-right"
                class="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </NuxtLink>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Metrics Row -->
      <div class="grid gap-4 md:grid-cols-4">
        <UiCard>
          <UiCardContent class="p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-muted-foreground">Total Permits</h3>
              <Icon name="lucide:file-text" class="size-4 text-muted-foreground" />
            </div>
            <div class="text-2xl font-bold">{{ stats.totalPermits }}</div>
          </UiCardContent>
        </UiCard>
        <UiCard>
          <UiCardContent class="p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-muted-foreground">Active Applications</h3>
              <Icon name="lucide:file-plus" class="size-4 text-muted-foreground" />
            </div>
            <div class="text-2xl font-bold">{{ stats.activeApplications }}</div>
          </UiCardContent>
        </UiCard>
        <UiCard>
          <UiCardContent class="p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-muted-foreground">Pending Review</h3>
              <Icon name="lucide:clock" class="size-4 text-muted-foreground" />
            </div>
            <div class="text-2xl font-bold">{{ stats.pendingReview }}</div>
          </UiCardContent>
        </UiCard>
        <UiCard>
          <UiCardContent class="p-4">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-medium text-muted-foreground">Expiring Soon</h3>
              <Icon name="lucide:alert-triangle" class="size-4 text-amber-500" />
            </div>
            <div class="text-2xl font-bold text-amber-600 dark:text-amber-400">{{ stats.expiringThisMonth }}</div>
          </UiCardContent>
        </UiCard>
      </div>

      <!-- Content Grid -->
      <div class="grid gap-6 lg:grid-cols-2">
        <!-- Recent Permits -->
        <UiCard>
          <UiCardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <div>
                <UiCardTitle class="text-lg">Recent Permits</UiCardTitle>
                <p class="text-sm text-muted-foreground">Latest permit activity</p>
              </div>
              <UiButton variant="ghost" size="sm">
                View All
                <Icon name="lucide:arrow-right" class="ml-1 size-4" />
              </UiButton>
            </div>
          </UiCardHeader>
          <UiCardContent class="space-y-3 pt-0">
            <div
              v-for="permit in recentPermits"
              :key="permit.id"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div class="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Icon name="lucide:file-text" class="size-5 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm truncate">{{ permit.name }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ permit.facility }} · Expires {{ formatDate(permit.expiresAt) }}
                </p>
              </div>
              <UiBadge :variant="getStatusVariant(permit.status)" class="capitalize">
                {{ permit.status }}
              </UiBadge>
            </div>
          </UiCardContent>
        </UiCard>

        <!-- Pending Applications -->
        <UiCard>
          <UiCardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <div>
                <UiCardTitle class="text-lg">Pending Applications</UiCardTitle>
                <p class="text-sm text-muted-foreground">Applications in progress</p>
              </div>
              <UiButton variant="ghost" size="sm">
                View All
                <Icon name="lucide:arrow-right" class="ml-1 size-4" />
              </UiButton>
            </div>
          </UiCardHeader>
          <UiCardContent class="space-y-3 pt-0">
            <div
              v-for="app in pendingApplications"
              :key="app.id"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div class="flex size-10 items-center justify-center rounded-lg bg-muted">
                <Icon name="lucide:file-plus" class="size-5 text-muted-foreground" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm truncate">{{ app.name }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ app.facility }} · Submitted {{ formatDate(app.submittedAt) }}
                </p>
              </div>
              <UiBadge :variant="getStatusVariant(app.status)" class="capitalize">
                {{ app.status.replace('_', ' ') }}
              </UiBadge>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </div>
  </Page>
</template>
