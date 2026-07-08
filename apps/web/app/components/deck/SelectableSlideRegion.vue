<script setup lang="ts">
  import type { DeckObjectKind } from '~/types/deck'

  const props = withDefaults(
    defineProps<{
      objectId: DeckObjectKind
      selected: boolean
      readOnly?: boolean
      label: string
    }>(),
    { readOnly: false },
  )

  const emit = defineEmits<{
    select: [objectId: DeckObjectKind]
    activate: [objectId: DeckObjectKind]
  }>()

  function selectRegion() {
    if (props.readOnly) return
    emit('select', props.objectId)
  }

  function onKeydown(event: KeyboardEvent) {
    if (props.readOnly) return
    const target = event.target as HTMLElement | null
    if (target?.closest?.('.ProseMirror')) return
    if (event.key === 'Enter') {
      event.preventDefault()
      emit('select', props.objectId)
      emit('activate', props.objectId)
    }
  }
</script>

<template>
  <div
    class="selectable-slide-region relative rounded-md border border-transparent outline-none transition-[border-color,box-shadow]"
    :class="[
      !readOnly ? 'cursor-pointer hover:border-violet-400/50 focus-visible:border-violet-400/70 focus-visible:ring-2 focus-visible:ring-violet-500/30' : '',
      selected && !readOnly ? 'border-violet-300 shadow-[0_0_0_1px_rgba(167,139,250,1),0_0_0_6px_rgba(167,139,250,0.13)]' : '',
    ]"
    :role="readOnly ? undefined : 'button'"
    :tabindex="readOnly ? -1 : 0"
    :aria-label="label"
    :aria-pressed="readOnly ? undefined : selected"
    @click.stop="selectRegion"
    @keydown="onKeydown"
  >
    <slot />
    <template v-if="selected && !readOnly">
      <span class="pointer-events-none absolute -left-1 -top-1 size-2 rounded-full border border-background bg-violet-300" aria-hidden="true" />
      <span class="pointer-events-none absolute -right-1 -top-1 size-2 rounded-full border border-background bg-violet-300" aria-hidden="true" />
      <span class="pointer-events-none absolute -bottom-1 -right-1 size-2 rounded-full border border-background bg-violet-300" aria-hidden="true" />
      <span class="pointer-events-none absolute -bottom-1 -left-1 size-2 rounded-full border border-background bg-violet-300" aria-hidden="true" />
    </template>
  </div>
</template>
