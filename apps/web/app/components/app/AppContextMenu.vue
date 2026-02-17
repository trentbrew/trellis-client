<script lang="ts" setup>
  /**
   * AppContextMenu — Config-driven context menu component.
   *
   * Renders a right-click context menu from a declarative action array.
   * Supports separators, icons, shortcuts, submenus, and destructive variants.
   *
   * Usage:
   *   <AppContextMenu :actions="menuActions" @action="handleAction">
   *     <template #trigger>
   *       <div>Right-click me</div>
   *     </template>
   *   </AppContextMenu>
   */

  import type { ContextMenuAction, ContextMenuEvent } from '~/types/contextMenu'

  const props = defineProps<{
    /** Resolved array of context menu actions */
    actions: ContextMenuAction[]
    /** Arbitrary context object passed back with events */
    context?: any
    /** Whether context menu is disabled */
    disabled?: boolean
  }>()

  const emit = defineEmits<{
    /** Fired when a menu action is selected */
    action: [event: ContextMenuEvent]
  }>()

  const handleAction = (action: ContextMenuAction) => {
    if (action.disabled) return
    emit('action', {
      actionId: action.id,
      context: props.context,
    })
  }

  const onContextMenu = (e: MouseEvent) => {
    // Cmd+right-click (Mac) or Ctrl+right-click (Win/Linux) → native menu
    if (e.metaKey || e.ctrlKey) {
      e.stopPropagation()
    }
  }
</script>

<template>
  <UiContextMenu>
    <UiContextMenuTrigger :disabled="disabled" as-child>
      <!-- Intercept Cmd+right-click to allow native browser context menu -->
      <div style="display: contents" @contextmenu.capture="onContextMenu">
        <slot name="trigger" />
      </div>
    </UiContextMenuTrigger>
    <UiContextMenuContent v-if="actions.length > 0" class="w-52">
      <template v-for="action in actions" :key="action.id">
        <!-- Separator before this item -->
        <UiContextMenuSeparator v-if="action.separator" />

        <!-- Submenu -->
        <UiContextMenuSub v-if="action.children && action.children.length > 0">
          <UiContextMenuSubTrigger :title="action.label" :icon="action.icon ? undefined : undefined">
            <Icon v-if="action.icon" :name="action.icon" class="mr-2 h-4 w-4" />
            {{ action.label }}
          </UiContextMenuSubTrigger>
          <UiContextMenuSubContent class="w-48">
            <template v-for="child in action.children" :key="child.id">
              <UiContextMenuSeparator v-if="child.separator" />
              <UiContextMenuItem
                :variant="child.variant"
                :disabled="child.disabled"
                @click="handleAction(child)">
                <Icon v-if="child.icon" :name="child.icon" class="mr-2 h-4 w-4" />
                {{ child.label }}
                <UiContextMenuShortcut v-if="child.shortcut">{{ child.shortcut }}</UiContextMenuShortcut>
              </UiContextMenuItem>
            </template>
          </UiContextMenuSubContent>
        </UiContextMenuSub>

        <!-- Regular item -->
        <UiContextMenuItem
          v-else
          :variant="action.variant"
          :disabled="action.disabled"
          @click="handleAction(action)">
          <Icon v-if="action.icon" :name="action.icon" class="mr-2 h-4 w-4" />
          {{ action.label }}
          <UiContextMenuShortcut v-if="action.shortcut">{{ action.shortcut }}</UiContextMenuShortcut>
        </UiContextMenuItem>
      </template>
    </UiContextMenuContent>
  </UiContextMenu>
</template>
