<script setup lang="ts">
import type { BrowseViewMode } from '~/composables/useBrowse'
import type { ProjectionOption } from '~/composables/useProjectionOptions'

const props = withDefaults(
  defineProps<{
    modelValue: BrowseViewMode
    options: ProjectionOption[]
    orientation?: 'horizontal' | 'vertical'
  }>(),
  { orientation: 'horizontal' },
)

const emit = defineEmits<{
  'update:modelValue': [mode: BrowseViewMode]
}>()

const activeOption = computed(() =>
  props.options.find((option) => option.mode === props.modelValue),
)

const statusText = computed(() => {
  if (!activeOption.value) return 'Projection layout ready'
  return `${activeOption.value.label} projection selected`
})

function selectOption(option: ProjectionOption) {
  if (option.disabled) return
  emit('update:modelValue', option.mode)
}
</script>

<template>
  <nav
    aria-label="Projection layouts"
    class="rounded-xl border border-border/60 bg-card/40 p-1.5 shadow-sm"
    :class="orientation === 'vertical' ? 'flex flex-col gap-1' : 'flex flex-wrap items-center gap-1'">
    <button
      v-for="option in options"
      :key="`${option.projectionType}:${option.mode}`"
      type="button"
      class="inline-flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45"
      :class="[
        modelValue === option.mode
          ? 'bg-foreground/10 text-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
      ]"
      :disabled="option.disabled"
      :aria-pressed="modelValue === option.mode"
      :aria-label="`${option.label} projection`"
      :title="option.reason || `${option.label} projection`"
      @click="selectOption(option)">
      <Icon :name="option.icon" class="h-3.5 w-3.5 shrink-0" />
      <span>{{ option.label }}</span>
      <Icon
        v-if="option.disabled"
        name="lucide:lock"
        class="h-3 w-3 shrink-0 text-muted-foreground/70" />
    </button>
    <span class="sr-only" aria-live="polite">{{ statusText }}</span>
  </nav>
</template>
