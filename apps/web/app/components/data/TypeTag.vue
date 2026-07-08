<script setup lang="ts">
  /** Mono type pill for data grid column headers (sheet + collection tables). */
  const props = defineProps<{
    kind: 'text' | 'number' | 'select' | 'formula' | 'relation' | 'date' | 'checkbox' | 'url' | 'email' | string
    label?: string
    relationTarget?: string
  }>()

  const display = computed(() => {
    if (props.label) return props.label
    switch (props.kind) {
      case 'formula':
        return '= fx'
      case 'relation':
        return props.relationTarget ? `→ ${props.relationTarget}` : '→ rel'
      case 'number':
        return '$ num'
      case 'select':
        return 'select'
      case 'date':
        return 'date'
      case 'checkbox':
        return 'bool'
      default:
        return props.kind
    }
  })

  const variant = computed(() => {
    if (props.kind === 'formula') return 'formula'
    if (props.kind === 'relation') return 'relation'
    return 'default'
  })
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center rounded-full border px-1.5 py-px font-data text-[9.5px] tracking-wide"
    :class="{
      'border-warning/45 text-warning not-italic': variant === 'formula',
      'border-primary/45 text-chart-1': variant === 'relation',
      'border-border text-muted-foreground': variant === 'default',
    }"
  >
    {{ display }}
  </span>
</template>
