<script setup lang="ts">
/**
 * GoogleCalendarSettings — Connected state UI for Google Calendar integration.
 *
 * Shows: account info, sync status, calendar selector, sync interval,
 * manual sync button, and disconnect action.
 */

const {
  connection,
  isConnected,
  syncStatus,
  syncError,
  lastSyncAt,
  syncedEventCount,
  connect,
  disconnect,
  syncEvents,
  listCalendars,
} = useGoogleCalendar()

const calendars = ref<Array<{ id: string; summary: string; primary?: boolean }>>([])
const loadingCalendars = ref(false)
const disconnecting = ref(false)

// Fetch calendars when component mounts and connected
watch(isConnected, async (connected) => {
  if (!connected) { calendars.value = []; return }
  loadingCalendars.value = true
  try {
    calendars.value = await listCalendars()
  } catch {
    calendars.value = []
  } finally {
    loadingCalendars.value = false
  }
}, { immediate: true })

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} hr ago`
  return new Date(iso).toLocaleDateString()
}

async function handleDisconnect() {
  disconnecting.value = true
  try {
    await disconnect()
  } catch (err) {
    console.error('[GoogleCalendarSettings] Disconnect failed:', err)
  } finally {
    disconnecting.value = false
  }
}

async function handleSyncNow() {
  await syncEvents()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Not connected -->
    <div v-if="!isConnected" class="text-center py-8">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
        <Icon name="simple-icons:googlecalendar" class="w-8 h-8 text-blue-500" />
      </div>
      <h3 class="font-medium mb-2">Connect Google Calendar</h3>
      <p class="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        Import your events from Google Calendar. Events sync automatically and can be enriched with Trellis data.
      </p>
      <UiButton @click="connect">
        <Icon name="lucide:external-link" class="w-4 h-4 mr-2" />
        Connect with Google
      </UiButton>
    </div>

    <!-- Connected -->
    <template v-else>
      <!-- Account info -->
      <div class="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
        <div class="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
          <Icon name="lucide:check-circle" class="h-5 w-5 text-green-500" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium">{{ connection?.accountEmail || 'Connected' }}</p>
          <p class="text-xs text-muted-foreground">
            Google Calendar · Connected {{ formatRelativeTime(connection?.connectedAt ?? null) }}
          </p>
        </div>
        <UiButton
          variant="ghost"
          size="sm"
          class="text-destructive hover:text-destructive shrink-0"
          :disabled="disconnecting"
          @click="handleDisconnect">
          {{ disconnecting ? 'Disconnecting…' : 'Disconnect' }}
        </UiButton>
      </div>

      <!-- Sync status -->
      <div class="flex items-center justify-between p-3 rounded-lg bg-muted/30">
        <div class="flex items-center gap-3">
          <Icon
            :name="syncStatus === 'syncing' ? 'lucide:loader-2' : syncStatus === 'error' ? 'lucide:alert-circle' : 'lucide:refresh-cw'"
            :class="[
              'h-4 w-4',
              syncStatus === 'syncing' ? 'animate-spin text-blue-500' : '',
              syncStatus === 'error' ? 'text-red-500' : '',
              syncStatus === 'idle' ? 'text-muted-foreground' : '',
            ]" />
          <div>
            <p class="text-sm font-medium">
              {{ syncStatus === 'syncing' ? 'Syncing…' : syncStatus === 'error' ? 'Sync error' : 'Synced' }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ syncedEventCount }} events · Last sync {{ formatRelativeTime(lastSyncAt) }}
            </p>
          </div>
        </div>
        <UiButton
          variant="outline"
          size="sm"
          :disabled="syncStatus === 'syncing'"
          @click="handleSyncNow">
          <Icon name="lucide:refresh-cw" class="h-3.5 w-3.5 mr-1.5" />
          Sync Now
        </UiButton>
      </div>

      <!-- Sync error -->
      <div v-if="syncError" class="p-3 rounded-lg bg-red-500/5 border border-red-500/20 text-sm text-red-600">
        <div class="flex items-center gap-2">
          <Icon name="lucide:alert-triangle" class="h-4 w-4 shrink-0" />
          <span>{{ syncError }}</span>
        </div>
      </div>

      <!-- Calendars -->
      <div v-if="!loadingCalendars && calendars.length > 0" class="space-y-2">
        <h4 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Calendars</h4>
        <div class="space-y-1">
          <div
            v-for="cal in calendars"
            :key="cal.id"
            class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm">
            <Icon name="lucide:calendar" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span class="flex-1 truncate">{{ cal.summary }}</span>
            <span v-if="cal.primary" class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Primary
            </span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
