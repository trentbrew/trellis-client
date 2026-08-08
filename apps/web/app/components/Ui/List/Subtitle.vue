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
        /** The subtitle of the component */
        subtitle?: string
      }
    >(),
    {
      as: 'p',
    },
  )
  const forwarded = reactiveOmit(props, 'class', 'subtitle')
  const styles = tv({
    base: 'text-sm text-muted-foreground',
  })
</script>

<template>
  <Primitive :class="styles({ class: props.class })" v-bind="forwarded">
    <slot>{{ subtitle }}</slot>
  </Primitive>
</template>
