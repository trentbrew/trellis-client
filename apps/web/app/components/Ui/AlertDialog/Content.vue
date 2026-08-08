<script lang="ts" setup>
  import { AlertDialogContent, useForwardPropsEmits } from 'reka-ui'
  import type { AlertDialogContentEmits, AlertDialogContentProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'
  import type { ClassNameValue } from 'tailwind-merge'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<
    AlertDialogContentProps & {
      /** Custom class(es) to add to the `AlertDialogContent` */
      class?: ClassNameValue
      /** The element to render the portal into */
      to?: string | HTMLElement
    }
  >()
  const emit = defineEmits<AlertDialogContentEmits>()
  const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class', 'to'), emit)

  const styles = tv({
    base: 'fixed top-[50%] z-[52] grid w-full max-w-lg translate-y-[-50%] gap-4 rounded-lg border bg-background p-0 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 md:w-full',
  })

  const { rightSidebarWidth: sidebarWidth } = useRightSidebarWidth()

  const alertDialogStyle = computed(() => {
    const sw = sidebarWidth.value
    return {
      left: `calc(50% - ${sw / 2}px)`,
      transform: 'translateX(-50%)',
    }
  })

  const preventNonOverlayClose = (e: any) => {
    const target = (e.detail?.originalEvent?.target ?? e.target) as HTMLElement | null
    // Don't close if clicking header, sidebars, or their children
    if (
      target?.closest('[data-slot="app-header"]') ||
      target?.closest('[data-slot="app-sidebar"]') ||
      target?.closest('[data-slot="icon-rail"]') ||
      target?.closest('[data-slot="right-sidebar"]')
    ) {
      e.preventDefault()
    }
  }
</script>

<template>
  <UiAlertDialogPortal :to="to">
    <slot name="overlay">
      <UiAlertDialogOverlay />
    </slot>
    <AlertDialogContent
      data-slot="alert-dialog-content"
      :class="styles({ class: props.class })"
      :style="alertDialogStyle"
      v-bind="{ ...forwarded, ...$attrs }"
      @pointer-down-outside="preventNonOverlayClose"
      @interact-outside="preventNonOverlayClose"
    >
      <slot />
    </AlertDialogContent>
  </UiAlertDialogPortal>
</template>
