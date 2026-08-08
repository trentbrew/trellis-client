<script lang="ts" setup>
  import { RadioGroupRoot, useForwardPropsEmits } from 'reka-ui'
  import type { RadioGroupRootEmits, RadioGroupRootProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = withDefaults(
    defineProps<
      RadioGroupRootProps & {
        /** Custom class(es) to add to the parent */
        class?: ClassNameValue
      }
    >(),
    {
      orientation: 'vertical',
      loop: true,
    },
  )

  const emits = defineEmits<RadioGroupRootEmits>()
  const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)

  const styles = tv({ base: 'grid gap-3' })
</script>

<template>
  <RadioGroupRoot data-slot="radio-group" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot />
  </RadioGroupRoot>
</template>
