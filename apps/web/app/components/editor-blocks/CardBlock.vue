<script lang="ts" setup>
  import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

  const props = defineProps(nodeViewProps)

  const titleValue = computed(() => (props.node.attrs.title as string) || '')
  const hasTitle = computed(() => !!titleValue.value)
  const isEditingTitle = ref(false)
  const titleInputRef = ref<HTMLInputElement | null>(null)

  function startEditTitle(event: MouseEvent) {
    event.stopPropagation()
    isEditingTitle.value = true
    nextTick(() => titleInputRef.value?.focus())
  }

  function commitTitle(event: Event) {
    const val = (event.target as HTMLInputElement).value
    props.updateAttributes({ title: val })
    isEditingTitle.value = false
  }

  function onTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault()
      const val = (event.target as HTMLInputElement).value
      props.updateAttributes({ title: val })
      isEditingTitle.value = false
    }
  }
</script>

<template>
  <NodeViewWrapper class="card-block" data-type="card">
    <!-- Card header -->
    <div class="card-header" contenteditable="false">
      <template v-if="isEditingTitle">
        <input
          ref="titleInputRef"
          class="card-title-input"
          :value="titleValue"
          placeholder="Card title…"
          @blur="commitTitle"
          @keydown="onTitleKeydown"
          @click.stop />
      </template>
      <template v-else>
        <span
          v-if="hasTitle"
          class="card-title-text"
          @click.stop="startEditTitle">
          {{ titleValue }}
        </span>
        <button
          v-else
          type="button"
          class="card-title-placeholder"
          @click.stop="startEditTitle">
          Add title…
        </button>
      </template>

      <span class="card-badge">Card</span>
    </div>

    <!-- Card content -->
    <NodeViewContent class="card-content" />
  </NodeViewWrapper>
</template>

<style>
  .card-block {
    background: hsl(var(--card));
    border: 1px solid hsl(var(--border));
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px hsl(var(--foreground) / 0.04);
    margin: 0.75rem 0;
    overflow: hidden;
  }

  .card-header {
    align-items: center;
    background: hsl(var(--muted) / 0.3);
    border-bottom: 1px solid hsl(var(--border) / 0.6);
    display: flex;
    gap: 0.5rem;
    min-height: 2rem;
    padding: 0.375rem 0.875rem;
  }

  .card-title-text {
    color: hsl(var(--foreground));
    cursor: text;
    flex: 1;
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.4;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-title-input {
    background: none;
    border: none;
    color: hsl(var(--foreground));
    flex: 1;
    font-size: 0.8125rem;
    font-weight: 500;
    min-width: 0;
    outline: none;
    padding: 0;
  }

  .card-title-placeholder {
    background: none;
    border: none;
    color: hsl(var(--muted-foreground) / 0.5);
    cursor: text;
    flex: 1;
    font-size: 0.8125rem;
    font-style: italic;
    padding: 0;
    text-align: left;
  }

  .card-badge {
    background: hsl(var(--muted) / 0.6);
    border-radius: 0.25rem;
    color: hsl(var(--muted-foreground) / 0.6);
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 0.125rem 0.375rem;
    text-transform: uppercase;
    user-select: none;
  }

  .card-content {
    padding: 0.875rem 1rem;
  }

  .card-content > *:first-child {
    margin-top: 0;
  }

  .card-content > *:last-child {
    margin-bottom: 0;
  }
</style>
