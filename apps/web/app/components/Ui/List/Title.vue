<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Custom class(es) to add to the parent */
        class?: ClassNameValue
        /** The title of the component */
        title?: string
      }
    >(),
    {
      as: 'p',
    },
  )
  const forwarded = reactiveOmit(props, 'class', 'title')
  const styles = tv({
    base: 'font-semibold',
  })
</script>

<template>
  <Primitive :class="styles({ class: props.class })" v-bind="forwarded">
    <slot>{{ title }}</slot>
  </Primitive>
</template>
