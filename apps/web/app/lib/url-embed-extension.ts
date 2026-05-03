import { Node, mergeAttributes, InputRule, Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import UrlEmbedView from '~/components/editor-blocks/UrlEmbedView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    urlEmbed: {
      insertUrlEmbed: (_attrs?: { src?: string; title?: string; mode?: 'embed' | 'image'; height?: number }) => ReturnType
    }
  }
}

/** Matches ::embed(src="URL" title="...") OR ::embed{src="URL" title="..."} — title is optional */
const EMBED_SYNTAX = /::embed[({]\s*src="([^"]+)"(?:\s+title="([^"]*)")?\s*[)}]/

/** Matches ::image(src="URL" alt="...") OR ::image{src="URL" alt="..."} — alt is optional */
const IMAGE_SYNTAX = /::image[({]\s*src="([^"]+)"(?:\s+alt="([^"]*)")?\s*[)}]/

/** Matches ::youtube{id="VIDEO_ID" title="..."} — title is optional */
const YOUTUBE_SYNTAX = /::youtube[({]\s*id="([^"]+)"(?:\s+title="([^"]*)")?\s*[)}]/

/** Matches ::spotify{url="SPOTIFY_URL"} */
const SPOTIFY_SYNTAX = /::spotify[({]\s*url="([^"]+)"\s*[)}]/

export const UrlEmbed = Node.create({
  name: 'urlEmbed',

  group: 'block',

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-src') || null,
        renderHTML: (attrs: Record<string, any>) => attrs.src ? { 'data-src': attrs.src } : {},
      },
      title: {
        default: '',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-title') || '',
        renderHTML: (attrs: Record<string, any>) => ({ 'data-title': attrs.title || '' }),
      },
      mode: {
        default: 'embed',
        parseHTML: (el: HTMLElement) => (el.getAttribute('data-mode') as 'embed' | 'image') || 'embed',
        renderHTML: (attrs: Record<string, any>) => ({ 'data-mode': attrs.mode || 'embed' }),
      },
      height: {
        default: 480,
        parseHTML: (el: HTMLElement) => parseInt(el.getAttribute('data-height') || '480', 10),
        renderHTML: (attrs: Record<string, any>) => ({ 'data-height': String(attrs.height || 480) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="url-embed"]' }]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'url-embed' })]
  },

  addCommands() {
    return {
      insertUrlEmbed:
        (attrs?: { src?: string; title?: string; mode?: 'embed' | 'image'; height?: number }) =>
        ({ chain }: any) => {
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                src: attrs?.src || null,
                title: attrs?.title || '',
                mode: attrs?.mode || 'embed',
                height: attrs?.height || 480,
              },
            })
            .run()
        },
    }
  },

  addInputRules() {
    return [
      // ::embed(src="URL" title="Title") → urlEmbed node
      new InputRule({
        find: new RegExp(`${EMBED_SYNTAX.source}\\s?$`),
        handler: ({ state, range, match }: any) => {
          const src = match[1]
          const title = match[2] || ''
          const { tr } = state
          const node = this.type.create({ src, title, mode: 'embed', height: 480 })
          tr.replaceWith(range.from, range.to, node)
        },
      }),
      // ::youtube{id="ID" title="..."} → urlEmbed node (youtube mode)
      new InputRule({
        find: new RegExp(`${YOUTUBE_SYNTAX.source}\\s?$`),
        handler: ({ state, range, match }: any) => {
          const src = match[1]
          const title = match[2] || ''
          const { tr } = state
          const node = this.type.create({ src, title, mode: 'youtube', height: 360 })
          tr.replaceWith(range.from, range.to, node)
        },
      }),
      // ::spotify{url="URL"} → urlEmbed node (spotify mode)
      new InputRule({
        find: new RegExp(`${SPOTIFY_SYNTAX.source}\\s?$`),
        handler: ({ state, range, match }: any) => {
          const src = match[1]
          const { tr } = state
          const node = this.type.create({ src, title: '', mode: 'spotify', height: 152 })
          tr.replaceWith(range.from, range.to, node)
        },
      }),
    ]
  },

  addNodeView() {
    return VueNodeViewRenderer(UrlEmbedView)
  },
})

/**
 * Standalone extension that adds:
 * 1. InputRule for ::image(src="..." alt="...") → standard image node
 * 2. Paste plugin that converts ::embed(...) / ::image(...) text in pasted content
 */
