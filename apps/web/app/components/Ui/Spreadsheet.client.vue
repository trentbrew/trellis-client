<script setup lang="ts">
  import { computed, nextTick, onMounted, ref, watch } from 'vue'
  import { Worksheet } from '@jspreadsheet-ce/vue'

  import type JSpreadsheetCore from 'jspreadsheet-ce'

  import UiJspreadsheet from '~/components/Ui/Jspreadsheet.client.vue'

  interface SpreadsheetProps {
    data?: any[][]
    columns?: any[]
    options?: any
    minDimensions?: [number, number]
  }

  const props = withDefaults(defineProps<SpreadsheetProps>(), {
    data: () => [],
    columns: () => [],
    options: () => ({}),
    minDimensions: () => [10, 10],
  })

  const emit = defineEmits<{
    ready: [instance: any]
    change: [instance: any, cell: any, x: number, y: number, value: any]
  }>()

  const spreadsheetRef = ref<any>(null)

  const worksheetAttrs = computed<Record<string, any>>(() => {
    const opts = (props.options || {}) as Record<string, any>
    const { tableOverflow, tableWidth, tableHeight, ...rest } = opts
    return {
      ...(tableOverflow !== undefined ? { tableOverflow } : null),
      ...(tableWidth !== undefined ? { tableWidth } : null),
      ...(tableHeight !== undefined ? { tableHeight } : null),
      ...rest,
    }
  })

  const spreadsheetAttrs = computed<Record<string, any>>(() => {
    // For now, keep this empty. If we later need spreadsheet-level options (tabs/toolbar/etc)
    // we can explicitly plumb them through here.
    return {}
  })

  const mountKey = computed(() => {
    const cols = props.columns?.length ?? 0
    const rows = props.data?.length ?? 0
    const sig = `${cols}:${rows}:${props.minDimensions?.[0] ?? 0}:${props.minDimensions?.[1] ?? 0}`
    return sig
  })

  const worksheet = computed<JSpreadsheetCore.WorksheetInstance | null>(() => {
    const exposed = spreadsheetRef.value?.worksheet
    const v = (
      exposed && typeof exposed === 'object' && 'value' in exposed ? (exposed as any).value : null
    ) as JSpreadsheetCore.WorksheetInstance | null
    return v ?? null
  })

  onMounted(() => {
    // The worksheet instance may not exist on the first tick.
    const ws = worksheet.value
    if (ws) emit('ready', ws)
  })

  watch(
    [worksheet, () => props.data],
    async ([ws, newData]) => {
      if (!ws) return
      try {
        ws.setData(newData || [])
      } finally {
        await nextTick()
      }
    },
    { deep: true, immediate: true },
  )

  defineExpose({
    worksheet,
  })
</script>

<template>
  <div class="spreadsheet-wrapper">
    <UiJspreadsheet :key="mountKey" ref="spreadsheetRef" class="h-full w-full" v-bind="spreadsheetAttrs">
      <Worksheet
        :data="props.data"
        :columns="props.columns"
        :min-dimensions="props.minDimensions"
        v-bind="worksheetAttrs" />
    </UiJspreadsheet>
  </div>
</template>

<style scoped>
  .spreadsheet-wrapper {
    width: 100%;
    height: 100%;
    overflow: auto;
  }
</style>
