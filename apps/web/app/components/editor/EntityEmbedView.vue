<script lang="ts" setup>
  import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import type { EntityType, Entity } from '~/types/entity'
  import { DIALOG_ENTITY_CONTEXT_KEY, type DialogEntityContext } from '~/composables/useDialogStack'

  const props = defineProps(nodeViewProps)

  const entityId = computed(() => props.node.attrs.entityId)
  const entityType = computed(() => props.node.attrs.entityType || 'note')
  const fallbackTitle = computed(() => props.node.attrs.title || 'Untitled')

  const { items } = useEntities()
  const entity = computed(() => items.value?.find((i) => i.id === entityId.value))
  const title = computed(() => entity.value?.title || fallbackTitle.value)
  const description = computed(() => entity.value?.description || '')

  const dialogEntityContext = inject<DialogEntityContext | null>(DIALOG_ENTITY_CONTEXT_KEY, null)

  const typeConfig = computed(() => {
    try {
      return getEntityTypeConfig(entityType.value as EntityType)
    }
    catch {
      return { icon: 'lucide:file', color: 'gray', label: entityType.value }
    }
  })

  const statusDisplay = computed(() => {
    const e = entity.value as any
    if (!e) return null
    return e.taskStatus || e.status || e.tripStatus || e.paymentStatus || null
  })

  const priorityDisplay = computed(() => {
    const e = entity.value as any
    if (!e) return null
    return e.priority || null
  })

  const dateDisplay = computed(() => {
    const e = entity.value as any
    if (!e?.startDate) return null
    try {
      return new Date(e.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    }
    catch {
      return e.startDate
    }
  })

  const priorityColors: Record<string, string> = {
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-blue-500',
  }

  const statusColors: Record<string, string> = {
    'pending': 'bg-gray-500/10 text-gray-400',
    'in-progress': 'bg-blue-500/10 text-blue-400',
    'completed': 'bg-emerald-500/10 text-emerald-400',
    'active': 'bg-emerald-500/10 text-emerald-400',
    'cancelled': 'bg-red-500/10 text-red-400',
    'on-hold': 'bg-amber-500/10 text-amber-400',
    'draft': 'bg-gray-500/10 text-gray-400',
  }

  function handleClick() {
    const targetItem = entity.value
    if (!targetItem) return

    const dialogStack = useDialogStack()

    const existingIndex = dialogStack.stack.value.findIndex((entry) => entry.entityId === entityId.value)
    if (existingIndex >= 0) {
      const popCount = dialogStack.stack.value.length - 1 - existingIndex
      for (let i = 0; i < popCount; i++) dialogStack.pop()
      return
    }

    if (dialogStack.size.value > 0 && entityId.value === dialogStack.originEntityId.value) {
      dialogStack.clear()
      return
    }

    if (dialogStack.size.value === 0 && dialogEntityContext) {
      dialogStack.setOriginTitle(dialogEntityContext.title, dialogEntityContext.id)
    }

    dialogStack.push(entityId.value, entityType.value as EntityType, targetItem as Entity)
  }

  function handleDelete() {
    props.deleteNode()
  }
</script>

<template>
  <NodeViewWrapper class="entity-embed-wrapper" data-type="entity-embed" contenteditable="false">
    <div
      class="entity-embed-card"
      :class="{ 'entity-embed-card--selected': selected }"
      @click.stop="handleClick">
      <!-- Type icon -->
      <div class="entity-embed-icon" :style="{ color: `var(--color-${typeConfig.color}-500, hsl(var(--muted-foreground)))` }">
        <Icon :name="typeConfig.icon" class="h-5 w-5" />
      </div>

      <!-- Content -->
      <div class="entity-embed-body">
        <div class="entity-embed-header">
          <span class="entity-embed-title">{{ title }}</span>
          <span class="entity-embed-type-badge">{{ typeConfig.label }}</span>
        </div>

        <p v-if="description" class="entity-embed-description">
          {{ description }}
        </p>

        <!-- Meta row -->
        <div v-if="statusDisplay || priorityDisplay || dateDisplay" class="entity-embed-meta">
          <span
            v-if="statusDisplay"
            class="entity-embed-status"
            :class="statusColors[statusDisplay] || 'bg-muted text-muted-foreground'">
            {{ statusDisplay }}
          </span>
          <span
            v-if="priorityDisplay"
            class="entity-embed-priority"
            :class="priorityColors[priorityDisplay] || 'text-muted-foreground'">
            {{ priorityDisplay }}
          </span>
          <span v-if="dateDisplay" class="entity-embed-date">
            <Icon name="lucide:calendar-days" class="h-3 w-3 opacity-50" />
            {{ dateDisplay }}
          </span>
        </div>
      </div>

      <!-- Delete button -->
      <button
        v-if="editor?.isEditable"
        type="button"
        class="entity-embed-delete"
        title="Remove embed"
        @click.stop="handleDelete">
        <Icon name="lucide:x" class="h-3.5 w-3.5" />
      </button>
    </div>
  </NodeViewWrapper>
</template>

<style>
  .entity-embed-wrapper {
    margin: 0.75rem 0;
  }

  .entity-embed-card {
    align-items: flex-start;
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    cursor: pointer;
    display: flex;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    position: relative;
    transition: border-color 150ms, box-shadow 150ms;
  }

  .entity-embed-card:hover {
    border-color: hsl(var(--primary) / 0.4);
    box-shadow: 0 1px 4px hsl(var(--primary) / 0.08);
  }

  .entity-embed-card--selected {
    border-color: hsl(var(--primary));
    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.15);
  }

  .entity-embed-icon {
    align-items: center;
    background: hsl(var(--muted));
    border-radius: 0.375rem;
    display: flex;
    flex-shrink: 0;
    height: 2.25rem;
    justify-content: center;
    width: 2.25rem;
  }

  .entity-embed-body {
    flex: 1;
    min-width: 0;
  }

  .entity-embed-header {
    align-items: center;
    display: flex;
    gap: 0.5rem;
  }

  .entity-embed-title {
    color: hsl(var(--foreground));
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entity-embed-type-badge {
    background: hsl(var(--muted));
    border-radius: 9999px;
    color: hsl(var(--muted-foreground));
    flex-shrink: 0;
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.1rem 0.4rem;
    text-transform: capitalize;
  }

  .entity-embed-description {
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    color: hsl(var(--muted-foreground));
    display: -webkit-box;
    font-size: 0.75rem;
    line-height: 1.4;
    margin: 0.25rem 0 0;
    overflow: hidden;
  }

  .entity-embed-meta {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    margin-top: 0.375rem;
  }

  .entity-embed-status {
    border-radius: 9999px;
    font-size: 0.625rem;
    font-weight: 500;
    padding: 0.1rem 0.4rem;
  }

  .entity-embed-priority {
    font-size: 0.6875rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .entity-embed-date {
    align-items: center;
    color: hsl(var(--muted-foreground));
    display: flex;
    font-size: 0.6875rem;
    gap: 0.25rem;
  }

  .entity-embed-delete {
    align-items: center;
    background: transparent;
    border: none;
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    height: 1.5rem;
    justify-content: center;
    opacity: 0;
    padding: 0;
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
    transition: opacity 150ms, color 150ms;
    width: 1.5rem;
  }

  .entity-embed-card:hover .entity-embed-delete {
    opacity: 1;
  }

  .entity-embed-delete:hover {
    color: hsl(var(--destructive));
  }
</style>
