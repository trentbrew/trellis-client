<script lang="ts" setup>
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /** Custom class(es) to add to parent element */
        class?: ClassNameValue
      }
    >(),
    {
      as: 'div',
    },
  )
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'mt-auto flex flex-row items-center gap-3 border-t border-border/50 px-6 py-4',
  })
</script>

<template>
  <Primitive data-slot="sheet-footer" :class="styles({ class: props.class })" v-bind="forwarded">
    <slot />
  </Primitive>
</template>
