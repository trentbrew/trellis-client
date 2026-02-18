<script lang="ts" setup>
  /**
   * SidebarTreeItem — Recursive sidebar tree node renderer
   *
   * Renders item nodes as nav links, group nodes as collapsible folders
   * with nested children. Supports depth-based indentation, expand/collapse
   * chevrons, context menus, and drag-and-drop reordering.
   */
  import type { SidebarTreeNode } from '~/composables/useSidebarTree'
  import type { ContextMenuAction, ContextMenuEvent } from '~/types/contextMenu'

  const props = withDefaults(defineProps<{
    node: SidebarTreeNode
    depth?: number
    sectionKey: string
    isActive?: (_path: string) => boolean
    getContextMenu?: (_node: SidebarTreeNode) => ContextMenuAction[]
    getBadge?: (_item: any) => any
    sidebarWidth?: number
  }>(), {
    depth: 0,
    isActive: () => false,
    sidebarWidth: 290,
  })

  const emit = defineEmits<{
    action: [event: ContextMenuEvent]
    toggleCollapse: [nodeId: string]
  }>()

  const BADGE_LABEL_THRESHOLD = 300

  const collapsed = useCollapsedSections()
  const pinned = usePinnedItems()

  const isGroupCollapsed = computed(() => {
    return collapsed.isCollapsed(`tree-group:${props.node.id}`)
  })

  const toggleGroup = () => {
    collapsed.toggleSection(`tree-group:${props.node.id}`)
  }

  const indentPx = computed(() => {
    // Base indent for items inside sections: 32px (ml-8)
    // Each additional depth level adds 16px
    return 32 + (props.depth * 16)
  })

  const handleAction = (event: ContextMenuEvent) => {
    emit('action', event)
  }

  const contextMenuActions = computed(() => {
    return props.getContextMenu?.(props.node) ?? []
  })

  const contextForNode = computed(() => ({
    path: props.node.routePath,
    sectionKey: props.sectionKey,
    label: props.node.label,
    icon: props.node.icon,
    _treeNodeId: props.node.id,
    _locked: props.node.locked,
  }))

  const hasChildren = computed(() => props.node.children.length > 0)
  const isGroup = computed(() => props.node.nodeType === 'group')
  const isItem = computed(() => props.node.nodeType === 'item')
</script>

<template>
  <!-- Group node: collapsible folder with nested children -->
  <li v-if="isGroup" class="sidebar-tree-group">
    <AppContextMenu
      :actions="contextMenuActions"
      :context="contextForNode"
      @action="handleAction">
      <template #trigger>
        <button
          type="button"
          class="group/group relative flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-foreground/5 hover:text-sidebar-foreground transition-colors"
          :style="{ paddingLeft: `${indentPx}px` }"
          @click="toggleGroup">
          <Icon
            name="lucide:chevron-right"
            class="h-3 w-3 shrink-0 transition-transform duration-150 opacity-50"
            :class="{ 'rotate-90': !isGroupCollapsed }" />
          <Icon
            :name="node.icon"
            class="h-3.5 w-3.5 shrink-0 opacity-50" />
          <span class="flex-1 truncate text-xs font-medium">
            {{ node.label }}
          </span>
          <span
            v-if="hasChildren && isGroupCollapsed"
            class="text-[10px] text-muted-foreground/50 tabular-nums">
            {{ node.children.length }}
          </span>
        </button>
      </template>
    </AppContextMenu>

    <!-- Nested children (animated expand/collapse) -->
    <div
      v-if="!isGroupCollapsed && hasChildren"
      class="relative">
      <!-- Vertical indentation line -->
      <div
        class="absolute w-px bg-sidebar-border/10"
        :style="{ left: `${indentPx + 6}px`, top: '0', bottom: '4px' }" />
      <ul class="space-y-0.5 py-0.5">
        <SidebarTreeItem
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :depth="depth + 1"
          :section-key="sectionKey"
          :is-active="isActive"
          :get-context-menu="getContextMenu"
          :get-badge="getBadge"
          :sidebar-width="sidebarWidth"
          @action="handleAction"
          @toggle-collapse="$emit('toggleCollapse', $event)" />
      </ul>
    </div>
  </li>

  <!-- Item node: nav link -->
  <li v-else-if="isItem" class="sidebar-tree-item">
    <AppContextMenu
      :actions="contextMenuActions"
      :context="contextForNode"
      @action="handleAction">
      <template #trigger>
        <div class="group relative" :class="depth > 0 ? 'elbow-connector-tree' : 'elbow-connector'">
          <AppNavLink
            v-if="node.routePath"
            :to="node.routePath"
            class="text-sidebar-foreground hover:bg-foreground/5 hover:text-sidebar-foreground flex items-center gap-3 rounded-lg px-3 py-2 transition pr-8"
            :style="{ marginLeft: `${indentPx}px` }"
            :class="{
              'bg-foreground/5 text-foreground': isActive(node.routePath),
            }">
            <Icon :name="node.icon" class="h-4 w-4 shrink-0 opacity-50" />
            <span class="flex-1 truncate min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs">
              {{ node.label }}
            </span>
            <template v-if="getBadge">
              <template v-if="typeof getBadge(node) === 'object' && getBadge(node)">
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0"
                  :class="[
                    getBadge(node).variant === 'success'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                      : getBadge(node).variant === 'warning'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                        : getBadge(node).variant === 'destructive'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                          : 'bg-white/10 text-sidebar-foreground/70',
                  ]">
                  {{ sidebarWidth >= BADGE_LABEL_THRESHOLD ? getBadge(node).label : (getBadge(node).label?.match?.(/\d+/)?.[0] || getBadge(node).label) }}
                </span>
              </template>
            </template>
          </AppNavLink>
          <!-- Hover actions -->
          <div
            class="absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              class="text-sidebar-foreground/60 hover:text-sidebar-foreground rounded p-0.5 hover:bg-white/10"
              :aria-label="pinned.isPinned(node.routePath || '') ? 'Unpin' : 'Pin'"
              @click.prevent.stop="pinned.togglePin(node.routePath || '')">
              <Icon
                name="lucide:pin"
                class="h-3.5 w-3.5"
                :class="{ 'fill-current': pinned.isPinned(node.routePath || '') }" />
            </button>
          </div>
        </div>
      </template>
    </AppContextMenu>
  </li>
</template>

<style scoped>
  .elbow-connector-tree::before {
    content: '';
    position: absolute;
    left: v-bind('`${indentPx - 14}px`');
    top: 50%;
    height: 1rem;
    width: 0.75rem;
    transform: translateY(-1rem);
    border-left: 1px solid var(--sidebar-border);
    border-bottom: 1px solid var(--sidebar-border);
    border-bottom-left-radius: 0.375rem;
    opacity: 0.15;
  }
</style>
