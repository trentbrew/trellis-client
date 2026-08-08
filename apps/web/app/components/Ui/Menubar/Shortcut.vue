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
      }
    >(),
    { as: 'span' },
  )
  const forwarded = reactiveOmit(props, 'class')
  const styles = tv({
    base: 'ml-auto text-xs tracking-widest text-muted-foreground',
  })
</script>

<template>
  <Primitive data-slot="menubar-shortcut" :class="styles({ class: props.class })" v-bind="forwarded">
    <slot />
  </Primitive>
</template>
