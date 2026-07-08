<script setup lang="ts">
  import type { SlideDefinition } from '~/types/deck'

  const props = defineProps<{
    slide: SlideDefinition
  }>()

  const emit = defineEmits<{
    save: [html: string]
  }>()

  function stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').trim()
  }

  function toPlain(html: string | undefined): string {
    return stripHtml(html || '')
  }

  const localNotes = ref('')

  watch(
    () => props.slide.entityId,
    () => {
      localNotes.value = toPlain(props.slide.speakerNotes)
    },
    { immediate: true },
  )

  watch(
    () => props.slide.speakerNotes,
    (notes) => {
      const plain = toPlain(notes)
      if (plain !== localNotes.value.trim()) localNotes.value = plain
    },
  )

  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      const wrapped = localNotes.value.trim() ? `<p>${localNotes.value.trim()}</p>` : ''
      emit('save', wrapped)
    }, 400)
  }

  onBeforeUnmount(() => {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
      const wrapped = localNotes.value.trim() ? `<p>${localNotes.value.trim()}</p>` : ''
      emit('save', wrapped)
    }
  })
</script>

<template>
  <div class="shrink-0 border-t border-border bg-muted/10 px-3 py-2">
    <label class="mb-1 block font-mono text-[9px] uppercase tracking-wider text-muted-foreground" :for="`notes-${slide.entityId}`">
      Speaker notes
    </label>
    <textarea
      :id="`notes-${slide.entityId}`"
      v-model="localNotes"
      rows="2"
      placeholder="Notes for this slide…"
      class="w-full resize-none rounded-md border border-border/60 bg-background/80 px-2.5 py-1.5 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
      @input="scheduleSave"
      @blur="scheduleSave" />
  </div>
</template>
