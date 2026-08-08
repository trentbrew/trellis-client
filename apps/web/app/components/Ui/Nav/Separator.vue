<script lang="ts" setup>
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<{
    /** Custom class(es) to add to the element */
    class?: ClassNameValue
  }>()
  const forwarded = reactiveOmit(props, 'class')

  const styles = tv({ base: 'h-5' })
</script>

<template>
  <UiSeparator orientation="vertical" v-bind="forwarded" :class="styles({ class: props.class })" />
</template>
