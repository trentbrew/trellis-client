<script setup lang="ts">
  const colorMode = useColorMode()
</script>

<template>
  <Toaster
    class="toaster group"
    :visible-toasts="5"
    close-button
    :duration="7000"
    :theme="colorMode.value === 'dark' ? 'dark' : 'light'"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
    }"
    :toast-options="{
      class: 'items-start!',
      classes: {
        icon: 'mt-0.5',
        toast:
          'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg whitespace-nowrap overflow-hidden',
        description: 'group-[.toast]:text-muted-foreground truncate',
        title: 'truncate',
        actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground whitespace-nowrap',
        cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground whitespace-nowrap',
      },
    }"
  />
</template>
