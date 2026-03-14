import { DIALOG_STACK_INDEX_KEY } from '~/composables/useDialogStack'

/**
 * Used inside dialog shell components to make them stack-aware.
 *
 * Injects the stack index (provided by DialogStackEntry) and computes
 * style overrides that the shell merges into its existing positioning.
 *
 * - Originating (page-managed) dialogs have no injected index → stackIndex = -1
 * - Stacked dialogs get their 0-based index from the provider
 */
export function useDialogStackAware() {
  const dialogStack = useDialogStack()
  const { rightSidebarWidth: sidebarWidth } = useRightSidebarWidth()
  const injectedIndex = inject(DIALOG_STACK_INDEX_KEY, ref(-1))

  const stackIndex = computed(() => injectedIndex.value)
  const isStacked = computed(() => stackIndex.value >= 0)

  const stackTransform = computed(() =>
    dialogStack.getStackTransform(stackIndex.value),
  )

  /** Title of the dialog behind this one in the stack (for the back button label) */
  const parentTitle = computed(() => dialogStack.parentTitle(stackIndex.value))

  /** Whether to hide the prev/next navigation chevrons */
  const hideNavigation = computed(() => isStacked.value)

  /** Navigate back — pop this dialog off the stack */
  function onBack() {
    dialogStack.pop()
  }

  /**
   * Report this dialog's dimensions to the shared state.
   * Called by originating (non-stacked) dialogs so stacked dialogs can match.
   */
  function reportDimensions(w: number, h: number) {
    if (!isStacked.value) {
      dialogStack.setSharedDimensions(w, h)
    }
  }

  /** Effective width — stacked dialogs adopt the shared dimensions */
  function effectiveW(localW: number): number {
    if (isStacked.value && dialogStack.sharedW.value > 0) return dialogStack.sharedW.value
    return localW
  }

  /** Effective height — stacked dialogs adopt the shared dimensions */
  function effectiveH(localH: number): number {
    if (isStacked.value && dialogStack.sharedH.value > 0) return dialogStack.sharedH.value
    return localH
  }

  /**
   * Build the full inline style string for UiDialogContent,
   * merging the shell's own sizing with stack transforms.
   */
  function buildContentStyle(dialogW: number, dialogH: number): string {
    const sw = sidebarWidth.value
    const w = Math.min(effectiveW(dialogW), window.innerWidth - sw - 64)
    const h = Math.min(effectiveH(dialogH), window.innerHeight - 64)
    const t = stackTransform.value
    const baseTranslateY = -50 // percent (the normal centering offset)
    const offsetPx = t.offsetY // additional stack offset in px
    // Shift left center point left by half the sidebar width so dialog centers in available space
    const leftOffset = sw / 2

    // Combine translate + scale in a single transform property
    // translate is applied via the CSS `translate` property; scale via `transform`
    const parts = [
      `position:fixed !important`,
      `top:50% !important`,
      `left:calc(50% - ${leftOffset}px) !important`,
      `translate:-50% calc(${baseTranslateY}% + ${offsetPx}px) !important`,
      `transform:scale(${t.scale}) !important`,
      `width:${w}px !important`,
      `max-width:${w}px !important`,
      `height:${h}px !important`,
      `max-height:${h}px !important`,
      `filter:brightness(${t.brightness})`,
      `pointer-events:${t.interactive ? 'auto' : 'none'}`,
      `transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1), translate 300ms cubic-bezier(0.32, 0.72, 0, 1), filter 300ms ease`,
      ...(isStacked.value && dialogStack.distFromTop(stackIndex.value) === 0
        ? [`animation-delay: 150ms`, `animation-fill-mode: backwards`]
        : []),
    ]
    return parts.join('; ')
  }

  /**
   * Overlay class override.
   *
   * - Originating dialog (stackIndex -1): always keeps its default blur overlay
   *   so the page backdrop stays blurred even when dialogs stack above.
   *   When it becomes a background dialog, disable pointer-events so clicks
   *   pass through to the topmost dialog.
   * - Topmost stacked dialog (d=0): transparent overlay, no extra blur.
   * - Background stacked dialogs: transparent, no blur, no pointer-events.
   */
  const overlayClass = computed(() => {
    if (!isStacked.value) {
      // Originating dialog — keep default blur; disable pointer-events when buried
      const d = dialogStack.distFromTop(stackIndex.value)
      return d > 0 ? '!pointer-events-none' : undefined
    }
    // Stacked dialogs
    const d = dialogStack.distFromTop(stackIndex.value)
    if (d === 0) {
      // Topmost stacked — transparent only if an originating dialog is already providing blur;
      // otherwise show blur so the page backdrop is dimmed (e.g. opening from pages route)
      return dialogStack.originatingDialogOpen.value
        ? '!bg-transparent !backdrop-blur-none'
        : undefined
    }
    // Background stacked — transparent + no pointer-events
    return '!bg-transparent !backdrop-blur-none !pointer-events-none'
  })

  return {
    stackIndex,
    isStacked,
    stackTransform,
    parentTitle,
    hideNavigation,
    onBack,
    reportDimensions,
    buildContentStyle,
    overlayClass,
  }
}
