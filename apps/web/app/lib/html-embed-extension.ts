import { Extension, InputRule, Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import HtmlEmbedBlock from '~/components/editor-blocks/HtmlEmbedBlock.vue'
import {
  createHtmlEmbedConfig,
  isLikelyHtmlEmbedSource,
} from '~/lib/block-registry/html-embed'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    htmlEmbed: {
      insertHtmlEmbed: (_attrs?: { source?: string; title?: string; height?: number }) => ReturnType
    }
  }
}

const HTML_DIRECTIVE = /::html(?:[({]\s*title="([^"]*)"\s*[)}])?/

export const HtmlEmbed = Node.create({
  name: 'htmlEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-id'),
        renderHTML: (attrs: Record<string, unknown>) => attrs.id ? { 'data-id': attrs.id } : {},
      },
      title: {
        default: 'HTML embed',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-title') || 'HTML embed',
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-title': attrs.title || 'HTML embed' }),
      },
      source: {
        default: createHtmlEmbedConfig().source,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-source') || createHtmlEmbedConfig().source,
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-source': attrs.source || '' }),
      },
      height: {
        default: 320,
        parseHTML: (el: HTMLElement) => Number(el.getAttribute('data-height')) || 320,
        renderHTML: (attrs: Record<string, unknown>) => ({ 'data-height': String(attrs.height || 320) }),
      },
      lastValidSource: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-last-valid-source') || '',
        renderHTML: (attrs: Record<string, unknown>) => attrs.lastValidSource ? { 'data-last-valid-source': attrs.lastValidSource } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="html-embed"]' }]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'html-embed' })]
  },

  addCommands() {
    return {
      insertHtmlEmbed:
        (attrs?: { source?: string; title?: string; height?: number }) =>
        ({ chain }: any) => {
          const config = createHtmlEmbedConfig(attrs)
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                id: config.id ?? `html-${Date.now().toString(36)}`,
                title: config.title,
                source: config.source,
                height: config.height,
                lastValidSource: config.lastValidSource,
              },
            })
            .run()
        },
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: new RegExp(`${HTML_DIRECTIVE.source}\\s?$`),
        handler: ({ state, range, match }: any) => {
          const title = match[1] || 'HTML embed'
          const config = createHtmlEmbedConfig({ title })
          const node = this.type.create({
            id: `html-${Date.now().toString(36)}`,
            title: config.title,
            source: config.source,
            height: config.height,
            lastValidSource: config.lastValidSource,
          })
          state.tr.replaceWith(range.from, range.to, node)
        },
      }),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(HtmlEmbedBlock)
  },
})

export const HtmlEmbedPasteHandler = Extension.create({
  name: 'htmlEmbedPasteHandler',

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: new PluginKey('htmlEmbedPaste'),
        props: {
          handlePaste(_view: unknown, event: ClipboardEvent) {
            const html = event.clipboardData?.getData('text/html') ?? ''
            const text = event.clipboardData?.getData('text/plain') ?? ''
            const source = html.trim() || text.trim()
            if (!source || !isLikelyHtmlEmbedSource(source)) return false
            if (!/<iframe\b/i.test(source) && !/^<section\b|^<div\b|^<article\b/i.test(source.trim())) return false

            event.preventDefault()
            editor.commands.insertHtmlEmbed({
              title: 'Pasted HTML',
              source,
            })
            return true
          },
        },
      }),
    ]
  },
})
