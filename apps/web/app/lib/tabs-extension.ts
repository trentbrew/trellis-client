import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import TabsContainerBlock from '~/components/editor-blocks/TabsContainerBlock.vue'
import TabItemBlock from '~/components/editor-blocks/TabItemBlock.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tabsContainer: {
      insertTabs: (_tabs?: Array<{ label: string; icon?: string }>) => ReturnType
    }
  }
}

export const TabItem = Node.create({
  name: 'tabItem',

  group: 'tabItem',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      label: {
        default: 'Tab',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-label') || 'Tab',
        renderHTML: (attrs: Record<string, any>) => ({ 'data-label': attrs.label }),
      },
      icon: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-icon') || '',
        renderHTML: (attrs: Record<string, any>) =>
          attrs.icon ? { 'data-icon': attrs.icon } : {},
      },
      active: {
        default: false,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-active') === 'true',
        renderHTML: (attrs: Record<string, any>) => ({ 'data-active': String(attrs.active) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tab-item"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tab-item' }), 0]
  },

  addNodeView() {
    return VueNodeViewRenderer(TabItemBlock)
  },
})

export const TabsContainer = Node.create({
  name: 'tabsContainer',

  group: 'block',

  content: 'tabItem+',

  defining: true,

  addAttributes() {
    return {}
  },

  parseHTML() {
    return [{ tag: 'div[data-type="tabs-container"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'tabs-container' }), 0]
  },

  addCommands() {
    return {
      insertTabs:
        (tabs) =>
        ({ chain }) => {
          const tabDefs = tabs ?? [
            { label: 'Tab 1' },
            { label: 'Tab 2' },
            { label: 'Tab 3' },
          ]
          return chain()
            .insertContent({
              type: 'tabsContainer',
              content: tabDefs.map((t, i) => ({
                type: 'tabItem',
                attrs: { label: t.label, icon: t.icon ?? '', active: i === 0 },
                content: [{ type: 'paragraph' }],
              })),
            })
            .run()
        },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(TabsContainerBlock)
  },
})
