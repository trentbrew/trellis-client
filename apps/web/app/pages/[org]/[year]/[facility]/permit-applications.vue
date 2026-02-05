<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'
  import { useBrowse } from '~/composables/useBrowse'
  import { useGlobalDetailSheet } from '~/composables/useGlobalDetailSheet'

  interface PermitApplication {
    id: string
    permitType: string
    applicationType: string
    status: string
    submitted: string | null
    agency: string
    deadline: string
  }

  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const { currentOrganization } = useOrganizations()

  useHead(() => ({
    title: `Permit Applications | ${currentFacility.value?.name || 'Facility'}`,
  }))

  const { open: openDetail } = useGlobalDetailSheet()

  const selectedApps = ref<string[]>([])

  const applications = ref([
    {
      id: '1',
      permitType: 'Air Quality - Title V',
      applicationType: 'Renewal',
      status: 'in-review',
      submitted: '2025-01-10',
      agency: 'State EPA',
      deadline: '2025-03-15',
    },
    {
      id: '2',
      permitType: 'NPDES Stormwater',
      applicationType: 'Modification',
      status: 'draft',
      submitted: null,
      agency: 'Regional EPA',
      deadline: '2025-02-28',
    },
    {
      id: '3',
      permitType: 'Hazardous Waste',
      applicationType: 'New Permit',
      status: 'submitted',
      submitted: '2025-01-05',
      agency: 'State DEQ',
      deadline: '2025-04-01',
    },
    {
      id: '4',
      permitType: 'Wastewater Discharge',
      applicationType: 'Renewal',
      status: 'approved',
      submitted: '2024-12-01',
      agency: 'County Water',
      deadline: '2025-01-15',
    },
    {
      id: '5',
      permitType: 'Solid Waste',
      applicationType: 'Amendment',
      status: 'additional-info',
      submitted: '2025-01-08',
      agency: 'State EPA',
      deadline: '2025-02-15',
    },
    {
      id: '6',
      permitType: 'Underground Storage Tank',
      applicationType: 'New Permit',
      status: 'in-review',
      submitted: '2025-01-12',
      agency: 'State Fire Marshal',
      deadline: '2025-03-30',
    },
    {
      id: '7',
      permitType: 'Air Quality - Minor Source',
      applicationType: 'Renewal',
      status: 'approved',
      submitted: '2024-11-15',
      agency: 'State EPA',
      deadline: '2025-01-20',
    },
    {
      id: '8',
      permitType: 'Industrial Pretreatment',
      applicationType: 'Modification',
      status: 'submitted',
      submitted: '2025-01-15',
      agency: 'Municipal Water',
      deadline: '2025-04-15',
    },
    {
      id: '9',
      permitType: 'RCRA Part B',
      applicationType: 'Renewal',
      status: 'draft',
      submitted: null,
      agency: 'Federal EPA',
      deadline: '2025-06-01',
    },
    {
      id: '10',
      permitType: 'Noise Variance',
      applicationType: 'New Permit',
      status: 'approved',
      submitted: '2024-12-20',
      agency: 'County Zoning',
      deadline: '2025-01-30',
    },
    {
      id: '11',
      permitType: 'Spill Prevention (SPCC)',
      applicationType: 'Amendment',
      status: 'in-review',
      submitted: '2025-01-18',
      agency: 'Federal EPA',
      deadline: '2025-04-30',
    },
    {
      id: '12',
      permitType: 'Stormwater Construction',
      applicationType: 'New Permit',
      status: 'additional-info',
      submitted: '2025-01-02',
      agency: 'State DEQ',
      deadline: '2025-02-20',
    },
  ])

  const stats = computed<PageStat[]>(() => [
    { label: 'Total Applications', value: applications.value.length, icon: 'lucide:file-input' },
    {
      label: 'In Review',
      value: applications.value.filter((a) => a.status === 'in-review').length,
      icon: 'lucide:eye',
      color: 'text-blue-500',
    },
    {
      label: 'Action Needed',
      value: applications.value.filter((a) => a.status === 'additional-info' || a.status === 'draft').length,
      icon: 'lucide:alert-circle',
      color: 'text-amber-500',
    },
    {
      label: 'Approved',
      value: applications.value.filter((a) => a.status === 'approved').length,
      icon: 'lucide:check-circle',
      color: 'text-emerald-500',
    },
  ])

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'in-review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'additional-info': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    denied: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const statusLabels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    'in-review': 'In Review',
    'additional-info': 'Info Requested',
    approved: 'Approved',
    denied: 'Denied',
  }

  const { browseState, filteredItems: filteredApps } = useBrowse({
    items: applications,
    searchFields: ['permitType', 'agency'],
    defaultViewMode: 'table',
    sortOptions: [
      { value: 'deadline', label: 'Deadline' },
      { value: 'permitType', label: 'Permit Type' },
    ],
    filters: [
      {
        id: 'status',
        label: 'Status',
        icon: 'lucide:filter',
        options: [
          { value: 'all', label: 'All Statuses' },
          ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
        ],
        fn: (item, val) => item.status === val,
      },
      {
        id: 'agency',
        label: 'Agency',
        icon: 'lucide:building-2',
        options: [
          { value: 'all', label: 'All Agencies' },
          { value: 'State EPA', label: 'State EPA' },
          { value: 'Regional EPA', label: 'Regional EPA' },
          { value: 'Federal EPA', label: 'Federal EPA' },
          { value: 'State DEQ', label: 'State DEQ' },
          { value: 'County Water', label: 'County Water' },
          { value: 'Municipal Water', label: 'Municipal Water' },
          { value: 'State Fire Marshal', label: 'State Fire Marshal' },
          { value: 'County Zoning', label: 'County Zoning' },
        ],
        fn: (item, val) => item.agency === val,
      },
    ],
  })

  const viewMode = computed(() => browseState.viewMode.value)

  // Listen for global detail sheet events
  onMounted(() => {
    window.addEventListener('global-detail-sheet:save', ((e: CustomEvent) => {
      const { node, formData, mode } = e.detail
      if (e.detail.entityType !== 'permit') return

      if (mode === 'create') {
        applications.value.push({ ...formData, id: crypto.randomUUID() })
      } else {
        const index = applications.value.findIndex((a) => a.id === node.id)
        if (index !== -1) applications.value[index] = { ...applications.value[index], ...formData }
      }
    }) as EventListener)

    window.addEventListener('global-detail-sheet:delete', ((e: CustomEvent) => {
      const { node } = e.detail
      if (e.detail.entityType !== 'permit') return
      applications.value = applications.value.filter((a) => a.id !== node.id)
    }) as EventListener)
  })
