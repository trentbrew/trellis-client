<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const fieldDescriptionStyles = tv({
    base: [
      'text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance',
      'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
      '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
    ],
  })
</script>
<script lang="ts" setup>
  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        /**
         * Additional classes to apply to the element.
         */
        class?: ClassNameValue
      }
    >(),
    {
      as: 'p',
    },
  )
</script>
<template>
  <Primitive :as :as-child data-slot="field-description" :class="fieldDescriptionStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
