<script setup lang="ts">
  const colorMode = useColorMode()
</script>

<template>
  <Toaster
    class="toaster group"
    position="top-right"
    :visible-toasts="5"
    close-button
    :duration="7000"
    :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
    :style="{
      'margin-top': '32px',
      '--normal-bg': 'color-mix(in srgb, var(--color-sky-950, #082f49) 80%, transparent)',
      '--normal-text': 'var(--color-sky-300, #7dd3fc)',
      '--normal-border': 'color-mix(in srgb, var(--color-sky-500, #0ea5e9) 30%, transparent)',
      '--success-bg': 'color-mix(in srgb, var(--color-emerald-950, #022c22) 80%, transparent)',
      '--success-text': 'var(--color-emerald-300, #6ee7b7)',
      '--success-border': 'color-mix(in srgb, var(--color-emerald-500, #10b981) 30%, transparent)',
      '--error-bg': 'color-mix(in srgb, var(--color-red-950, #450a0a) 80%, transparent)',
      '--error-text': 'var(--color-red-300, #fca5a5)',
      '--error-border': 'color-mix(in srgb, var(--color-red-500, #ef4444) 30%, transparent)',
      '--warning-bg': 'color-mix(in srgb, var(--color-amber-950, #451a03) 80%, transparent)',
      '--warning-text': 'var(--color-amber-300, #fcd34d)',
      '--warning-border': 'color-mix(in srgb, var(--color-amber-500, #f59e0b) 30%, transparent)',
      '--info-bg': 'color-mix(in srgb, var(--color-sky-950, #082f49) 80%, transparent)',
      '--info-text': 'var(--color-sky-300, #7dd3fc)',
      '--info-border': 'color-mix(in srgb, var(--color-sky-500, #0ea5e9) 30%, transparent)',
    }"
    :toast-options="{
      class: 'items-start!',
      classes: {
        icon: 'mt-0.5',
        toast:
          'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg overflow-visible relative',
        closeButton:
          'absolute! -top-2! -right-2! left-auto! translate-x-0! translate-y-0! border border-border bg-card shadow-sm hover:bg-muted transition-colors',
        description: 'group-[.toast]:text-muted-foreground',
        title: '',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground whitespace-nowrap',
        cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground whitespace-nowrap',
      },
    }"
  />
</template>
