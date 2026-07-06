<script setup lang="ts">
  import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
  import { useSheetProjection } from '~/composables/useSheetProjection'
  import { sheetPathFromEntityId } from '~/lib/sheet-routes'
  import { parseA1Range } from '~/lib/sheet-a1'

  const props = defineProps(nodeViewProps)
  const { wp } = useWorkspacePath()

  const sheetId = computed(() => props.node.attrs.sheetId as string)
  const range = computed(() => props.node.attrs.range as string)
  const title = computed(() => props.node.attrs.title as string)

  const { sheetDef, readRange, sseConnected, sheetLoading, rowsLoading, sheetError } =
    useSheetProjection(sheetId)

  const rangeValid = computed(() => Boolean(parseA1Range(range.value)))
  const loading = computed(() => sheetLoading.value || rowsLoading.value)
  const hadLoaded = ref(false)

  watch(loading, (v) => {
    if (!v && sheetDef.value) hadLoaded.value = true
  })

  type BlockState = 'loading' | 'live' | 'stale' | 'error'

  const blockState = computed((): BlockState => {
    if (loading.value) return 'loading'
    if (sheetError.value || !rangeValid.value) return 'error'
    if (!sheetDef.value) return 'error'
    if (hadLoaded.value && !sseConnected.value) return 'stale'
    return 'live'
  })

  const block = computed(() => {
    if (blockState.value !== 'live') return { headers: [], cells: [] as string[][] }
    return readRange(range.value)
  })

  const displayTitle = computed(() => title.value || sheetDef.value?.title || 'Sheet range')

  function openSheet() {
    if (!sheetId.value || blockState.value === 'error') return
    navigateTo(wp(sheetPathFromEntityId(sheetId.value)))
  }

  function removeBlock() {
    props.deleteNode()
  }
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="my-4 overflow-hidden rounded-lg border bg-muted/20"
    :class="{
      'border-[color-mix(in_oklch,var(--zone-workshop)_30%,var(--border))]': blockState === 'live',
      'border-dashed border-[color-mix(in_oklch,var(--stale,#f59e0b)_50%,var(--border))] bg-[color-mix(in_oklch,var(--stale)_6%,var(--muted))]':
        blockState === 'stale',
      'border-dashed border-destructive/50 bg-destructive/5': blockState === 'error',
    }"
    :aria-label="`Live sheet range from ${sheetId}`"
    contenteditable="false"
  >
    <div
      class="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 font-data text-[11px] text-muted-foreground"
      @click="openSheet"
    >
      <span class="text-[var(--zone-workshop)]">⟴</span>
      <span class="text-foreground">{{ displayTitle }}</span>
      <span class="text-muted-foreground">·</span>
      <span class="truncate">{{ sheetDef?.title || sheetId }}</span>
      <span class="text-muted-foreground">·</span>
      <span class="font-medium text-foreground">{{ range }}</span>
      <span class="flex-1" />
      <span
        v-if="blockState === 'live'"
        class="inline-flex items-center gap-1 rounded-full border border-success/45 bg-success/10 px-2 py-0.5 text-[9.5px] text-success"
      >
        <span class="size-1.5 rounded-full bg-success" />
        LIVE
      </span>
      <span
        v-else-if="blockState === 'stale'"
        class="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_oklch,var(--stale)_50%,var(--border))] px-2 py-0.5 text-[9.5px] text-[var(--stale)]"
        aria-live="polite"
      >
        STALE
      </span>
      <span
        v-else-if="blockState === 'error'"
        class="inline-flex items-center gap-1 rounded-full border border-destructive/45 px-2 py-0.5 text-[9.5px] text-destructive"
        role="alert"
      >
        ERROR
      </span>
    </div>

    <div v-if="blockState === 'loading'" class="p-4 text-sm text-muted-foreground">Loading range…</div>

    <div v-else-if="blockState === 'stale'" class="space-y-3 p-4">
      <p class="text-sm text-muted-foreground">Sheet unavailable or connection lost. Values may be outdated.</p>
      <div class="flex gap-2">
        <UiButton size="sm" variant="outline" class="h-7 text-xs" @click="openSheet">Open sheet</UiButton>
        <UiButton size="sm" variant="ghost" class="h-7 text-xs" @click="removeBlock">Remove block</UiButton>
      </div>
    </div>

    <div v-else-if="blockState === 'error'" class="space-y-3 p-4">
      <p class="text-sm text-muted-foreground">
        {{ sheetError || 'Sheet entity not found or range invalid.' }}
      </p>
      <UiButton size="sm" variant="ghost" class="h-7 text-xs" @click="removeBlock">Remove block</UiButton>
    </div>

    <table v-else class="sheet-grid w-full text-xs">
      <thead>
        <tr>
          <th
            v-for="h in block.headers"
            :key="h"
            class="border-b border-border px-3 py-1.5 text-left font-medium text-muted-foreground/70"
          >
            {{ h }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, ri) in block.cells" :key="ri">
          <td
            v-for="(cell, ci) in row"
            :key="ci"
            role="cell"
            class="border-b border-border px-3 py-1.5 font-data tabular-nums"
            :class="{ 'sheet-cell-derived': ci >= 2, 'sheet-cell-derived-negative': cell.startsWith('-') }"
          >
            {{ cell }}
          </td>
        </tr>
      </tbody>
    </table>
  </NodeViewWrapper>
</template>
