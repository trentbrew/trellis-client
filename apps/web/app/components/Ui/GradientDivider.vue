<script lang="ts" setup>
  import { Separator } from 'reka-ui'
  import type { SeparatorProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    SeparatorProps & {
      /** Custom class(es) to add to parent element */
      class?: ClassNameValue
    }
  >()

  const forwarded = reactiveOmit(props, 'class')

  const styles = tv({
    base: 'h-px w-full border-t-0 bg-[linear-gradient(90deg,--alpha(var(--input)/10%),_var(--input),_--alpha(var(--input)/10%))]',
  })
</script>

<template>
  <Separator v-bind="forwarded" :class="styles({ class: props.class })" />
</template>
