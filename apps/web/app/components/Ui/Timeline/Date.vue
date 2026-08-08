<script lang="ts" setup>
  import { reactiveOmit } from '@vueuse/core'
  import { Primitive, useForwardProps } from 'reka-ui'
  import type { PrimitiveProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const styles = tv({
    base: 'mb-1 block text-xs font-medium text-muted-foreground group-data-[orientation=vertical]/timeline:max-sm:h-4',
  })
  const props = withDefaults(
    defineProps<
      PrimitiveProps & {
        class?: ClassNameValue
      }
    >(),
    {
      as: 'time',
    },
  )

  const forwarded = useForwardProps(reactiveOmit(props, ['class']))
</script>

<template>
  <Primitive data-slot="timeline-date" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </Primitive>
</template>
