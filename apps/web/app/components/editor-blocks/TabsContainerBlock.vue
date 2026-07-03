<script lang="ts" setup>
  import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

  const props = defineProps(nodeViewProps)

  interface TabHeader {
    label: string
    icon: string
    active: boolean
    index: number
  }

  const tabs = computed<TabHeader[]>(() => {
    const children = props.node.content.content as any[]
    return children.map((child, i) => ({
      label: (child.attrs?.label as string) || `Tab ${i + 1}`,
      icon: (child.attrs?.icon as string) || '',
      active: !!(child.attrs?.active as boolean),
      index: i,
    }))
  })

  const _activeIndex = computed(() => tabs.value.findIndex((t) => t.active))

  // ── Rename mode ──────────────────────────────────────────────────
  const renamingIndex = ref(-1)
  const labelInputRefs = ref<HTMLInputElement[]>([])

  function startRename(index: number, event: MouseEvent) {
    event.stopPropagation()
    renamingIndex.value = index
    nextTick(() => {
      const el = labelInputRefs.value[index]
      if (el) { el.readOnly = false; el.focus(); el.select() }
    })
  }

  function finishRename() {
    renamingIndex.value = -1
  }

  function activateTab(index: number) {
    const containerPos = (typeof props.getPos === 'function' ? props.getPos() : 0) ?? 0
    const { tr } = props.editor.state
    let offset = containerPos + 1
    props.node.content.forEach((child: any, _nodeOffset: number, i: number) => {
      tr.setNodeMarkup(offset, undefined, {
        ...child.attrs,
        active: i === index,
      })
      offset += child.nodeSize
    })
    props.editor.view.dispatch(tr)
  }

  function addTab() {
    const containerPos = (typeof props.getPos === 'function' ? props.getPos() : 0) ?? 0
    const insertPos = containerPos + props.node.nodeSize - 1
    const schema = props.editor.schema
    const newTabNode = schema.nodes.tabItem?.createAndFill(
      { label: `Tab ${tabs.value.length + 1}`, icon: '', active: false },
      schema.nodes.paragraph?.create(),
    )
    if (!newTabNode) return
    const { tr } = props.editor.state
    tr.insert(insertPos, newTabNode)
    props.editor.view.dispatch(tr)
  }

  function removeTab(index: number) {
    if (tabs.value.length <= 1) return
    const containerPos = (typeof props.getPos === 'function' ? props.getPos() : 0) ?? 0

    const childSlots: Array<{ from: number; to: number; node: any }> = []
    let offset = containerPos + 1
    props.node.content.forEach((child: any) => {
      childSlots.push({ from: offset, to: offset + child.nodeSize, node: child })
      offset += child.nodeSize
    })

    const target = childSlots[index]
    if (!target) return

    const wasActive = !!target.node.attrs.active
    const deleteSize = target.to - target.from
    const { tr } = props.editor.state

    tr.delete(target.from, target.to)

    if (wasActive) {
      const remaining = childSlots.filter((_, i) => i !== index)
      const newActiveSlot = remaining[index > 0 ? index - 1 : 0] ?? remaining[0]
      if (newActiveSlot) {
        const adjustedPos =
          newActiveSlot.from > target.from
            ? newActiveSlot.from - deleteSize
            : newActiveSlot.from
        tr.setNodeMarkup(adjustedPos, undefined, { ...newActiveSlot.node.attrs, active: true })
      }
    }

    props.editor.view.dispatch(tr)
  }

  function handleLabelKeydown(event: KeyboardEvent, _index: number) {
    if (event.key === 'Enter') {
      event.preventDefault()
      finishRename()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      finishRename()
    }
  }

  function handleLabelInput(event: Event, index: number) {
    if (renamingIndex.value !== index) return
    const input = event.target as HTMLInputElement
    const containerPos = typeof props.getPos === 'function' ? props.getPos() : 0
    const { tr } = props.editor.state
    let offset = (containerPos ?? 0) + 1
    props.node.content.forEach((child: any, _nodeOffset: number, i: number) => {
      if (i === index) {
        tr.setNodeMarkup(offset, undefined, {
          ...child.attrs,
          label: input.value,
        })
      }
      offset += child.nodeSize
    })
    props.editor.view.dispatch(tr)
  }
</script>

