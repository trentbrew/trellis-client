<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Custom class(es) to add to the element */
        class?: HTMLAttributes['class']
        /** Whether to constrain the width of the container */
        constrained?: boolean
      }
    >(),
    {
      as: 'div',
    },
  )

  const forwarded = reactiveOmit(props, 'class', 'constrained')

  const styles = tv({
    base: 'w-full',
    variants: {
      constrained: {
        true: 'mx-auto max-w-7xl px-4 sm:px-6',
        false: '',
      },
    },
    defaultVariants: {
      constrained: false,
    },
  })
</script>

<template>
  <Primitive
    data-slot="container"
    :data-constrained="constrained"
    :class="styles({ class: props.class, constrained })"
    v-bind="forwarded"
  >
    <slot />
  </Primitive>
</template>
