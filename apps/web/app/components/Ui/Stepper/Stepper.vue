<script lang="ts" setup>
  import { StepperRoot, useForwardPropsEmits } from 'reka-ui'
  import type { StepperRootEmits, StepperRootProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    StepperRootProps & {
      class?: ClassNameValue
    }
  >()
  const emit = defineEmits<StepperRootEmits>()
  const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emit)

  const styles = tv({
    base: 'group/stepper inline-flex data-[orientation=horizontal]:w-full data-[orientation=horizontal]:flex-row data-[orientation=vertical]:flex-col',
  })
</script>

<template>
  <StepperRoot v-slot="slotProps" data-slot="stepper" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot v-bind="slotProps" />
  </StepperRoot>
</template>
