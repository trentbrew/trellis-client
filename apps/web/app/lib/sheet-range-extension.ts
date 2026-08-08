import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SheetRangeBlock from '~/components/editor-blocks/SheetRangeBlock.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sheetRange: {
      insertSheetRange: (_attrs: { sheetId: string; range: string; title?: string }) => ReturnType
    }
  }
}

export const SheetRange = Node.create({
  name: 'sheetRange',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      sheetId: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-sheet-id') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-sheet-id': attributes.sheetId,
        }),
      },
      range: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-range') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-range': attributes.range,
        }),
      },
      title: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-title') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-title': attributes.title,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="sheet-range"]' }]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'sheet-range' }),
      HTMLAttributes['data-title'] || 'Sheet range',
    ]
  },

  addCommands() {
    return {
      insertSheetRange:
        (attrs: { sheetId: string; range: string; title?: string }) =>
        ({ chain }) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                sheetId: attrs.sheetId,
                range: attrs.range,
                title: attrs.title || '',
              },
            })
            .run()
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(SheetRangeBlock)
  },
})
