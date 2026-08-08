<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Custom class(es) to add to the element */
        class?: ClassNameValue
      }
    >(),
    { as: 'div' },
  )

  const styles = tv({
    base: 'flex items-center px-6 [.border-t]:pt-6',
  })
</script>

<template>
  <Primitive data-slot="card-footer" :class="styles({ class: props.class })" :as="as" :as-child="asChild">
    <slot />
  </Primitive>
</template>
