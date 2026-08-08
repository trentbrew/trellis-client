<script lang="ts" setup>
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    PrimitiveProps & {
      /** Custom class(es) to add to the element */
      class?: ClassNameValue
    }
  >()

  const styles = tv({
    base: 'col-span-full grid grid-cols-[auto_1fr] flex-col gap-3 gap-y-0.5 md:flex md:flex-none md:grid-cols-none md:flex-row md:items-center md:gap-2.5',
  })

  const forwarded = reactiveOmit(props, 'class')
</script>

<template>
  <Primitive v-bind="forwarded" data-slot="navbar-section" :class="styles({ class: props.class })">
    <slot />
  </Primitive>
</template>
