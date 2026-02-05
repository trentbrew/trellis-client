<script setup lang="ts">
  import { scanDeprecatedData, purgeDeprecatedData, resetUserData, type CleanupReport } from '~/lib/adminCleanup'

  definePageMeta({
    layout: 'default',
  })

  const router = useRouter()
  const instant = useInstantDb()
  const { user } = useInstantAuth()

  const currentOrg = useState<any>('currentOrg')
  const currentApp = useState<any>('currentApp')

  const isScanning = ref(false)
  const isPurging = ref(false)
  const isResetting = ref(false)
  const report = ref<CleanupReport | null>(null)
  const showResetConfirm = ref(false)

  const scan = async () => {
    if (!user.value?.id) return
    isScanning.value = true
    try {
      report.value = await scanDeprecatedData(instant, { userId: user.value.id })
    } catch (e) {
      console.error('[AdminCleanup] Scan failed:', e)
    } finally {
      isScanning.value = false
    }
  }

  const purge = async () => {
    if (!user.value?.id) return
    isPurging.value = true
    try {
      report.value = await purgeDeprecatedData(instant, { userId: user.value.id, dryRun: false })
      // Re-scan after purge
      await scan()
    } catch (e) {
      console.error('[AdminCleanup] Purge failed:', e)
    } finally {
      isPurging.value = false
    }
  }

  const resetAll = async () => {
    if (!user.value?.id) return
    isResetting.value = true
    try {
      await resetUserData(instant, user.value.id, { dryRun: false })
      report.value = null
      showResetConfirm.value = false

      // Clear cached selection so we don't attempt to re-enter an old workspace.
      currentOrg.value = null
      currentApp.value = null

      if (import.meta.client) {
        try {
          localStorage.removeItem('turtle:lastOrgId')
          localStorage.removeItem('turtle:lastAppId')
          localStorage.removeItem('pinned-sidebar-items')
        } catch {
          // ignore
        }
      }

      await router.replace({ path: '/welcome', query: {} })
    } catch (e) {
      console.error('[AdminCleanup] Reset failed:', e)
    } finally {
      isResetting.value = false
    }
  }

  onMounted(() => {
    scan()
  })
</script>

