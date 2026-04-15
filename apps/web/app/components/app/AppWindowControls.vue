<script setup lang="ts">
/**
 * Custom window controls for Windows/Linux in Tauri.
 * macOS uses native traffic lights via titleBarStyle: "overlay".
 * Uses window.__TAURI__ directly to avoid import resolution issues in web builds.
 */
const { isTauri, isMacOS } = useTauriWindow()

const show = computed(() => isTauri.value && !isMacOS.value)

function getTauriWindow() {
  return (window as any).__TAURI__?.window?.getCurrentWindow?.()
}

const minimize = () => getTauriWindow()?.minimize()

const toggleMaximize = async () => {
  const win = getTauriWindow()
  if (!win) return
  if (await win.isMaximized()) win.unmaximize()
  else win.maximize()
}

const close = () => getTauriWindow()?.close()
</script>

<template>
  <div v-if="show" class="flex items-center app-region-no-drag">
    <button
      class="flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/50"
      title="Minimize"
      @click="minimize">
      <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
    </button>
    <button
      class="flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-muted/50"
      title="Maximize"
      @click="toggleMaximize">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1"><rect x="0.5" y="0.5" width="9" height="9" /></svg>
    </button>
    <button
      class="flex h-8 w-11 items-center justify-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
      title="Close"
      @click="close">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.2"><line x1="0" y1="0" x2="10" y2="10" /><line x1="10" y1="0" x2="0" y2="10" /></svg>
    </button>
  </div>
</template>
