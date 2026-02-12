<script lang="ts" setup>
  import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
  import { getEntityTypeConfig } from '~/config/entityRegistry'
  import type { EntityType } from '~/types/entity'
  import type { CalendarItem } from '~/types/calendarItem'
  import { DIALOG_ENTITY_CONTEXT_KEY, type DialogEntityContext } from '~/composables/useDialogStack'

  const props = defineProps(nodeViewProps)

  const entityId = computed(() => props.node.attrs.id)
  const label = computed(() => props.node.attrs.label || 'Untitled')
  const entityType = computed(() => props.node.attrs.entityType || 'note')

  // Look up the entity from the reactive store for hover preview
  const { items } = useCalendarItems()
  const entity = computed(() => items.value?.find((i) => i.id === entityId.value))

  // Inject dialog entity context for click-to-navigate
  const dialogEntityContext = inject<DialogEntityContext | null>(DIALOG_ENTITY_CONTEXT_KEY, null)

  function handleClick() {
    const targetItem = entity.value
    if (!targetItem) return

    const dialogStack = useDialogStack()

    // If the target is already in the stack, pop back to it
    const existingIndex = dialogStack.stack.value.findIndex((entry) => entry.entityId === entityId.value)
    if (existingIndex >= 0) {
      const popCount = dialogStack.stack.value.length - 1 - existingIndex
      for (let i = 0; i < popCount; i++) dialogStack.pop()
      return
    }

    // If the target is the originating dialog, clear the stack
    if (dialogStack.size.value > 0 && entityId.value === dialogStack.originEntityId.value) {
      dialogStack.clear()
      return
    }

    // Set origin context if this is the first push
    if (dialogStack.size.value === 0 && dialogEntityContext) {
      dialogStack.setOriginTitle(dialogEntityContext.title, dialogEntityContext.id)
    }

    dialogStack.push(entityId.value, entityType.value as EntityType, targetItem as CalendarItem)
  }

  // Type config for icon / color
  const typeConfig = computed(() => {
    try {
      return getEntityTypeConfig(entityType.value as EntityType)
    } catch {
      return { icon: 'lucide:file', color: 'gray', label: entityType.value }
    }
  })

  const typeIcon = computed(() => typeConfig.value.icon)
  const typeLabel = computed(() => typeConfig.value.label)
  const typeColorClass = computed(() => {
    const c = typeConfig.value.color
    return `text-${c}-500`
  })

  // Format date for hover preview
  const formattedDate = computed(() => {
    const d = entity.value?.startDate
    if (!d) return null
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return d
    }
  })

  // Initials for avatar fallback
  const initials = computed(() => {
    return label.value
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('')
  })
</script>

<template>
  <NodeViewWrapper as="span" class="mention-chip-wrapper">
    <UiHoverCard>
      <UiHoverCardTrigger as-child>
        <span class="mention-chip" contenteditable="false" @click.stop="handleClick">
          <Icon name="lucide:link" class="mention-chip-icon" />
          <span>{{ label }}</span>
        </span>
      </UiHoverCardTrigger>
      <UiHoverCardContent class="w-72" side="top" :side-offset="8">
        <div class="flex gap-3">
          <UiAvatar class="h-9 w-9 shrink-0 ring-1 ring-border">
            <UiAvatarFallback :class="typeColorClass" class="text-xs font-medium">
              {{ initials }}
            </UiAvatarFallback>
          </UiAvatar>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-center gap-1.5">
              <h4 class="truncate text-sm font-semibold leading-tight">{{ label }}</h4>
            </div>
            <div class="flex items-center gap-1">
              <Icon :name="typeIcon" class="h-3 w-3 shrink-0 opacity-60" />
              <span class="text-xs text-muted-foreground">{{ typeLabel }}</span>
            </div>
            <p v-if="entity?.description" class="line-clamp-2 text-xs text-muted-foreground leading-relaxed">
              {{ entity.description }}
            </p>
            <div v-if="formattedDate" class="flex items-center">
              <Icon name="lucide:calendar-days" class="h-3 w-3 opacity-50" />
              <span class="text-[10px] text-muted-foreground">{{ formattedDate }}</span>
            </div>
          </div>
        </div>
      </UiHoverCardContent>
    </UiHoverCard>
  </NodeViewWrapper>
</template>

<style>
  .mention-chip-wrapper {
    display: inline;
    padding: 0;
    margin: 0;
    cursor: pointer;
  }

  .mention-chip {
    background: color-mix(in oklch, var(--primary) 20%, transparent);
    color: var(--primary);
    border-radius: 0.25rem;
    padding: 0.1em 0.35em;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    transition: background 150ms;
    white-space: nowrap;
  }

  .mention-chip:hover {
    background: color-mix(in oklch, var(--primary) 30%, transparent);
  }

  .mention-chip::before {
    content: '';
  }

  .mention-chip-icon {
    width: 0.75em;
    height: 0.75em;
    opacity: 0.6;
    vertical-align: -0.1em;
    display: inline;
  }
</style>
