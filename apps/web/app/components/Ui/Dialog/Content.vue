<script lang="ts" setup>
  import { DialogContent, useForwardPropsEmits } from 'reka-ui'
  import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
  import type { HTMLAttributes } from 'vue'

  defineOptions({ inheritAttrs: false })
  const props = defineProps<
    DialogContentProps & {
      /** Icon to display in the close button */
      icon?: string
      /** Title text */
      title?: string
      /** Description text */
      description?: string
      overlayClass?: HTMLAttributes['class']
      /** Custom class(es) to add to the parent */
      class?: HTMLAttributes['class']
      /** Whether to hide the close button */
      hideClose?: boolean
      /** Where to render the dialog */
      to?: string | HTMLElement
    }
  >()
  const emits = defineEmits<DialogContentEmits>()
  const forwarded = useForwardPropsEmits(
    reactiveOmit(props, 'icon', 'title', 'description', 'overlayClass', 'class', 'hideClose', 'to'),
    emits,
  )

  const styles = tv({
    base: 'fixed top-1/2 z-[52] grid max-h-[calc(100dvh-2rem)] w-full gap-4 overflow-y-auto rounded-xl border bg-background p-0 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[1.1] data-[state=open]:slide-in-from-bottom-2 sm:max-w-100',
  })

  const { rightSidebarWidth: sidebarWidth } = useRightSidebarWidth()

  const dialogStyle = computed(() => {
    const sw = sidebarWidth.value
    return {
      left: `calc(50% - ${sw / 2}px)`,
      transform: 'translate(-50%, -50%)',
      maxWidth: `min(calc(100vw - ${sw}px - 2rem), 32rem)`,
      width: `calc(100vw - ${sw}px - 2rem)`,
    }
  })
  const preventNonOverlayClose = (e: any) => {
    const target = (e.detail?.originalEvent?.target ?? e.target) as HTMLElement | null
    // Don't close if clicking header, sidebars, or their children
    if (target?.closest('[data-slot="app-header"]') ||
        target?.closest('[data-slot="app-sidebar"]') ||
        target?.closest('[data-slot="icon-rail"]') ||
        target?.closest('[data-slot="right-sidebar"]')) {
      e.preventDefault()
    }
  }
</script>

<template>
  <UiDialogPortal :to="to">
    <UiDialogOverlay :class="overlayClass" />
    <DialogContent
      data-slot="dialog-content"
      :class="styles({ class: props.class })"
      :style="dialogStyle"
      v-bind="{ ...forwarded, ...$attrs }"
      @pointer-down-outside="preventNonOverlayClose"
      @interact-outside="preventNonOverlayClose"
    >
      <slot>
        <slot name="header">
          <UiDialogHeader>
            <slot name="title">
              <UiDialogTitle v-if="title" :title="title" />
            </slot>
            <slot name="description">
              <UiDialogDescription v-if="description" :description="description" />
            </slot>
          </UiDialogHeader>
        </slot>
        <slot name="content" />
        <slot name="footer" />
      </slot>
      <slot name="close" />
      <!-- <UiDialogClose
        v-if="!hideClose"
        class="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
      >
        <Icon name="lucide:x" class="size-4" />
        <span class="sr-only">Close</span>
      </UiDialogClose> -->
    </DialogContent>
  </UiDialogPortal>
</template>