export const UrlEmbedPasteHandler = Extension.create({
  name: 'urlEmbedPasteHandler',

  addInputRules() {
    return [
      // ::image(src="URL" alt="Alt") → standard image node (uses ResizableImageExtension)
      new InputRule({
        find: new RegExp(`${IMAGE_SYNTAX.source}\\s?$`),
        handler: ({ state, range, match }: any) => {
          const src = match[1]
          const alt = match[2] || ''
          const imageType = state.schema.nodes.image
          if (!imageType) return
          const { tr } = state
          const node = imageType.create({ src, alt, title: alt })
          tr.replaceWith(range.from, range.to, node)
        },
      }),
    ]
  },

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: new PluginKey('urlEmbedPaste'),
        props: {
          handlePaste(_view: any, event: ClipboardEvent) {
            const text = event.clipboardData?.getData('text/plain')
            if (!text) return false

            // Check for any ::embed or ::image directives in the pasted text
            const hasEmbed = EMBED_SYNTAX.test(text)
            const hasImage = IMAGE_SYNTAX.test(text)
            const hasYoutube = YOUTUBE_SYNTAX.test(text)
            const hasSpotify = SPOTIFY_SYNTAX.test(text)
            if (!hasEmbed && !hasImage && !hasYoutube && !hasSpotify) return false

            event.preventDefault()

            // Process line by line, replacing directives with nodes
            const lines = text.split('\n')
            const content: any[] = []

            for (const line of lines) {
              const embedMatch = line.match(EMBED_SYNTAX)
              const imageMatch = line.match(IMAGE_SYNTAX)

              const youtubeMatch = line.match(YOUTUBE_SYNTAX)
              const spotifyMatch = line.match(SPOTIFY_SYNTAX)

              if (embedMatch) {
                const src = embedMatch[1]
                const title = embedMatch[2] || ''
                content.push({ type: 'urlEmbed', attrs: { src, title, mode: 'embed', height: 480 } })
                const before = line.slice(0, embedMatch.index).trim()
                const after = line.slice((embedMatch.index || 0) + embedMatch[0].length).trim()
                if (before) content.unshift({ type: 'paragraph', content: [{ type: 'text', text: before }] })
                if (after) content.push({ type: 'paragraph', content: [{ type: 'text', text: after }] })
              } else if (youtubeMatch) {
                const src = youtubeMatch[1]
                const title = youtubeMatch[2] || ''
                content.push({ type: 'urlEmbed', attrs: { src, title, mode: 'youtube', height: 360 } })
                const before = line.slice(0, youtubeMatch.index).trim()
                const after = line.slice((youtubeMatch.index || 0) + youtubeMatch[0].length).trim()
                if (before) content.unshift({ type: 'paragraph', content: [{ type: 'text', text: before }] })
                if (after) content.push({ type: 'paragraph', content: [{ type: 'text', text: after }] })
              } else if (spotifyMatch) {
                const src = spotifyMatch[1]
                content.push({ type: 'urlEmbed', attrs: { src, title: '', mode: 'spotify', height: 152 } })
                const before = line.slice(0, spotifyMatch.index).trim()
                const after = line.slice((spotifyMatch.index || 0) + spotifyMatch[0].length).trim()
                if (before) content.unshift({ type: 'paragraph', content: [{ type: 'text', text: before }] })
                if (after) content.push({ type: 'paragraph', content: [{ type: 'text', text: after }] })
              } else if (imageMatch) {
                const src = imageMatch[1]
                const alt = imageMatch[2] || ''
                const hasImageExt = editor.schema.nodes.image
                if (hasImageExt) {
                  content.push({ type: 'image', attrs: { src, alt, title: alt } })
                }
                const before = line.slice(0, imageMatch.index).trim()
                const after = line.slice((imageMatch.index || 0) + imageMatch[0].length).trim()
                if (before) content.unshift({ type: 'paragraph', content: [{ type: 'text', text: before }] })
                if (after) content.push({ type: 'paragraph', content: [{ type: 'text', text: after }] })
              } else if (line.trim()) {
                content.push({ type: 'paragraph', content: [{ type: 'text', text: line }] })
              }
            }

            if (content.length) {
              editor.chain().focus().insertContent(content).run()
            }

            return true
          },
        },
      }),
    ]
  },
})