</script>

<template>
  <Page
    variant="browse"
    title="Permit Applications"
    :subtitle="currentOrganization?.name"
    description="Track and manage permit applications across regulatory agencies."
    icon="lucide:file-input"
    icon-class="text-blue-300"
    search-placeholder="Search applications..."
    :stats="stats"
    :show-view-switcher="true"
    :fill-height="true"
    :browse="browseState">
    <!-- Filters are now handled automatically by Page.vue via browseState -->

    <!-- Page handles #search and #viewSwitcher via :browse prop -->

    <template #toolbarActions>
      <UiButton @click="openDetail(null, { entityType: 'permit', mode: 'create' })">
        <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
        New Application
      </UiButton>
    </template>

    <!-- Table View -->
    <div v-if="viewMode === 'table'" class="overflow-hidden rounded-xl border border-border bg-card">
      <UiTable>
        <UiTableHeader>
          <UiTableRow>
            <UiTableHead class="w-12">
              <UiCheckbox
                :checked="selectedApps.length === filteredApps.length && filteredApps.length > 0"
                @update:checked="selectedApps = $event ? filteredApps.map((a) => a.id) : []" />
            </UiTableHead>
            <UiTableHead>Permit Type</UiTableHead>
            <UiTableHead>Type</UiTableHead>
            <UiTableHead>Status</UiTableHead>
            <UiTableHead>Agency</UiTableHead>
            <UiTableHead>Submitted</UiTableHead>
            <UiTableHead>Deadline</UiTableHead>
            <UiTableHead class="w-12"></UiTableHead>
          </UiTableRow>
        </UiTableHeader>
        <UiTableBody>
          <UiTableRow
            v-for="app in filteredApps"
            :key="app.id"
            class="cursor-pointer"
            @click="openDetail(app, { entityType: 'permit' })">
            <UiTableCell>
              <UiCheckbox
                :checked="selectedApps.includes(app.id)"
                @update:checked="
                  selectedApps = $event ? [...selectedApps, app.id] : selectedApps.filter((id) => id !== app.id)
                " />
            </UiTableCell>
            <UiTableCell>
              <span class="font-medium">{{ app.permitType }}</span>
            </UiTableCell>
            <UiTableCell class="text-muted-foreground">{{ app.applicationType }}</UiTableCell>
            <UiTableCell>
              <span :class="['rounded-full px-2 py-1 text-xs font-medium', statusColors[app.status]]">
                {{ statusLabels[app.status] }}
              </span>
            </UiTableCell>
            <UiTableCell>{{ app.agency }}</UiTableCell>
            <UiTableCell class="text-muted-foreground">{{ app.submitted || '—' }}</UiTableCell>
            <UiTableCell class="text-muted-foreground">{{ app.deadline }}</UiTableCell>
            <UiTableCell>
              <UiButton variant="ghost" size="icon">
                <Icon name="lucide:more-horizontal" class="h-4 w-4" />
              </UiButton>
            </UiTableCell>
          </UiTableRow>
        </UiTableBody>
      </UiTable>
    </div>

    <!-- List View -->
    <div v-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="app in filteredApps"
        :key="app.id"
        class="flex items-center gap-4 rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors cursor-pointer"
        @click="openDetail(app, { entityType: 'permit' })">
        <UiCheckbox
          :checked="selectedApps.includes(app.id)"
          @update:checked="
            selectedApps = $event ? [...selectedApps, app.id] : selectedApps.filter((id) => id !== app.id)
          " />
        <Icon name="lucide:file-input" class="h-5 w-5 text-muted-foreground shrink-0" />
        <div class="flex-1 min-w-0">
          <p class="font-medium truncate">{{ app.permitType }}</p>
          <p class="text-sm text-muted-foreground">{{ app.agency }} · {{ app.applicationType }}</p>
        </div>
        <span :class="['rounded-full px-2 py-1 text-xs font-medium shrink-0', statusColors[app.status]]">
          {{ statusLabels[app.status] }}
        </span>
        <span class="text-sm text-muted-foreground shrink-0">{{ app.deadline }}</span>
        <UiButton variant="ghost" size="icon" class="shrink-0">
          <Icon name="lucide:more-horizontal" class="h-4 w-4" />
        </UiButton>
      </div>
    </div>

    <!-- Grid View -->
    <div v-else-if="viewMode === 'grid'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard
        v-for="app in filteredApps"
        :key="app.id"
        class="relative overflow-hidden hover:bg-accent/30 transition-colors cursor-pointer"
        @click="openDetail(app, { entityType: 'permit' })">
        <div class="absolute top-0 left-0 w-1 h-full" :class="(statusColors[app.status] || '').split(' ')[0]" />
        <UiCardHeader class="pb-2">
          <div class="flex items-start justify-between">
            <UiCheckbox
              :checked="selectedApps.includes(app.id)"
              @update:checked="
                selectedApps = $event ? [...selectedApps, app.id] : selectedApps.filter((id) => id !== app.id)
              " />
            <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', statusColors[app.status]]">
              {{ statusLabels[app.status] }}
            </span>
          </div>
          <UiCardTitle class="text-base mt-2">{{ app.permitType }}</UiCardTitle>
          <p class="text-sm text-muted-foreground">{{ app.applicationType }}</p>
        </UiCardHeader>
        <UiCardContent class="pt-0 space-y-2">
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon name="lucide:building" class="h-4 w-4" />
            <span>{{ app.agency }}</span>
          </div>
          <div class="flex items-center justify-between text-sm text-muted-foreground">
            <span>Submitted: {{ app.submitted || '—' }}</span>
            <span>Due: {{ app.deadline }}</span>
          </div>
        </UiCardContent>
      </UiCard>
    </div>

    <div class="text-sm text-muted-foreground mt-4 pt-4 border-t border-border pb-10">
      Showing {{ filteredApps.length }} applications
    </div>
  </Page>
</template>
