<script lang="ts" setup>
  import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
  import type { Entity, EntityType } from '~/types/entity'
  import { DIALOG_ENTITY_CONTEXT_KEY, type DialogEntityContext } from '~/composables/useDialogStack'

  const props = defineProps(nodeViewProps)

  const entityId = computed(() => props.node.attrs.id)
  const label = computed(() => props.node.attrs.label || 'Untitled')
  const entityType = computed(() => props.node.attrs.entityType || 'note')

  // Look up the entity from the reactive store for click-to-navigate
  const { items } = useEntities()
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

    dialogStack.push(entityId.value, entityType.value as EntityType, targetItem as Entity)
  }
</script>

<template>
  <NodeViewWrapper as="span" class="mention-chip-wrapper">
    <EntityPreviewPopover
      :entity-id="entityId"
      :entity-type="entityType"
      side="top"
      align="center">
      <template #trigger>
        <span class="mention-chip" contenteditable="false" @click.stop="handleClick">
          <Icon name="lucide:link" class="mention-chip-icon" />
          <span>{{ label }}</span>
        </span>
      </template>
    </EntityPreviewPopover>
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
