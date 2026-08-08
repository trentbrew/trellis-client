<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Description to display in the card */
        description?: string
        /** Custom class(es) to add to the element */
        class?: ClassNameValue
      }
    >(),
    {
      as: 'div',
    },
  )
  const styles = tv({
    base: 'text-sm text-muted-foreground',
  })
</script>

<template>
  <Primitive data-slot="card-description" :class="styles({ class: props.class })" :as="as" :as-child="asChild">
    <slot>
      {{ description }}
    </slot>
  </Primitive>
</template>
