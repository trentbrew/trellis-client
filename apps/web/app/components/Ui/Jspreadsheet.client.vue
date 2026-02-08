<script lang="ts">
  import { h, computed, ref, defineComponent } from 'vue'
  import { Spreadsheet } from '@jspreadsheet-ce/vue'

  import 'jsuites/dist/jsuites.css'
  import 'jspreadsheet-ce/dist/jspreadsheet.css'

  import type JSpreadsheetCore from 'jspreadsheet-ce'

  export default defineComponent({
    name: 'UiJspreadsheet',
    inheritAttrs: false,
    setup(_props, { attrs, slots, expose }) {
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

      expose({ spreadsheet, worksheets, worksheet })

      // Use a render function instead of <template> + <slot /> to avoid
      // Vue wrapping forwarded slot content in a Fragment vnode.
      // The library's Spreadsheet.mounted() checks vnode.type.name === "Worksheet"
      // on top-level slot vnodes — a Fragment wrapper causes it to find 0 worksheets.
      return () =>
        h('div', { class: wrapperClass.value, style: wrapperStyle.value }, [
          h(Spreadsheet, { ref: spreadsheet, ...spreadsheetAttrs.value }, slots),
        ])
    },
  })
</script>

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
