<script setup lang="ts">
  import type { ShortcutDefinition, KeyChord } from '~/types/shortcuts'
  import { formatKeyChord, eventToKeyChord } from '~/types/shortcuts'

  const {
    shortcuts,
    groupedShortcuts,
    conflicts,
    setOverride,
    resetOverride,
    resetAllOverrides,
    hasOverride,
    getDefaultKeys,
  } = useKeyboardShortcuts()

  // ── Search ──────────────────────────────────────────────────────────
  const searchQuery = ref('')

  const filteredGroups = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return groupedShortcuts.value

    const result: Record<string, ShortcutDefinition[]> = {}
    for (const [category, items] of Object.entries(groupedShortcuts.value)) {
      const filtered = items.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          formatKeyChord(s.keys).toLowerCase().includes(q) ||
          s.keys.toLowerCase().includes(q),
      )
      if (filtered.length) result[category] = filtered
    }
    return result
  })

  // ── Rebind capture ──────────────────────────────────────────────────
  const capturingId = ref<string | null>(null)
  const capturedChord = ref<KeyChord | null>(null)

  function startCapture(id: string) {
    capturingId.value = id
    capturedChord.value = null
  }

  function cancelCapture() {
    capturingId.value = null
    capturedChord.value = null
  }

  function handleCaptureKeydown(e: KeyboardEvent) {
    if (!capturingId.value) return
    e.preventDefault()
    e.stopPropagation()

    // Escape cancels capture
    if (e.key === 'Escape') {
      cancelCapture()
      return
    }

    // Ignore lone modifier presses
    if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) return

    const chord = eventToKeyChord(e)
    capturedChord.value = chord
  }

  function confirmCapture() {
    if (capturingId.value && capturedChord.value) {
      setOverride(capturingId.value, capturedChord.value)
    }
    cancelCapture()
  }

  // ── Conflict check for captured chord ─────────────────────────────
  const captureConflict = computed(() => {
    if (!capturedChord.value || !capturingId.value) return null
    return shortcuts.value.find(
      (s) => s.id !== capturingId.value && s.keys === capturedChord.value,
    )
  })

  // ── Conflict lookup by shortcut ID ────────────────────────────────
  function hasConflict(id: string): boolean {
    return conflicts.value.some(
      (c) => c.shortcuts[0].id === id || c.shortcuts[1].id === id,
    )
  }
</script>

<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Keyboard Shortcuts"
    description="View and customize keyboard shortcuts. Click a shortcut to rebind it.">
    <div class="space-y-6">
      <!-- Search + Reset All -->
      <div class="flex items-center gap-3">
        <div class="relative flex-1 max-w-sm">
          <Icon
            name="lucide:search"
            class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search shortcuts..."
            class="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/40" />
        </div>
        <UiButton
          v-if="shortcuts.some((s) => hasOverride(s.id))"
          variant="outline"
          size="sm"
          @click="resetAllOverrides">
          <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5 mr-1.5" />
          Reset all
        </UiButton>
      </div>

      <!-- Shortcut groups -->
      <template v-for="(items, category) in filteredGroups" :key="category">
        <UiCard v-if="items.length">
          <UiCardHeader>
            <UiCardTitle>{{ category }}</UiCardTitle>
          </UiCardHeader>
          <UiCardContent class="p-0">
            <div class="divide-y divide-border">
              <div
                v-for="shortcut in items"
                :key="shortcut.id"
                class="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                <!-- Label + description -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium">{{ shortcut.label }}</span>
                    <span
                      class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {{ shortcut.scope }}
                    </span>
                    <!-- Conflict badge -->
                    <span
                      v-if="hasConflict(shortcut.id)"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-destructive/15 text-destructive font-medium">
                      conflict
                    </span>
                    <!-- Custom badge -->
                    <span
                      v-if="hasOverride(shortcut.id)"
                      class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      custom
                    </span>
                  </div>
                  <p v-if="shortcut.description" class="text-xs text-muted-foreground mt-0.5">
                    {{ shortcut.description }}
                  </p>
                </div>

                <!-- Key chord display / capture -->
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Capturing state -->
                  <template v-if="capturingId === shortcut.id">
                    <div
                      class="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-primary bg-primary/5 animate-pulse"
                      tabindex="0"
                      autofocus
                      @keydown="handleCaptureKeydown">
                      <template v-if="capturedChord">
                        <kbd class="text-sm font-mono font-semibold text-primary">
                          {{ formatKeyChord(capturedChord) }}
                        </kbd>
                        <!-- Conflict warning -->
                        <span v-if="captureConflict" class="text-[10px] text-destructive">
                          conflicts with "{{ captureConflict.label }}"
                        </span>
                      </template>
                      <span v-else class="text-xs text-muted-foreground">
                        Press a key combo...
                      </span>
                    </div>
                    <UiButton size="sm" variant="ghost" @click="cancelCapture">
                      <Icon name="lucide:x" class="h-3.5 w-3.5" />
                    </UiButton>
                    <UiButton
                      v-if="capturedChord"
                      size="sm"
                      variant="default"
                      @click="confirmCapture">
                      <Icon name="lucide:check" class="h-3.5 w-3.5" />
                    </UiButton>
                  </template>

                  <!-- Normal state -->
                  <template v-else>
                    <button
                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors cursor-pointer"
                      :title="`Click to rebind (default: ${formatKeyChord(getDefaultKeys(shortcut.id) || shortcut.keys)})`"
                      @click="startCapture(shortcut.id)">
                      <kbd class="text-xs font-mono font-medium text-foreground">
                        {{ formatKeyChord(shortcut.keys) }}
                      </kbd>
                    </button>

                    <!-- Reset button (only if overridden) -->
                    <button
                      v-if="hasOverride(shortcut.id)"
                      class="p-1 rounded text-muted-foreground/40 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Reset to default"
                      @click="resetOverride(shortcut.id)">
                      <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </UiCardContent>
        </UiCard>
      </template>

      <!-- Empty search state -->
      <div
        v-if="Object.keys(filteredGroups).length === 0"
        class="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Icon name="lucide:search-x" class="h-8 w-8 mb-3 opacity-40" />
        <p class="text-sm">No shortcuts matching "{{ searchQuery }}"</p>
      </div>
    </div>
  </Page>
</template>
