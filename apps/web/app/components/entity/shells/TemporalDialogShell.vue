<script lang="ts" setup>
  /**
   * TemporalDialogShell — Alias for EntityDialogShell.
   *
   * Temporal entities (task, event, trip, payment) share the same dialog chrome:
   * schedule badges, date pickers, mini-calendar sidebar, nav arrows.
   *
   * This thin wrapper exists so the entity registry can reference
   * 'TemporalDialogShell' consistently, while the actual implementation
   * lives in EntityDialogShell for backward compatibility.
   */

  defineProps<{
    open: boolean
    title: string
    description: string
    mode?: 'view' | 'create' | 'edit'
    typeBadge?: { icon: string; label: string }
    titlePlaceholder?: string
    canNavigatePrev?: boolean
    canNavigateNext?: boolean
    dialogTitle?: string
    dialogDescription?: string
  }>()

  const emit = defineEmits<{
    'update:open': [value: boolean]
    'update:title': [value: string]
    'update:description': [value: string]
    close: []
    navigatePrev: []
    navigateNext: []
  }>()
</script>

<template>
  <EntityDialogShell
    :open="open"
    :title="title"
    :description="description"
    :mode="mode"
    :type-badge="typeBadge"
    :title-placeholder="titlePlaceholder"
    :can-navigate-prev="canNavigatePrev"
    :can-navigate-next="canNavigateNext"
    :dialog-title="dialogTitle"
    :dialog-description="dialogDescription"
    @update:open="emit('update:open', $event)"
    @update:title="emit('update:title', $event)"
    @update:description="emit('update:description', $event)"
    @close="emit('close')"
    @navigate-prev="emit('navigatePrev')"
    @navigate-next="emit('navigateNext')">
    <template v-if="$slots.properties" #properties>
      <slot name="properties" />
    </template>
    <slot />
    <template v-if="$slots['footer-left']" #footer-left>
      <slot name="footer-left" />
    </template>
    <template v-if="$slots['footer-right']" #footer-right>
      <slot name="footer-right" />
    </template>
    <template v-if="$slots['header-badges']" #header-badges>
      <slot name="header-badges" />
    </template>
  </EntityDialogShell>
</template>
