<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      dense?: boolean
    }>(),
    {
      dense: false,
    },
  )

  const paddingClass = computed(() => (props.dense ? 'px-3 py-2' : 'px-6 py-2.5'))
</script>

<template>
  <div class="shrink-0 border-b border-border bg-card/50" :class="paddingClass">
    <div class="flex items-center justify-between gap-4">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <slot name="left" />
      </div>
      <div class="flex shrink-0 items-center gap-1.5">
        <slot name="right" />
      </div>
    </div>
  </div>
</template>
