<script setup lang="ts">
  import type { PageStat } from '~/components/layout/Page.vue'

  definePageMeta({
    layout: 'default',
  })

  const { currentFacility } = useFacilities()
  const { currentOrganization } = useOrganizations()

  useHead(() => ({
    title: `File Review | ${currentFacility.value?.name || 'Facility'}`,
  }))

  const rightCollapsed = ref(false)
  const selectedFile = ref<string | null>('file-1')

  const files = ref([
    {
      id: 'file-1',
      name: 'Air Permit Application 2025.pdf',
      type: 'PDF',
      size: '2.4 MB',
      status: 'pending-review',
      uploadedBy: 'John Doe',
      uploadedAt: '2025-01-20',
    },
    {
      id: 'file-2',
      name: 'Stormwater Inspection Report.docx',
      type: 'DOCX',
      size: '856 KB',
      status: 'reviewed',
      uploadedBy: 'Jane Smith',
      uploadedAt: '2025-01-18',
    },
    {
      id: 'file-3',
      name: 'Hazardous Waste Manifest.pdf',
      type: 'PDF',
      size: '1.2 MB',
      status: 'pending-review',
      uploadedBy: 'Mike Johnson',
      uploadedAt: '2025-01-22',
    },
    {
      id: 'file-4',
      name: 'SPCC Plan Update.pdf',
      type: 'PDF',
      size: '4.8 MB',
      status: 'approved',
      uploadedBy: 'Sarah Wilson',
      uploadedAt: '2025-01-15',
    },
  ])

  const selectedFileData = computed(() => files.value.find((f) => f.id === selectedFile.value))

  const stats = computed<PageStat[]>(() => [
    { label: 'Total Files', value: files.value.length, icon: 'lucide:files' },
    {
      label: 'Pending Review',
      value: files.value.filter((f) => f.status === 'pending-review').length,
      icon: 'lucide:clock',
      color: 'text-amber-500',
    },
    {
      label: 'Approved',
      value: files.value.filter((f) => f.status === 'approved').length,
      icon: 'lucide:check-circle',
      color: 'text-emerald-500',
    },
  ])

  const statusColors: Record<string, string> = {
    'pending-review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  const statusLabels: Record<string, string> = {
    'pending-review': 'Pending Review',
    reviewed: 'Reviewed',
    approved: 'Approved',
    rejected: 'Rejected',
  }
</script>

<template>
  <PageSplit
    v-model:right-collapsed="rightCollapsed"
    title="File Review"
    :subtitle="currentOrganization?.name"
    description="Review and approve uploaded compliance documents."
    icon="lucide:file-check"
    icon-class="text-emerald-300"
    left-width="65%"
    :stats="stats"
    :hide-header="false">
    <!-- Left Panel Header -->
    <template #left-header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon name="lucide:file-text" class="h-4 w-4 text-muted-foreground" />
          <span class="font-medium truncate">{{ selectedFileData?.name || 'Select a file' }}</span>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="ghost" size="icon">
            <Icon name="lucide:zoom-in" class="h-4 w-4" />
          </UiButton>
          <UiButton variant="ghost" size="icon">
            <Icon name="lucide:zoom-out" class="h-4 w-4" />
          </UiButton>
          <UiButton variant="ghost" size="icon">
            <Icon name="lucide:download" class="h-4 w-4" />
          </UiButton>
        </div>
      </div>
    </template>

    <!-- Left Panel: Document Viewer -->
    <template #left>
      <div class="flex h-full items-center justify-center bg-muted/30 p-8">
        <div class="text-center">
          <Icon name="lucide:file-text" class="mx-auto h-16 w-16 text-muted-foreground/50" />
          <p class="mt-4 text-lg font-medium text-muted-foreground">Document Viewer</p>
          <p class="mt-1 text-sm text-muted-foreground/70">
            {{ selectedFileData?.name || 'No file selected' }}
          </p>
          <p class="mt-4 text-xs text-muted-foreground/50">Document preview integration would go here</p>
        </div>
      </div>
    </template>

    <!-- Right Panel Header -->
    <template #right-header>
      <div class="flex items-center justify-between">
        <span class="font-medium">Files Queue</span>
        <UiButton variant="ghost" size="sm">
          <Icon name="lucide:upload" class="mr-2 h-4 w-4" />
          Upload
        </UiButton>
      </div>
    </template>

    <!-- Right Panel: File List -->
    <template #right>
      <div class="p-4 space-y-3">
        <div
          v-for="file in files"
          :key="file.id"
          class="rounded-lg border p-3 cursor-pointer transition-colors"
          :class="[selectedFile === file.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent/50']"
          @click="selectedFile = file.id">
          <div class="flex items-start gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon
                :name="file.type === 'PDF' ? 'lucide:file-text' : 'lucide:file'"
                class="h-5 w-5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ file.name }}</p>
              <div class="flex items-center gap-2 mt-1">
                <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', statusColors[file.status]]">
                  {{ statusLabels[file.status] }}
                </span>
                <span class="text-xs text-muted-foreground">{{ file.size }}</span>
              </div>
              <p class="text-xs text-muted-foreground mt-1">{{ file.uploadedBy }} · {{ file.uploadedAt }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Right Panel Footer -->
    <template #right-footer>
      <div class="flex justify-end gap-2">
        <UiButton variant="outline">
          <Icon name="lucide:x" class="mr-2 h-4 w-4" />
          Reject
        </UiButton>
        <UiButton>
          <Icon name="lucide:check" class="mr-2 h-4 w-4" />
          Approve
        </UiButton>
      </div>
    </template>
  </PageSplit>
</template>
