<script lang="ts" setup>
  import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import type { EntityType, Entity } from '~/types/entity'
  import { DIALOG_ENTITY_CONTEXT_KEY, type DialogEntityContext } from '~/composables/useDialogStack'

  const props = defineProps(nodeViewProps)

  const entityType = computed(() => props.node.attrs.entityType || 'task')
  const maxRows = computed(() => props.node.attrs.maxRows || 5)
  const customTitle = computed(() => props.node.attrs.title || '')

  const typeConfig = computed(() => {
    try {
      return getEntityTypeConfig(entityType.value as EntityType)
    }
    catch {
      return { icon: 'lucide:file', color: 'gray', label: entityType.value }
    }
  })

  const displayTitle = computed(() => customTitle.value || `${typeConfig.value.label}s`)

  // Query the graph reactively
  const { items } = useEntities()

  const filteredItems = computed(() => {
    if (!items.value) return []
    return items.value
      .filter((i) => i.type === entityType.value)
      .slice(0, maxRows.value)
  })

  const totalCount = computed(() => {
    if (!items.value) return 0
    return items.value.filter((i) => i.type === entityType.value).length
  })

  const columns = computed(() => {
    const type = entityType.value
    const base = [{ key: 'title', label: 'Title' }]

    // Add type-specific columns
    if (['task', 'event', 'appointment', 'trip', 'payment', 'sprint', 'budget', 'milestone'].includes(type)) {
      base.push({ key: 'status', label: 'Status' })
      base.push({ key: 'date', label: 'Date' })
    }
    else if (['note', 'file', 'page', 'bookmark'].includes(type)) {
      base.push({ key: 'category', label: 'Category' })
    }
    else if (['person', 'contact', 'organization', 'vendor'].includes(type)) {
      base.push({ key: 'detail', label: 'Detail' })
    }
    else if (['project', 'goal', 'folder', 'collection'].includes(type)) {
      base.push({ key: 'status', label: 'Status' })
    }

    return base
  })

  function getCellValue(item: Entity, col: { key: string }): string {
    const i = item as any
    switch (col.key) {
      case 'title':
        return i.title || 'Untitled'
      case 'status':
        return i.taskStatus || i.status || i.tripStatus || i.paymentStatus || i.sprintStatus || ''
      case 'date': {
        const d = i.startDate
        if (!d) return ''
        try {
          return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        catch {
          return d
        }
      }
      case 'category':
        return i.category || ''
      case 'detail':
        return i.jobTitle || i.industry || i.email || ''
      default:
        return ''
    }
  }

  const statusColors: Record<string, string> = {
    'pending': 'bg-gray-500/10 text-gray-400',
    'in-progress': 'bg-blue-500/10 text-blue-400',
    'completed': 'bg-emerald-500/10 text-emerald-400',
    'active': 'bg-emerald-500/10 text-emerald-400',
    'cancelled': 'bg-red-500/10 text-red-400',
    'on-hold': 'bg-amber-500/10 text-amber-400',
    'draft': 'bg-gray-500/10 text-gray-400',
    'overdue': 'bg-red-500/10 text-red-400',
    'due-soon': 'bg-amber-500/10 text-amber-400',
    'on-track': 'bg-emerald-500/10 text-emerald-400',
    'paid': 'bg-emerald-500/10 text-emerald-400',
    'planning': 'bg-purple-500/10 text-purple-400',
  }

  const dialogEntityContext = inject<DialogEntityContext | null>(DIALOG_ENTITY_CONTEXT_KEY, null)

  function handleRowClick(item: Entity) {
    const dialogStack = useDialogStack()

    if (dialogStack.size.value === 0 && dialogEntityContext) {
      dialogStack.setOriginTitle(dialogEntityContext.title, dialogEntityContext.id)
    }

    dialogStack.push(item.id, item.type as EntityType, item)
  }

  function handleDelete() {
    props.deleteNode()
  }

  function navigateToType() {
    navigateTo(`/workspace/browse/${entityType.value}`)
  }
</script>

<template>
  <NodeViewWrapper class="query-view-wrapper" data-type="query-view" contenteditable="false">
    <div class="query-view-block" :class="{ 'query-view-block--selected': selected }">
      <!-- Header -->
      <div class="query-view-header">
        <div class="query-view-header-left">
          <Icon :name="typeConfig.icon" class="h-4 w-4" :style="{ color: `var(--color-${typeConfig.color}-500, hsl(var(--muted-foreground)))` }" />
          <span class="query-view-title">{{ displayTitle }}</span>
          <span class="query-view-count">{{ totalCount }}</span>
        </div>
        <div class="query-view-header-right">
          <button
            type="button"
            class="query-view-link"
            title="Open in Database"
            @click.stop="navigateToType">
            <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
          </button>
          <button
            v-if="editor?.isEditable"
            type="button"
            class="query-view-delete"
            title="Remove"
            @click.stop="handleDelete">
            <Icon name="lucide:x" class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- Table -->
      <div v-if="filteredItems.length" class="query-view-table">
        <div class="query-view-table-header">
          <div
            v-for="col in columns"
            :key="col.key"
            class="query-view-th"
            :class="col.key === 'title' ? 'query-view-th--title' : 'query-view-th--meta'">
            {{ col.label }}
          </div>
        </div>
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="query-view-row"
          @click.stop="handleRowClick(item)">
          <div
            v-for="col in columns"
            :key="col.key"
            class="query-view-td"
            :class="col.key === 'title' ? 'query-view-td--title' : 'query-view-td--meta'">
            <template v-if="col.key === 'status'">
              <span
                v-if="getCellValue(item, col)"
                class="query-view-status"
                :class="statusColors[getCellValue(item, col)] || 'bg-muted text-muted-foreground'">
                {{ getCellValue(item, col) }}
              </span>
            </template>
            <template v-else>
              {{ getCellValue(item, col) }}
            </template>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="query-view-empty">
        <Icon name="lucide:inbox" class="h-5 w-5 opacity-30" />
        <span>No {{ typeConfig.label.toLowerCase() }}s found</span>
      </div>

      <!-- Footer -->
      <div v-if="totalCount > maxRows" class="query-view-footer">
        <button type="button" class="query-view-show-all" @click.stop="navigateToType">
          View all {{ totalCount }} {{ typeConfig.label.toLowerCase() }}s
          <Icon name="lucide:arrow-right" class="h-3 w-3" />
        </button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style>
  .query-view-wrapper {
    margin: 0.75rem 0;
  }

  .query-view-block {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    overflow: hidden;
    transition: border-color 150ms;
  }

  .query-view-block--selected {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15);
  }

  .query-view-header {
    align-items: center;
    border-bottom: 1px solid hsl(var(--border));
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
  }

  .query-view-header-left {
    align-items: center;
    display: flex;
    gap: 0.5rem;
  }

  .query-view-header-right {
    align-items: center;
    display: flex;
    gap: 0.25rem;
  }

  .query-view-title {
    color: hsl(var(--foreground));
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .query-view-count {
    background: hsl(var(--muted));
    border-radius: 9999px;
    color: hsl(var(--muted-foreground));
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.1rem 0.4rem;
  }

  .query-view-link,
  .query-view-delete {
    align-items: center;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    display: flex;
    height: 1.5rem;
    justify-content: center;
    opacity: 0;
    padding: 0;
    transition: opacity 150ms, color 150ms;
    width: 1.5rem;
  }

  .query-view-block:hover .query-view-link,
  .query-view-block:hover .query-view-delete {
    opacity: 1;
  }

  .query-view-link:hover {
    color: hsl(var(--primary));
  }

  .query-view-delete:hover {
    color: hsl(var(--destructive));
  }

  /* Table */
  .query-view-table {
    font-size: 0.75rem;
  }

  .query-view-table-header {
    background: hsl(var(--muted) / 0.5);
    border-bottom: 1px solid hsl(var(--border));
    display: flex;
  }

  .query-view-th {
    color: hsl(var(--muted-foreground));
    font-size: 0.6875rem;
    font-weight: 600;
    padding: 0.375rem 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .query-view-th--title {
    flex: 1;
    min-width: 0;
  }

  .query-view-th--meta {
    flex-shrink: 0;
    width: 6rem;
    text-align: right;
  }

  .query-view-row {
    border-bottom: 1px solid hsl(var(--border) / 0.5);
    cursor: pointer;
    display: flex;
    transition: background 100ms;
  }

  .query-view-row:last-child {
    border-bottom: none;
  }

  .query-view-row:hover {
    background: hsl(var(--accent));
  }

  .query-view-td {
    color: hsl(var(--foreground));
    overflow: hidden;
    padding: 0.375rem 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .query-view-td--title {
    flex: 1;
    font-weight: 500;
    min-width: 0;
  }

  .query-view-td--meta {
    color: hsl(var(--muted-foreground));
    flex-shrink: 0;
    text-align: right;
    width: 6rem;
  }

  .query-view-status {
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.1rem 0.4rem;
  }

  .query-view-empty {
    align-items: center;
    color: hsl(var(--muted-foreground));
    display: flex;
    font-size: 0.75rem;
    gap: 0.5rem;
    justify-content: center;
    padding: 1.5rem;
  }

  .query-view-footer {
    border-top: 1px solid hsl(var(--border));
    padding: 0.375rem 0.75rem;
  }

  .query-view-show-all {
    align-items: center;
    background: transparent;
    border: none;
    color: hsl(var(--primary));
    cursor: pointer;
    display: flex;
    font-size: 0.6875rem;
    font-weight: 500;
    gap: 0.25rem;
    padding: 0;
    transition: opacity 150ms;
  }

  .query-view-show-all:hover {
    opacity: 0.8;
  }
</style>
