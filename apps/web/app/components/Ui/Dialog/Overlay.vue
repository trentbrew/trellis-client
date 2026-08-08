<script lang="ts" setup>
  import { DialogOverlay } from 'reka-ui'
  import type { DialogOverlayProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  const props = defineProps<
    DialogOverlayProps & {
      /** Custom class(es) to add to the parent */
      class?: ClassNameValue
    }
  >()
  const forwarded = reactiveOmit(props, 'class')
  const { rightSidebarWidth: sidebarWidth } = useRightSidebarWidth()

  const overlayStyle = computed(() => {
    const sw = sidebarWidth.value
    return {
      right: `${sw}px`,
    }
  })

  const styles = tv({
    base: 'fixed inset-0 z-50 pointer-events-none bg-background/50 backdrop-blur-[2px] backdrop-brightness-75 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
  })

  const preventRightSidebarClose = (e: any) => {
    const target = (e.detail?.originalEvent?.target ?? e.target) as HTMLElement | null
    if (target?.closest('[data-slot="right-sidebar"]')) {
      e.preventDefault()
    }
  }
</script>

<template>
  <DialogOverlay
    data-slot="dialog-overlay"
    :class="styles({ class: props.class })"
    :style="overlayStyle"
    v-bind="forwarded"
    @pointer-down-outside="preventRightSidebarClose"
  />
</template>
