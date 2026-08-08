<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Title to display in the card */
        title?: string
        /** Custom class(es) to add to the element */
        class?: ClassNameValue
      }
    >(),
    {
      as: 'h3',
    },
  )

  const styles = tv({
    base: 'leading-none font-semibold tracking-tight',
  })
</script>

<template>
  <Primitive data-slot="card-title" :class="styles({ class: props.class })" :as="as" :as-child="asChild">
    <slot>
      {{ title }}
    </slot>
  </Primitive>
</template>
