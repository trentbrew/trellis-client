<script setup lang="ts">
  import { exportAdapterData } from '~/lib/data-adapter'

  const { mode, entityBackend, ontologyBackend, isCloud, isLocal } = useAdapterStatus()

  const isExporting = ref(false)

  async function handleExportData() {
    isExporting.value = true
    try {
      const adapter = useDataAdapter()
      const dump = await exportAdapterData(adapter)
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trellis-export-${mode.value}-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      isExporting.value = false
    }
  }
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Project settings"
    description="Customize your experience with toggles and preferences.">
    <div class="space-y-3">
      <!-- Data Layer -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg" :class="isCloud ? 'bg-sky-500/10' : 'bg-emerald-500/10'">
                <Icon :name="isCloud ? 'lucide:cloud' : 'lucide:hard-drive'" class="size-4" :class="isCloud ? 'text-sky-500' : 'text-emerald-500'" />
              </div>
              <div>
                <p class="text-foreground text-sm font-semibold">Data Layer</p>
                <p class="text-muted-foreground text-xs">
                  <span class="font-medium capitalize">{{ mode }}</span> mode
                  &middot; Entities: <span class="font-medium">{{ entityBackend }}</span>
                  &middot; Ontologies: <span class="font-medium">{{ ontologyBackend }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="rounded-full px-3 py-1 text-xs font-semibold"
                :class="isLocal ? 'bg-emerald-500/10 text-emerald-500' : 'bg-sky-500/10 text-sky-500'">
                {{ isLocal ? 'Self-hosted' : 'Cloud' }}
              </span>
              <button
                class="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-xs transition-colors"
                :disabled="isExporting"
                @click="handleExportData">
                <Icon name="lucide:download" class="mr-1 inline size-3" />
                {{ isExporting ? 'Exporting...' : 'Export' }}
              </button>
            </div>
          </div>
        </UiCardContent>
      </UiCard>

      <!-- Notifications -->
      <UiCard>
        <UiCardContent class="p-0">
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="bg-muted flex size-9 items-center justify-center rounded-lg">
                <Icon name="lucide:bell" class="text-muted-foreground size-4" />
              </div>
              <div>
                <p class="text-foreground text-sm font-semibold">Notifications</p>
                <p class="text-muted-foreground text-xs">Route the bell icon to your notifier preferences.</p>
              </div>
            </div>
            <span class="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold">Pending</span>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
