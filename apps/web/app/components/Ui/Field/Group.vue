<script lang="ts">
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  export const fieldGroupStyles = tv({
    base: [
      'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
    ],
  })
</script>
<script lang="ts" setup>
  const props = defineProps<
    PrimitiveProps & {
      /**
       * Additional classes to apply to the fieldset element.
       */
      class?: ClassNameValue
    }
  >()
</script>
<template>
  <Primitive :as :as-child data-slot="field-group" :class="fieldGroupStyles({ class: props.class })">
    <slot />
  </Primitive>
</template>
