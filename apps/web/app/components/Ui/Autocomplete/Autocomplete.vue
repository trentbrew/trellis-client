<script lang="ts" setup>
  import { ComboboxRoot, useForwardPropsEmits } from 'reka-ui'
  import type { ComboboxRootEmits, ComboboxRootProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    ComboboxRootProps & {
      class?: ClassNameValue
    }
  >()

  const emits = defineEmits<ComboboxRootEmits>()
  const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emits)
  const styles = tv({ base: 'relative' })
</script>

<template>
  <ComboboxRoot v-slot="slotProps" data-slot="autocomplete" v-bind="forwarded" :class="styles({ class: props.class })">
    <slot v-bind="slotProps" />
  </ComboboxRoot>
</template>
