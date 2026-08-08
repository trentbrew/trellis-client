<script lang="ts">
  import { Primitive } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const emptyDescriptionStyles = tv({
    base: 'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
  })

  export type EmptyDescriptionProps = PrimitiveProps & {
    /**
     * Additional classes to apply to the parent element.
     */
    class?: ClassNameValue
  }
</script>

<script lang="ts" setup>
  const props = defineProps<EmptyDescriptionProps>()
  const forwarded = reactiveOmit(props, ['class'])
</script>

<template>
  <Primitive data-slot="empty-description" :class="emptyDescriptionStyles({ class: props.class })" v-bind="forwarded">
    <slot />
  </Primitive>
</template>
