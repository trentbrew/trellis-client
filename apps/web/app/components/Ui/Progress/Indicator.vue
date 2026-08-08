<script lang="ts" setup>
  import { ProgressIndicator } from 'reka-ui'
  import type { ProgressIndicatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    ProgressIndicatorProps & {
      /** Custom class(es) to add to the parent */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'h-full w-full flex-1 rounded-full bg-primary transition-all',
  })
</script>

<template>
  <ProgressIndicator data-slot="progress-indicator" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </ProgressIndicator>
</template>
