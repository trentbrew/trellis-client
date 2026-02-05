<script setup lang="ts">
  import { Spreadsheet } from '@jspreadsheet-ce/vue'

  import 'jsuites/dist/jsuites.css'
  import 'jspreadsheet-ce/dist/jspreadsheet.css'

  import type JSpreadsheetCore from 'jspreadsheet-ce'

  defineOptions({ inheritAttrs: false })

  const attrs = useAttrs()

  const wrapperClass = computed(() => (attrs as any).class)
  const wrapperStyle = computed(() => (attrs as any).style)

  const spreadsheetAttrs = computed(() => {
    const { class: _class, style: _style, ...rest } = attrs as Record<string, any>
    return rest
  })

  const spreadsheet = ref<any>(null)

  const worksheets = computed<JSpreadsheetCore.WorksheetInstance[] | null>(() => {
    const current = spreadsheet.value?.current
    if (!Array.isArray(current)) return null
    return current as JSpreadsheetCore.WorksheetInstance[]
  })

  const worksheet = computed<JSpreadsheetCore.WorksheetInstance | null>(() => {
    return worksheets.value?.[0] ?? null
  })

  defineExpose({ spreadsheet, worksheets, worksheet })
</script>

<template>
  <div :class="wrapperClass" :style="wrapperStyle">
    <Spreadsheet ref="spreadsheet" v-bind="spreadsheetAttrs">
      <slot />
    </Spreadsheet>
  </div>
</template>

<style scoped>
  :deep(.jss_spreadsheet) {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 400px;
  }

  :deep(.jss_container) {
    display: block;
    width: 100%;
    height: 100%;
  }

  :deep(.jtabs-content) {
    flex: 1;
    min-height: 0;
    height: 100%;
  }

  :deep(.jss_content) {
    flex: 1;
    min-height: 0;
    width: 100% !important;
    height: 100%;
    max-height: 100% !important;
  }

  :deep(.jss_worksheet) {
    min-width: 100%;
  }
</style>