<template>
  <Page
    variant="settings"
    title="Data Cleanup"
    subtitle="Admin"
    description="Scan and purge deprecated/orphaned data from previous schema versions."
    icon="lucide:trash-2">
    <div class="space-y-6">
      <div class="rounded-lg border border-border bg-card p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Scan for orphaned data</h2>
            <p class="text-sm text-muted-foreground">
              Check for collections, settings, apps, or orgs without valid parent references.
            </p>
          </div>
          <UiButton :disabled="isScanning" @click="scan">
            <Icon v-if="isScanning" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
            <Icon v-else name="lucide:search" class="mr-2 h-4 w-4" />
            {{ isScanning ? 'Scanning...' : 'Scan' }}
          </UiButton>
        </div>

        <div v-if="report" class="space-y-4 border-t pt-4">
          <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div class="rounded-lg border border-border bg-background p-4">
              <div class="text-2xl font-bold">{{ report.orphanedCollections.length }}</div>
              <div class="text-sm text-muted-foreground">Orphaned Collections</div>
            </div>
            <div class="rounded-lg border border-border bg-background p-4">
              <div class="text-2xl font-bold">{{ report.orphanedSettings.length }}</div>
              <div class="text-sm text-muted-foreground">Orphaned Settings</div>
            </div>
            <div class="rounded-lg border border-border bg-background p-4">
              <div class="text-2xl font-bold">{{ report.orphanedApps.length }}</div>
              <div class="text-sm text-muted-foreground">Orphaned Apps</div>
            </div>
            <div class="rounded-lg border border-border bg-background p-4">
              <div class="text-2xl font-bold">{{ report.orphanedOrgs.length }}</div>
              <div class="text-sm text-muted-foreground">Orphaned Orgs</div>
            </div>
          </div>

          <div v-if="report.totalOrphaned > 0" class="space-y-3">
            <div v-if="report.orphanedCollections.length" class="space-y-2">
              <h3 class="text-sm font-medium">Orphaned Collections</h3>
              <div class="space-y-1">
                <div
                  v-for="item in report.orphanedCollections"
                  :key="item.id"
                  class="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm">
                  <span class="font-mono text-xs">{{ item.title }}</span>
                  <span class="text-muted-foreground">{{ item.reason }}</span>
                </div>
              </div>
            </div>

            <div v-if="report.orphanedSettings.length" class="space-y-2">
              <h3 class="text-sm font-medium">Orphaned Settings</h3>
              <div class="space-y-1">
                <div
                  v-for="item in report.orphanedSettings.slice(0, 10)"
                  :key="item.id"
                  class="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm">
                  <span class="font-mono text-xs">{{ item.settingKey }}</span>
                  <span class="text-muted-foreground">{{ item.reason }}</span>
                </div>
                <div v-if="report.orphanedSettings.length > 10" class="text-sm text-muted-foreground px-3">
                  ... and {{ report.orphanedSettings.length - 10 }} more
                </div>
              </div>
            </div>

            <div v-if="report.orphanedApps.length" class="space-y-2">
              <h3 class="text-sm font-medium">Orphaned Apps</h3>
              <div class="space-y-1">
                <div
                  v-for="item in report.orphanedApps"
                  :key="item.id"
                  class="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm">
                  <span class="font-mono text-xs">{{ item.name }}</span>
                  <span class="text-muted-foreground">{{ item.reason }}</span>
                </div>
              </div>
            </div>

            <div v-if="report.orphanedOrgs.length" class="space-y-2">
              <h3 class="text-sm font-medium">Orphaned Orgs</h3>
              <div class="space-y-1">
                <div
                  v-for="item in report.orphanedOrgs"
                  :key="item.id"
                  class="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm">
                  <span class="font-mono text-xs">{{ item.name }}</span>
                  <span class="text-muted-foreground">{{ item.reason }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 border-t pt-4">
              <UiButton variant="destructive" :disabled="isPurging" @click="purge">
                <Icon v-if="isPurging" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
                <Icon v-else name="lucide:trash-2" class="mr-2 h-4 w-4" />
                {{ isPurging ? 'Purging...' : `Purge ${report.totalOrphaned} orphaned records` }}
              </UiButton>
            </div>
          </div>

          <div v-else class="text-center py-8">
            <Icon name="lucide:check-circle" class="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p class="text-lg font-medium">No orphaned data found</p>
            <p class="text-sm text-muted-foreground">Your database is clean!</p>
          </div>
        </div>
      </div>

      <div class="rounded-lg border border-destructive bg-destructive/10 p-6 space-y-4">
        <div>
          <h2 class="text-lg font-semibold text-destructive">Danger Zone</h2>
          <p class="text-sm text-muted-foreground">
            Nuclear option: delete ALL your data (orgs, apps, collections, settings).
          </p>
        </div>

        <div v-if="!showResetConfirm" class="flex justify-end">
          <UiButton variant="outline" @click="showResetConfirm = true">
            <Icon name="lucide:alert-triangle" class="mr-2 h-4 w-4" />
            Reset all data
          </UiButton>
        </div>

        <div v-else class="space-y-3 border-t border-destructive/20 pt-4">
          <UiAlert variant="destructive">
            <Icon name="lucide:alert-triangle" class="h-4 w-4" />
            <UiAlertTitle>Are you absolutely sure?</UiAlertTitle>
            <UiAlertDescription>
              This will permanently delete ALL your organizations, applications, collections, and settings. This action
              cannot be undone.
            </UiAlertDescription>
          </UiAlert>

          <div class="flex items-center justify-end gap-2">
            <UiButton variant="outline" @click="showResetConfirm = false">Cancel</UiButton>
            <UiButton variant="destructive" :disabled="isResetting" @click="resetAll">
              <Icon v-if="isResetting" name="lucide:loader-2" class="mr-2 h-4 w-4 animate-spin" />
              <Icon v-else name="lucide:trash-2" class="mr-2 h-4 w-4" />
              {{ isResetting ? 'Resetting...' : 'Yes, delete everything' }}
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </Page>
</template>
