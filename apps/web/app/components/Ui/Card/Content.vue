<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Content to display in the card */
        content?: string
        /** Custom class(es) to add to the element */
        class?: ClassNameValue
      }
    >(),
    { as: 'div' },
  )
  const styles = tv({
    base: 'px-6',
  })
</script>

<template>
  <Primitive data-slot="card-content" :as="as" :as-child="asChild" :class="styles({ class: props.class })">
    <slot>
      {{ content }}
    </slot>
  </Primitive>
</template>
