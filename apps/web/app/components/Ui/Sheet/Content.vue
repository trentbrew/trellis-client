<script lang="ts" setup>
  import { DialogContent, useForwardPropsEmits } from 'reka-ui'
  import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
  import { type HTMLAttributes, ref, computed, onMounted, onUnmounted } from 'vue'
  import { useSheetStack } from '~/composables/useSheetStack'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<
      DialogContentProps & {
        icon?: string
        title?: string
        description?: string
        class?: HTMLAttributes['class']
        side?: VariantProps<typeof styles>['side']
        to?: string | HTMLElement
        isBlurred?: boolean
        /** Whether the sheet is resizable */
        resizable?: boolean
        /** Default width in pixels */
        defaultWidth?: number
        /** Minimum width in pixels */
        minWidth?: number
        /** Maximum width in pixels */
        maxWidth?: number
      }
    >(),
    {
      isBlurred: true,
      resizable: true,
      defaultWidth: 50, // percentage of viewport width
      minWidth: 30,
      maxWidth: 80,
    },
  )
  const emits = defineEmits<
    DialogContentEmits & {
      resize: [width: number]
    }
  >()

  const { register, unregister, depth } = useSheetStack()
  const sheetId = Math.random().toString(36).slice(2, 9)

  onMounted(() => register(sheetId))
  onUnmounted(() => unregister(sheetId))

  const currentWidth = ref(props.defaultWidth)
  const isResizing = ref(false)

  // Calculate nested offset/width reduction (10% narrower per nesting level)
  const sheetStyle = computed(() => {
    const nestingReduction = (depth.value - 1) * 10 // 10% narrower per nesting level
    const width = Math.max(props.minWidth, currentWidth.value - nestingReduction)

    if (props.side === 'right' || props.side === 'left') {
      return {
        width: `${width}vw`,
        maxWidth: '100vw',
      }
    }
    return {}
  })

  const _isNested = computed(() => depth.value > 1)

  const startResize = (e: MouseEvent) => {
    isResizing.value = true
    const startX = e.clientX
    const startWidth = currentWidth.value

    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.value) return
      // Convert pixel delta to viewport width percentage
      const vwPerPixel = 100 / window.innerWidth
      const delta = props.side === 'right' ? startX - e.clientX : e.clientX - startX
      const deltaVw = delta * vwPerPixel
      const newWidth = Math.min(Math.max(startWidth + deltaVw, props.minWidth), props.maxWidth)
      currentWidth.value = newWidth
      emits('resize', newWidth)
    }

    const onMouseUp = () => {
      isResizing.value = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const forwarded = useForwardPropsEmits(
    reactiveOmit(
      props,
      'icon',
      'title',
      'description',
      'class',
      'to',
      'side',
      'isBlurred',
      'resizable',
      'defaultWidth',
      'minWidth',
      'maxWidth',
    ),
    emits,
  )

  const styles = tv({
    base: 'fixed z-50 flex flex-col bg-background shadow-lg transition-transform ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500',
    variants: {
      side: {
        top: 'inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        right:
          'inset-y-0 right-0 h-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
      },
      isBlurred: {
        true: 'backdrop-blur-sm',
        false: 'backdrop-blur-none',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  })
</script>

<template>
  <UiSheetPortal :to="to">
    <slot name="overlay">
      <UiSheetOverlay :is-blurred />
    </slot>
    <DialogContent
      data-slot="sheet-content"
      :class="styles({ side, isBlurred, class: props.class })"
      :style="sheetStyle"
      v-bind="{ ...forwarded, ...$attrs }">
      <!-- Resize Handle -->
      <div
        v-if="resizable && (side === 'right' || side === 'left')"
        class="absolute top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/20 transition-colors z-50"
        :class="side === 'right' ? 'left-0' : 'right-0'"
        @mousedown="startResize" />

      <div class="flex h-full flex-col overflow-hidden">
        <slot name="header">
          <UiSheetHeader>
            <slot name="title">
              <UiSheetTitle v-if="title" :title="title" />
            </slot>
            <slot name="description">
              <UiSheetDescription v-if="description" :description="description" />
            </slot>
          </UiSheetHeader>
        </slot>

        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <slot />
          <slot name="content" />
        </div>

        <slot name="footer">
          <UiSheetFooter class="border-t border-border/50 px-6 py-4">
            <!-- Footer slot can be empty or have default buttons -->
          </UiSheetFooter>
        </slot>
      </div>

      <slot name="close">
        <UiSheetClose :icon="icon" class="absolute right-4 top-4" />
      </slot>
    </DialogContent>
  </UiSheetPortal>
</template>
