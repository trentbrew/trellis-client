<script lang="ts" setup>
  import { DialogOverlay } from 'reka-ui'
  import type { DialogOverlayProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import { useSheetStack } from '~/composables/useSheetStack'

  const props = withDefaults(
    defineProps<
      DialogOverlayProps & {
        /** Custom class(es) to add to parent element */
        class?: HTMLAttributes['class']
        isBlurred?: boolean
      }
    >(),
    {
      isBlurred: true,
    },
  )

  const { depth: _depth } = useSheetStack()
  const _isNested = computed(() => _depth.value > 1)

  const forwarded = reactiveOmit(props, 'class', 'isBlurred')
  const styles = tv({
    base: 'fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
    variants: {
      isBlurred: {
        true: 'backdrop-blur-sm',
        false: 'backdrop-blur-none',
      },
    },
  })
</script>

<template>
  <DialogOverlay data-slot="sheet-overlay" :class="styles({ isBlurred, class: props.class })" v-bind="forwarded" />
</template>