<template>
  <NodeViewWrapper class="tabs-container" data-type="tabs-container">
    <!-- Tab header bar -->
    <div class="tabs-header" contenteditable="false">
      <div class="tabs-list">
        <div
          v-for="tab in tabs"
          :key="tab.index"
          class="tab-header-item"
          :class="{ 'is-active': tab.active, 'is-renaming': renamingIndex === tab.index }"
          @click.stop="activateTab(tab.index)">
          <Icon v-if="tab.icon" :name="tab.icon" class="h-3.5 w-3.5 shrink-0 opacity-70" />
          <input
            :ref="(el) => { if (el) labelInputRefs[tab.index] = el as HTMLInputElement }"
            class="tab-label-input"
            :readonly="renamingIndex !== tab.index"
            :value="tab.label"
            @click.stop
            @keydown="handleLabelKeydown($event, tab.index)"
            @input="handleLabelInput($event, tab.index)"
            @blur="finishRename" />
          <!-- Pencil rename button -->
          <button
            type="button"
            class="tab-rename-btn"
            :title="`Rename ${tab.label}`"
            @click.stop="startRename(tab.index, $event)">
            <Icon name="lucide:pencil-line" class="h-3 w-3" />
          </button>
          <button
            v-if="tabs.length > 1"
            type="button"
            class="tab-close-btn"
            :title="`Remove ${tab.label}`"
            @click.stop="removeTab(tab.index)">
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </div>
      </div>
      <button type="button" class="tabs-add-btn" title="Add tab" @click.stop="addTab">
        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- All tab content rendered by TipTap, individual TabItemBlock controls visibility -->
    <div class="tabs-body">
      <NodeViewContent />
    </div>
  </NodeViewWrapper>
</template>

<style>
  .tabs-container {
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    margin: 0 0 0.75rem;
  }

  .tabs-header {
    align-items: center;
    -webkit-backdrop-filter: blur(20px) saturate(1.4);
    backdrop-filter: blur(20px) saturate(1.4);
    background: var(--card);
    border-bottom: 1px solid var(--border);
    border-radius: 0.5rem 0.5rem 0 0;
    display: flex;
    gap: 0;
    overflow-x: auto;
    position: sticky;
    scrollbar-width: none;
    top: 0;
    z-index: 20;
  }

  .tabs-header::-webkit-scrollbar {
    display: none;
  }

  .tabs-list {
    display: flex;
    flex: 1;
    min-width: 0;
  }

  .tab-header-item {
    align-items: center;
    border-bottom: 2px solid transparent;
    border-right: 1px solid var(--border);
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    font-size: 0.8125rem;
    gap: 0.375rem;
    min-width: 0;
    padding: 0.5rem 0.75rem;
    transition: background 120ms, color 120ms;
    user-select: none;
  }

  .tab-header-item:hover {
    background: hsl(var(--muted) / 0.6);
    color: hsl(var(--foreground));
  }

  .tab-header-item.is-active {
    background: hsl(var(--background));
    border-bottom-color: var(--primary);
    color: hsl(var(--foreground));
    font-weight: 500;
  }

  .tab-label-input {
    background: none;
    border: none;
    color: inherit;
    cursor: default;
    font-size: inherit;
    font-weight: inherit;
    max-width: 12rem;
    min-width: 2rem;
    outline: none;
    padding: 0;
    pointer-events: none;
    width: auto;
  }

  .tab-header-item.is-renaming .tab-label-input {
    cursor: text;
    pointer-events: auto;
  }

  .tab-rename-btn,
  .tab-close-btn {
    align-items: center;
    background: none;
    border: none;
    border-radius: 0.25rem;
    color: inherit;
    cursor: pointer;
    display: flex;
    justify-content: center;
    opacity: 0;
    padding: 1px;
    transition: opacity 120ms, background 120ms;
  }

  .tab-header-item:hover .tab-rename-btn,
  .tab-header-item.is-active .tab-rename-btn {
    opacity: 0.4;
  }

  .tab-rename-btn:hover {
    background: hsl(var(--muted) / 0.8);
    opacity: 0.9 !important;
  }

  .tab-header-item.is-renaming .tab-rename-btn {
    opacity: 0.9;
    background: hsl(var(--primary) / 0.12);
    color: hsl(var(--primary));
  }

  .tab-header-item:hover .tab-close-btn,
  .tab-header-item.is-active .tab-close-btn {
    opacity: 0.6;
  }

  .tab-close-btn:hover {
    background: hsl(var(--destructive) / 0.15);
    color: hsl(var(--destructive));
    opacity: 1 !important;
  }

  .tabs-add-btn {
    align-items: center;
    background: none;
    border: none;
    color: hsl(var(--muted-foreground));
    cursor: pointer;
    display: flex;
    flex-shrink: 0;
    justify-content: center;
    padding: 0.5rem 0.625rem;
    transition: color 120ms, background 120ms;
  }

  .tabs-add-btn:hover {
    background: hsl(var(--muted) / 0.6);
    color: hsl(var(--foreground));
  }

  .tabs-body {
    border-radius: 0 0 0.5rem 0.5rem;
    padding: 1rem;
  }
</style>
