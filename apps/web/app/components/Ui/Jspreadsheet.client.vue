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
      const wrapperClass = computed(() => ['trellis-jspreadsheet-theme', (attrs as any).class])
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

<style>
  .trellis-jspreadsheet-theme {
    --jactive-color: var(--primary);
    --jss-border-color: color-mix(in srgb, var(--border) 78%, transparent);
    --jss-border-outline: var(--ring);
    --jss-background-color: var(--background);
    --jss-background-color-header: var(--card);
    --jss-background-color-highlight: color-mix(in srgb, var(--accent) 88%, transparent);
    --jss-background-color-active: color-mix(in srgb, var(--accent) 60%, var(--card));
    --jss-font-color: var(--foreground);
    --jss-font-color-muted: var(--muted-foreground);
    --jss-shadow-color: color-mix(in srgb, var(--background) 55%, black);
    color: var(--foreground);
    background-color: var(--background);
  }

  .trellis-jspreadsheet-theme .fullscreen {
    background-color: var(--jss-background-color);
    color: var(--jss-font-color);
  }

  .trellis-jspreadsheet-theme .jss_spreadsheet {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    min-height: 400px;
    color: var(--jss-font-color);
    background-color: var(--jss-background-color);
  }

  .trellis-jspreadsheet-theme .jss_container {
    display: block;
    width: 100%;
    height: 100%;
  }

  .trellis-jspreadsheet-theme .jss_toolbar,
  .trellis-jspreadsheet-theme .jtoolbar {
    background-color: var(--jss-background-color-header);
    border-color: var(--jss-border-color);
    color: var(--jss-font-color);
  }

  .trellis-jspreadsheet-theme .jtoolbar .jtoolbar-item,
  .trellis-jspreadsheet-theme .jtoolbar .jpicker-header,
  .trellis-jspreadsheet-theme .jtoolbar .jtoolbar-item i {
    color: var(--jss-font-color);
  }

  .trellis-jspreadsheet-theme .jtoolbar .jtoolbar-item:hover,
  .trellis-jspreadsheet-theme .jpicker-header:hover,
  .trellis-jspreadsheet-theme .jtoolbar-active {
    background-color: var(--jss-background-color-highlight);
  }

  .trellis-jspreadsheet-theme .jtoolbar .jtoolbar-arrow {
    border-color: var(--jss-border-color);
  }

  .trellis-jspreadsheet-theme .jtoolbar .jtoolbar-divisor {
    background-color: var(--jss-border-color);
  }

  .trellis-jspreadsheet-theme .jtoolbar-floating,
  .trellis-jspreadsheet-theme .jpicker-content,
  .trellis-jspreadsheet-theme .jdropdown-default .jdropdown-container,
  .trellis-jspreadsheet-theme .jdropdown-default .jdropdown-content,
  .trellis-jspreadsheet-theme .jdropdown-picker .jdropdown-container,
  .trellis-jspreadsheet-theme .jdropdown-picker .jdropdown-close,
  .trellis-jspreadsheet-theme .jdropdown-picker .jdropdown-content,
  .trellis-jspreadsheet-theme .jss_worksheet .editor .jupload,
  .trellis-jspreadsheet-theme .jss_worksheet .editor .jss_richtext,
  .trellis-jspreadsheet-theme .jtooltip {
    background-color: var(--popover);
    color: var(--popover-foreground);
    border-color: var(--jss-border-color);
    box-shadow: 0 16px 40px color-mix(in srgb, var(--jss-shadow-color) 28%, transparent);
  }

  .trellis-jspreadsheet-theme .jpicker-content > div:hover,
  .trellis-jspreadsheet-theme .jdropdown-default .jdropdown-item:hover,
  .trellis-jspreadsheet-theme .jdropdown-default .jdropdown-cursor,
  .trellis-jspreadsheet-theme .jdropdown-picker .jdropdown-cursor {
    background-color: var(--jss-background-color-highlight);
    color: var(--jss-font-color);
  }

  .trellis-jspreadsheet-theme .jdropdown-default .jdropdown-selected,
  .trellis-jspreadsheet-theme .jdropdown-picker .jdropdown-selected {
    background-color: var(--primary);
    color: var(--primary-foreground);
  }

  .trellis-jspreadsheet-theme .jdropdown-item,
  .trellis-jspreadsheet-theme .jdropdown-title,
  .trellis-jspreadsheet-theme .jdropdown-description,
  .trellis-jspreadsheet-theme .jdropdown-group-name {
    color: inherit;
  }

  .trellis-jspreadsheet-theme .jtabs .jtabs-headers-container {
    gap: 0.25rem;
  }

  .trellis-jspreadsheet-theme .jtabs .jtabs-headers > div:not(.jtabs-border),
  .trellis-jspreadsheet-theme .jtabs.jtabs-modern .jtabs-headers > div:not(.jtabs-border) {
    background-color: var(--jss-background-color-header);
    color: var(--jss-font-color);
    border: 1px solid color-mix(in srgb, var(--jss-border-color) 75%, transparent);
  }

  .trellis-jspreadsheet-theme .jtabs .jtabs-headers > div > div {
    color: inherit;
  }

  .trellis-jspreadsheet-theme .jtabs .jtabs-headers > div.jtabs-selected,
  .trellis-jspreadsheet-theme .jtabs.jtabs-modern .jtabs-headers > .jtabs-selected,
  .trellis-jspreadsheet-theme .jtabs.jtabs-modern .jtabs-headers > .jtabs-selected .material-icons {
    background-color: var(--jss-background-color-active);
    color: var(--jss-font-color);
  }

  .trellis-jspreadsheet-theme .jtabs .jtabs-border {
    background-color: var(--primary);
  }

  .trellis-jspreadsheet-theme .jtabs.jtabs-modern .jtabs-headers {
    background-color: color-mix(in srgb, var(--card) 75%, var(--background)) !important;
  }

  .trellis-jspreadsheet-theme .jtabs-content {
    flex: 1;
    min-height: 0;
    height: 100%;
  }

  .trellis-jspreadsheet-theme .jss_content {
    flex: 1;
    min-height: 0;
    width: 100% !important;
    height: 100%;
    max-height: 100% !important;
    background-color: var(--jss-background-color);
    scrollbar-color: color-mix(in srgb, var(--muted-foreground) 65%, transparent) transparent;
  }

  .trellis-jspreadsheet-theme .jss_content::-webkit-scrollbar-track,
  .trellis-jspreadsheet-theme .jpicker-content::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--muted) 70%, transparent);
  }

  .trellis-jspreadsheet-theme .jss_content::-webkit-scrollbar-thumb,
  .trellis-jspreadsheet-theme .jpicker-content::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--muted-foreground) 60%, transparent);
  }

  .trellis-jspreadsheet-theme .jss_worksheet {
    min-width: 100%;
    background-color: var(--card);
    color: var(--foreground);
    border-right-color: var(--jss-border-color);
    border-bottom-color: var(--jss-border-color);
  }

  .trellis-jspreadsheet-theme .jss_worksheet > thead > tr > td,
  .trellis-jspreadsheet-theme .jss_worksheet > tbody > tr > td:first-child,
  .trellis-jspreadsheet-theme .jss_page_selected {
    background-color: var(--jss-background-color-header);
    color: var(--jss-font-color-muted);
    border-color: var(--jss-border-color);
  }

  .trellis-jspreadsheet-theme .jss_worksheet > thead > tr > td.selected,
  .trellis-jspreadsheet-theme .jss_worksheet > tbody > tr.selected > td:first-child {
    background-color: var(--jss-background-color-active);
    color: var(--jss-font-color);
  }

  .trellis-jspreadsheet-theme .jss_worksheet > tbody > tr > td {
    background-color: var(--card);
    color: var(--foreground);
    border-color: var(--jss-border-color);
  }

  .trellis-jspreadsheet-theme .jss_worksheet > tbody > tr.dragging > td,
  .trellis-jspreadsheet-theme .jss_worksheet .selection,
  .trellis-jspreadsheet-theme .jss_worksheet .highlight,
  .trellis-jspreadsheet-theme .jss_worksheet .highlight-selected {
    background-color: color-mix(in srgb, var(--accent) 35%, var(--card));
  }

  .trellis-jspreadsheet-theme .jss_worksheet .selection-left,
  .trellis-jspreadsheet-theme .jss_worksheet .selection-right,
  .trellis-jspreadsheet-theme .jss_worksheet .selection-top,
  .trellis-jspreadsheet-theme .jss_worksheet .selection-bottom,
  .trellis-jspreadsheet-theme .jss_worksheet .highlight-top,
  .trellis-jspreadsheet-theme .jss_worksheet .highlight-left,
  .trellis-jspreadsheet-theme .jss_worksheet .highlight-right,
  .trellis-jspreadsheet-theme .jss_worksheet .highlight-bottom {
    border-color: var(--primary);
    box-shadow: none;
  }

  .trellis-jspreadsheet-theme .jss_worksheet > tbody > tr > td.readonly {
    background-color: color-mix(in srgb, var(--muted) 55%, var(--card));
    color: var(--jss-font-color-muted);
  }

  .trellis-jspreadsheet-theme .jss_worksheet > tbody > tr > td > input,
  .trellis-jspreadsheet-theme .jss_worksheet > tbody > tr > td > textarea,
  .trellis-jspreadsheet-theme .jss_worksheet > tbody > tr > td > select,
  .trellis-jspreadsheet-theme .jss_worksheet .editor {
    color: inherit;
    caret-color: var(--primary);
  }

  .trellis-jspreadsheet-theme .jss_corner {
    background-color: var(--primary);
    border-color: var(--card);
  }

  .trellis-jspreadsheet-theme .jss_pagination > div > div {
    background-color: var(--card);
    color: var(--foreground);
    border-color: var(--jss-border-color);
  }
</style>
