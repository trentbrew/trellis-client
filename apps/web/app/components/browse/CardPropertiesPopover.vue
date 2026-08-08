<script setup lang="ts">
import type { ViewFieldDefinition } from '~/lib/view-field-catalog'

const props = defineProps<{
  fields: ViewFieldDefinition[]
  visible: string[]
  showEmpty: boolean
  hiddenCount: number
}>()

const emit = defineEmits<{
  'update:visible': [key: string, on: boolean]
  move: [key: string, direction: -1 | 1]
  'update:showEmpty': [on: boolean]
  reset: []
}>()

const open = ref(false)

function isChecked(key: string) {
  return props.visible.includes(key)
}

function canMoveUp(key: string) {
  return isChecked(key) && props.visible.indexOf(key) > 0
}

function canMoveDown(key: string) {
  const idx = props.visible.indexOf(key)
  return isChecked(key) && idx >= 0 && idx < props.visible.length - 1
}

function showCustomFieldsHeader(index: number) {
  if (index === 0) return props.fields[0]?.source === 'ontology'
  const prev = props.fields[index - 1]
  const cur = props.fields[index]
  return prev?.source === 'builtin' && cur?.source === 'ontology'
}

const hasCustomProperties = computed(() => props.hiddenCount > 0 || props.showEmpty)
</script>

<template>
  <UiPopover v-model:open="open">
    <UiPopoverTrigger as-child>
      <UiButton
        variant="outline"
        size="sm"
        class="h-8 bg-card/0 backdrop-blur-lg text-xs shrink-0"
        :class="[hasCustomProperties ? 'gap-1.5 border-primary/40' : 'px-2']"
        aria-label="Card properties"
        :title="hasCustomProperties ? undefined : 'Card properties'">
        <Icon name="lucide:sliders-horizontal" class="h-3.5 w-3.5" />
        <span v-if="hasCustomProperties" class="hidden sm:inline">Properties</span>
        <span
          v-if="hiddenCount > 0"
          class="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] text-primary-foreground">
          {{ hiddenCount }}
        </span>
      </UiButton>
    </UiPopoverTrigger>
    <UiPopoverContent align="end" class="w-64 p-0" aria-label="Card properties">
      <div class="border-b border-border px-3 py-2">
        <p class="text-xs font-medium text-foreground">Shown in cards</p>
        <p class="text-[10px] text-muted-foreground mt-0.5">Title is always visible.</p>
      </div>

      <div class="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
        <template v-for="(option, index) in fields" :key="option.key">
          <p
            v-if="showCustomFieldsHeader(index)"
            class="px-2 pt-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
            Custom fields
          </p>
          <div class="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted/60">
            <label class="flex flex-1 cursor-pointer items-center gap-2 px-1 py-1 text-xs">
              <UiCheckbox
                :model-value="isChecked(option.key)"
                @update:model-value="(on: boolean | 'indeterminate') => emit('update:visible', option.key, on === true)" />
              <span>{{ option.label }}</span>
            </label>
            <div class="flex shrink-0 items-center">
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                :disabled="!canMoveUp(option.key)"
                aria-label="Move up"
                @click="emit('move', option.key, -1)">
                <Icon name="lucide:chevron-up" class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                class="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                :disabled="!canMoveDown(option.key)"
                aria-label="Move down"
                @click="emit('move', option.key, 1)">
                <Icon name="lucide:chevron-down" class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="border-t border-border px-3 py-2 space-y-2">
        <label class="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <UiCheckbox :model-value="showEmpty" @update:model-value="(on: boolean | 'indeterminate') => emit('update:showEmpty', on === true)" />
          Show empty properties
        </label>
        <button
          type="button"
          class="text-[10px] text-muted-foreground hover:text-foreground"
          @click="emit('reset')">
          Reset to defaults
        </button>
      </div>
    </UiPopoverContent>
  </UiPopover>
</template>
