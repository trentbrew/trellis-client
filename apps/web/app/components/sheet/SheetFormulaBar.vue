<script setup lang="ts">
  const props = defineProps<{
    cellRef: string
    formula: string
    readonly?: boolean
    refMode: 'a1' | 'attrs'
  }>()

  const emit = defineEmits<{
    'update:refMode': [mode: 'a1' | 'attrs']
  }>()

  const isFormula = computed(() => props.formula.startsWith('=') || props.readonly)
</script>

<template>
  <div
    class="flex h-9 items-center gap-2.5 border-b border-border bg-muted/20 px-3 font-data text-xs"
    role="toolbar"
    aria-label="Formula bar"
  >
    <span
      class="min-w-[3.25rem] rounded-md border border-border bg-muted/40 px-2 py-0.5 text-center font-medium text-muted-foreground"
    >
      {{ cellRef }}
    </span>
    <span class="italic text-muted-foreground/60">fx</span>
    <div
      class="min-w-0 flex-1 truncate"
      :class="isFormula ? 'text-warning' : 'text-muted-foreground'"
    >
      {{ formula || '—' }}
    </div>
    <div
      class="flex shrink-0 overflow-hidden rounded-md border border-border text-[10px]"
      role="group"
      aria-label="Formula reference rendering"
    >
      <button
        type="button"
        class="px-2.5 py-1 transition-colors"
        :class="
          refMode === 'a1'
            ? 'bg-[color-mix(in_oklch,var(--zone-workshop)_18%,var(--muted))] text-foreground'
            : 'text-muted-foreground hover:bg-muted/50'
        "
        :aria-pressed="refMode === 'a1'"
        @click="emit('update:refMode', 'a1')"
      >
        A1
      </button>
      <button
        type="button"
        class="px-2.5 py-1 transition-colors"
        :class="
          refMode === 'attrs'
            ? 'bg-[color-mix(in_oklch,var(--zone-workshop)_18%,var(--muted))] text-foreground'
            : 'text-muted-foreground hover:bg-muted/50'
        "
        :aria-pressed="refMode === 'attrs'"
        @click="emit('update:refMode', 'attrs')"
      >
        attrs
      </button>
    </div>
  </div>
</template>
