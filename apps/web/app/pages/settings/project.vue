<script setup lang="ts">
  import type { WorldAccessLevel } from '~/types/database'
  import { exportAdapterData } from '~/lib/data-adapter'

  const { mode, entityBackend, ontologyBackend, isCloud, isLocal } = useAdapterStatus()
  const { userRole } = useUserRole()
  const currentApp = useState<any>('currentApp')
  const adapter = useDataAdapter()
  const { $toast } = useNuxtApp()

  const isExporting = ref(false)
  const isPurging = ref(false)
  const purgeConfirmText = ref('')
  const showPurgeConfirm = ref(false)

  const canPurge = computed(() => ['owner', 'admin'].includes(userRole.value))

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

  async function handlePurgeData() {
    if (!canPurge.value || purgeConfirmText.value !== 'purge') return
    isPurging.value = true
    try {
      const res = await $fetch('/api/graph/purge', {
        method: 'DELETE',
        body: { agentId: 'browser' },
      }) as { ok: boolean; deleted: number }
      showPurgeConfirm.value = false
      purgeConfirmText.value = ''
      $toast?.success(`Purged ${res.deleted} entities. Graph is now empty.`)
    } catch (err: any) {
      $toast?.error(err?.data?.message || 'Purge failed')
    } finally {
      isPurging.value = false
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

      <!-- Danger Zone -->
      <UiCard v-if="canPurge" class="border-destructive/30">
        <UiCardContent class="p-0">
          <div class="px-4 py-3 space-y-3">
            <div class="flex items-center gap-3">
              <div class="flex size-9 items-center justify-center rounded-lg bg-destructive/10">
                <Icon name="lucide:triangle-alert" class="size-4 text-destructive" />
              </div>
              <div>
                <p class="text-foreground text-sm font-semibold">Danger Zone</p>
                <p class="text-muted-foreground text-xs">Irreversible actions that affect all workspace data.</p>
              </div>
            </div>

            <div class="border border-destructive/20 rounded-lg divide-y divide-destructive/10">
              <!-- Purge row -->
              <div class="flex items-center justify-between px-4 py-3 gap-4">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground">Purge all entity data</p>
                  <p class="text-xs text-muted-foreground">
                    Permanently deletes every entity in the graph. Ontologies and schema definitions are preserved.
                  </p>
                </div>
                <UiButton
                  variant="destructive"
                  size="sm"
                  class="shrink-0"
                  :disabled="isPurging"
                  @click="showPurgeConfirm = !showPurgeConfirm">
                  <Icon name="lucide:trash-2" class="mr-1.5 h-3.5 w-3.5" />
                  Purge data
                </UiButton>
              </div>

              <!-- Inline confirmation -->
              <Transition name="slide-down">
                <div v-if="showPurgeConfirm" class="px-4 py-3 bg-destructive/5 space-y-3">
                  <p class="text-xs text-destructive font-medium">
                    This will permanently delete all entities in the graph. This cannot be undone.
                    Type <span class="font-mono font-bold">purge</span> to confirm.
                  </p>
                  <div class="flex items-center gap-2">
                    <input
                      v-model="purgeConfirmText"
                      type="text"
                      placeholder="purge"
                      class="flex-1 rounded-md border border-destructive/40 bg-background px-3 py-1.5 text-sm font-mono outline-none focus:ring-1 focus:ring-destructive/50"
                      @keydown.enter="handlePurgeData"
                      @keydown.escape="showPurgeConfirm = false; purgeConfirmText = ''" />
                    <UiButton
                      variant="ghost"
                      size="sm"
                      @click="showPurgeConfirm = false; purgeConfirmText = ''">
                      Cancel
                    </UiButton>
                    <UiButton
                      variant="destructive"
                      size="sm"
                      :disabled="purgeConfirmText !== 'purge' || isPurging"
                      @click="handlePurgeData">
                      <Icon v-if="isPurging" name="lucide:loader-2" class="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      {{ isPurging ? 'Purging…' : 'Confirm purge' }}
                    </UiButton>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>

<style scoped>
  .slide-down-enter-active,
  .slide-down-leave-active {
    transition: all 0.2s ease;
    overflow: hidden;
  }
  .slide-down-enter-from,
  .slide-down-leave-to {
    opacity: 0;
    max-height: 0;
  }
  .slide-down-enter-to,
  .slide-down-leave-from {
    opacity: 1;
    max-height: 200px;
  }
</style>
