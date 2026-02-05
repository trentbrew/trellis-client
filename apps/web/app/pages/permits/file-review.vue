<script setup lang="ts">
  const files = [
    {
      id: '1',
      name: 'Title_V_Permit_2024.pdf',
      facility: 'Texas Steel Mill',
      uploadedBy: 'Sarah Chen',
      uploadedAt: '2024-12-05',
      size: '2.4 MB',
      status: 'pending',
    },
    {
      id: '2',
      name: 'NPDES_Renewal_Application.pdf',
      facility: 'Indiana Bar Mill',
      uploadedBy: 'Mike Johnson',
      uploadedAt: '2024-12-04',
      size: '1.8 MB',
      status: 'approved',
    },
    {
      id: '3',
      name: 'Hazwaste_Manifest_Nov2024.pdf',
      facility: 'Arkansas Sheet Mill',
      uploadedBy: 'Emily Davis',
      uploadedAt: '2024-12-03',
      size: '456 KB',
      status: 'pending',
    },
    {
      id: '4',
      name: 'Stormwater_Inspection_Report.pdf',
      facility: 'Utah Plate Mill',
      uploadedBy: 'Alex Park',
      uploadedAt: '2024-12-02',
      size: '3.1 MB',
      status: 'approved',
    },
    {
      id: '5',
      name: 'Air_Permit_Amendment_Draft.pdf',
      facility: 'Carolina Rebar',
      uploadedBy: 'Sarah Chen',
      uploadedAt: '2024-12-01',
      size: '890 KB',
      status: 'rejected',
    },
  ]

  function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
    if (status === 'approved') return 'default'
    if (status === 'pending') return 'secondary'
    if (status === 'rejected') return 'destructive'
    return 'outline'
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">File Review</h1>
          <p class="text-muted-foreground">Review and approve uploaded permit files</p>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="outline">
            <Icon name="lucide:filter" class="mr-2 size-4" />
            Filter
          </UiButton>
          <UiButton>
            <Icon name="lucide:upload" class="mr-2 size-4" />
            Upload File
          </UiButton>
        </div>
      </div>

      <UiCard>
        <UiCardContent class="p-0">
          <div class="divide-y divide-border">
            <div
              v-for="file in files"
              :key="file.id"
              class="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer">
              <div class="flex size-12 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                <Icon name="lucide:file-text" class="size-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="font-medium truncate">{{ file.name }}</h3>
                <div class="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span>{{ file.facility }}</span>
                  <span>·</span>
                  <span>{{ file.size }}</span>
                  <span>·</span>
                  <span>Uploaded by {{ file.uploadedBy }} on {{ formatDate(file.uploadedAt) }}</span>
                </div>
              </div>
              <UiBadge :variant="getStatusVariant(file.status)" class="capitalize">
                {{ file.status }}
              </UiBadge>
              <div class="flex items-center gap-1">
                <UiButton
                  v-if="file.status === 'pending'"
                  variant="ghost"
                  size="sm"
                  class="text-green-600 hover:text-green-700">
                  <Icon name="lucide:check" class="size-4" />
                </UiButton>
                <UiButton
                  v-if="file.status === 'pending'"
                  variant="ghost"
                  size="sm"
                  class="text-red-600 hover:text-red-700">
                  <Icon name="lucide:x" class="size-4" />
                </UiButton>
                <UiButton variant="ghost" size="sm">
                  <Icon name="lucide:download" class="size-4" />
                </UiButton>
              </div>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
