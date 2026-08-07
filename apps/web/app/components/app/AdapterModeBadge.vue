<script lang="ts" setup>
import type { IconRailPosition } from '~/composables/useLayoutPreferences'

const props = withDefaults(
  defineProps<{
    railPosition?: IconRailPosition
  }>(),
  { railPosition: 'bottom' },
)

const { mode: adapterMode, entityBackend, ontologyBackend, isCloud } = useAdapterStatus()

const isBottom = computed(() => props.railPosition === 'bottom')
const rootLabel = computed(() => (isCloud.value ? 'Cloud' : 'Local'))
const rootIcon = computed(() => (isCloud.value ? 'lucide:cloud' : 'lucide:hard-drive'))
const ariaLabel = computed(() => `Data mode: ${rootLabel.value}`)
</script>

<template>
  <UiTooltip>
    <UiTooltipTrigger as-child>
      <!-- <button
        type="button"
        class="rail-resident-btn inline-flex items-center justify-center gap-1 rounded-full border transition-colors"
        :class="
          isCloud
            ? 'border-border/50 text-muted-foreground hover:bg-muted/40'
            : 'border-emerald-500/30 text-emerald-500/90 hover:bg-emerald-500/10'
        "
        :aria-label="ariaLabel">
        <Icon :name="rootIcon" class="h-3.5 w-3.5 shrink-0" />
        <span v-if="isBottom" class="text-[10px] font-medium pr-0.5 max-w-[4.5rem] truncate">{{ rootLabel }}</span>
      </button> -->
    </UiTooltipTrigger>
    <UiTooltipContent :side="isBottom ? 'top' : 'right'" :side-offset="8" class="max-w-xs">
      <div class="space-y-1 text-xs">
        <div class="font-medium">Runtime: {{ rootLabel }}</div>
        <div class="text-muted-foreground">Your graph lives here first.</div>
        <div class="text-muted-foreground">Adapter: {{ adapterMode }}</div>
        <div class="text-muted-foreground">Entities: {{ entityBackend }}</div>
        <div class="text-muted-foreground">Ontologies: {{ ontologyBackend }}</div>
      </div>
    </UiTooltipContent>
  </UiTooltip>
</template>
