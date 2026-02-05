<script lang="ts" setup>
  export interface DialogWrapperProps {
    open: boolean
    title?: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    showNavigation?: boolean
    canNavigatePrev?: boolean
    canNavigateNext?: boolean
    showSidebar?: boolean
    sidebarTitle?: string
    validationStatus?: 'valid' | 'invalid' | 'pending'
    validationMessage?: string
    submitLabel?: string
    cancelLabel?: string
    showDelete?: boolean
    isLoading?: boolean
  }

  const _props = withDefaults(defineProps<DialogWrapperProps>(), {
    size: 'lg',
    showNavigation: false,
    canNavigatePrev: false,
    canNavigateNext: false,
    showSidebar: false,
    validationStatus: 'pending',
    submitLabel: 'Save',
    cancelLabel: 'Cancel',
    showDelete: false,
    isLoading: false,
  })

  const emit = defineEmits<{
    'update:open': [value: boolean]
    close: []
    submit: []
    delete: []
    navigatePrev: []
    navigateNext: []
  }>()

  const sizeClasses: Record<string, string> = {
    sm: 'w-[min(500px,calc(100vw-4rem))]! max-w-[min(500px,calc(100vw-4rem))]! h-auto max-h-[calc(100vh-4rem)]',
    md: 'w-[min(700px,calc(100vw-4rem))]! max-w-[min(700px,calc(100vw-4rem))]! h-auto max-h-[calc(100vh-4rem)]',
    lg: 'w-[min(900px,calc(100vw-4rem))]! max-w-[min(900px,calc(100vw-4rem))]! h-[min(700px,calc(100vh-4rem))] max-h-[min(700px,calc(100vh-4rem))]',
    xl: 'w-[min(1200px,calc(100vw-6rem))]! max-w-[min(1200px,calc(100vw-6rem))]! h-[min(800px,calc(100vh-6rem))] max-h-[min(800px,calc(100vh-6rem))]',
    full: 'w-[calc(100vw-4rem)]! max-w-[calc(100vw-4rem)]! h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)]',
  }

  const handleClose = () => {
    emit('update:open', false)
    emit('close')
  }

  const handleSubmit = () => {
    emit('submit')
  }

  const validationColors = {
    valid: 'bg-emerald-50 text-emerald-700',
    invalid: 'bg-amber-50 text-amber-700',
    pending: 'bg-muted text-muted-foreground',
  }

  const validationIcons = {
    valid: 'lucide:check-circle',
    invalid: 'lucide:alert-circle',
    pending: 'lucide:circle-dashed',
  }

  const validationIconColors = {
    valid: 'text-emerald-600',
    invalid: 'text-amber-600',
    pending: 'text-muted-foreground',
  }
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogContent
      :hide-close="true"
      :class="[
        sizeClasses[size],
        'p-0 overflow-hidden rounded-xl border border-border bg-card shadow-2xl flex flex-col gap-0',
      ]">
      <UiDialogTitle class="sr-only">{{ title || 'Dialog' }}</UiDialogTitle>
      <UiDialogDescription class="sr-only">{{ description || ' ' }}</UiDialogDescription>
      <!-- Header -->
      <div
        v-if="title || $slots.header"
        class="px-6 py-4 shrink-0 bg-muted/20 border-b border-border flex items-start justify-between gap-4">
        <slot name="header">
          <div class="flex-1 min-w-0">
            <h2 v-if="title" class="text-xl font-semibold mb-1">{{ title }}</h2>
            <p v-if="description" class="text-sm text-muted-foreground">{{ description }}</p>
            <slot name="header-badges" />
          </div>
        </slot>

        <!-- Navigation Buttons -->
        <div v-if="showNavigation" class="flex items-center gap-1 shrink-0">
          <UiButton
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :disabled="!canNavigatePrev"
            @click="emit('navigatePrev')">
            <Icon name="lucide:chevron-up" class="h-4 w-4" />
          </UiButton>
          <UiButton
            variant="ghost"
            size="icon"
            class="h-8 w-8"
            :disabled="!canNavigateNext"
            @click="emit('navigateNext')">
            <Icon name="lucide:chevron-down" class="h-4 w-4" />
          </UiButton>
        </div>

        <!-- Close button if no navigation -->
        <UiButton
          v-else
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0"
          @click="handleClose">
          <Icon name="lucide:x" class="h-4 w-4" />
        </UiButton>
      </div>

      <!-- Properties Bar -->
      <div v-if="$slots.properties" class="border-b border-border px-6 py-3 bg-muted/10 shrink-0">
        <slot name="properties" />
      </div>

      <!-- Main Content Area -->
      <div class="flex flex-1 min-h-0">
        <!-- Main Content -->
        <div :class="['flex-1 flex flex-col min-w-0 overflow-hidden', showSidebar && 'border-r border-border']">
          <!-- Section Header -->
          <div v-if="$slots['section-header']" class="border-b border-border px-6 py-3 shrink-0">
            <slot name="section-header" />
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto">
            <slot />
          </div>
        </div>

        <!-- Sidebar -->
        <aside v-if="showSidebar" class="w-96 shrink-0 bg-muted/5 flex flex-col min-h-0">
          <div v-if="sidebarTitle" class="px-5 py-4 border-b border-border bg-muted/20 shrink-0">
            <h3 class="text-sm font-semibold flex items-center gap-2">
              <slot name="sidebar-icon">
                <Icon name="lucide:settings" class="h-4 w-4 text-muted-foreground" />
              </slot>
              {{ sidebarTitle }}
              <slot name="sidebar-badge" />
            </h3>
          </div>
          <div class="flex-1 overflow-y-auto p-5">
            <slot name="sidebar" />
          </div>
        </aside>
      </div>

      <!-- Footer -->
      <div
        v-if="$slots.footer || submitLabel"
        class="border-t border-border px-4 py-3 shrink-0 bg-muted/10 flex items-center justify-between">
        <slot name="footer-left">
          <div
            v-if="validationMessage"
            class="flex items-center gap-2 rounded-lg px-3 py-2"
            :class="validationColors[validationStatus]">
            <Icon
              :name="validationIcons[validationStatus]"
              class="h-4 w-4"
              :class="validationIconColors[validationStatus]" />
            <span class="text-xs font-medium">{{ validationMessage }}</span>
          </div>
          <div v-else />
        </slot>

        <slot name="footer-right">
          <div class="flex items-center gap-2">
            <slot name="footer-actions" />
            <UiButton
              v-if="showDelete"
              variant="outline"
              size="sm"
              class="gap-1.5 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              @click="emit('delete')">
              <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
              Delete
            </UiButton>
            <UiButton variant="outline" size="sm" @click="handleClose">
              {{ cancelLabel }}
            </UiButton>
            <UiButton
              size="sm"
              :disabled="validationStatus === 'invalid' || isLoading"
              @click="handleSubmit">
              <Icon v-if="isLoading" name="lucide:loader-2" class="mr-2 h-3.5 w-3.5 animate-spin" />
              {{ submitLabel }}
            </UiButton>
          </div>
        </slot>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>
