<script setup lang="ts">
  import type { WorldAccessLevel } from '~/types/database'
  import { exportAdapterData } from '~/lib/data-adapter'

  const { mode, entityBackend, ontologyBackend, isCloud, isLocal } = useAdapterStatus()
  const { userRole } = useUserRole()
  const currentApp = useState<any>('currentApp')
  const adapter = useDataAdapter()
  const { $toast } = useNuxtApp()

  const isExporting = ref(false)

  // ── World access level ──────────────────────────────────────────────
  const canManageAccess = computed(() => ['owner', 'admin'].includes(userRole.value))
  const currentAccessLevel = computed<WorldAccessLevel>(() => currentApp.value?.accessLevel || 'open')
  const isUpdatingAccess = ref(false)

  const accessLevelOptions: { value: WorldAccessLevel; label: string; icon: string; description: string }[] = [
    { value: 'open', label: 'Open', icon: 'lucide:globe', description: 'All workspace members can see and access this world' },
    { value: 'closed', label: 'Closed', icon: 'lucide:lock', description: 'All members can see it, but must be added to access content' },
    { value: 'private', label: 'Private', icon: 'lucide:eye-off', description: 'Only added members can see this world exists' },
  ]

  const updateAccessLevel = async (level: WorldAccessLevel) => {
    if (!currentApp.value?.id || !canManageAccess.value) return
    isUpdatingAccess.value = true
    try {
      await adapter.transact([
        adapter.tx.applications[currentApp.value.id].update({
          accessLevel: level,
          updatedAt: Date.now(),
        }),
      ])
      currentApp.value = { ...currentApp.value, accessLevel: level }
      $toast?.success(`Access level changed to ${level}`)
    } catch (err: any) {
      $toast?.error(err?.message || 'Failed to update access level')
    } finally {
      isUpdatingAccess.value = false
    }
  }

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

      <!-- World Access Level -->
      <UiCard v-if="isCloud">
        <UiCardContent class="p-0">
          <div class="px-4 py-3 space-y-3">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-violet-500/10">
                <Icon name="lucide:shield" class="size-4 text-violet-500" />
              </div>
              <div>
                <p class="text-foreground text-sm font-semibold">World Access</p>
                <p class="text-muted-foreground text-xs">
                  Control who can see and access <span class="font-medium">{{ currentApp?.name || 'this world' }}</span>.
                </p>
              </div>
            </div>
            <div v-if="canManageAccess" class="grid gap-1.5 pl-12">
              <button
                v-for="opt in accessLevelOptions"
                :key="opt.value"
                type="button"
                class="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all"
                :class="currentAccessLevel === opt.value
                  ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border/50 hover:bg-muted/30'"
                :disabled="isUpdatingAccess"
                @click="updateAccessLevel(opt.value)"
              >
                <Icon :name="opt.icon" class="h-4 w-4 shrink-0 text-muted-foreground" />
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-semibold">{{ opt.label }}</div>
                  <div class="text-[10px] text-muted-foreground">{{ opt.description }}</div>
                </div>
                <Icon v-if="currentAccessLevel === opt.value" name="lucide:check" class="h-4 w-4 text-primary" />
              </button>
            </div>
            <div v-else class="pl-12">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                :class="currentAccessLevel === 'open'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : currentAccessLevel === 'closed'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-red-500/10 text-red-500'">
                <Icon :name="accessLevelOptions.find(o => o.value === currentAccessLevel)?.icon || 'lucide:globe'" class="h-3 w-3" />
                {{ accessLevelOptions.find(o => o.value === currentAccessLevel)?.label || 'Open' }}
              </span>
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
