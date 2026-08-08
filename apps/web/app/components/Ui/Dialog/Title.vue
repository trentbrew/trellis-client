<script lang="ts" setup>
  import { DialogTitle } from 'reka-ui'
  import type { DialogTitleProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    DialogTitleProps & {
      /** Custom class(es) to add to the parent */
      class?: ClassNameValue
      /** The title text */
      title?: string
    }
  >()
  const forwarded = reactiveOmit(props, 'class', 'title')
  const styles = tv({
    base: 'text-lg leading-none font-semibold tracking-tight',
  })
</script>

<template>
  <DialogTitle data-slot="dialog-title" :class="styles({ class: props.class })" v-bind="forwarded">
    <slot>{{ title }}</slot>
  </DialogTitle>
</template>
