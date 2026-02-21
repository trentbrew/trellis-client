import { Mark, mergeAttributes } from '@tiptap/core'

export interface InlineCommentOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineComment: {
      setInlineComment: (_commentId: string) => ReturnType
      unsetInlineComment: (_commentId: string) => ReturnType
      scrollToInlineComment: (_commentId: string) => ReturnType
    }
  }
}

export const InlineComment = Mark.create<InlineCommentOptions>({
  name: 'inlineComment',

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-comment-id'),
        renderHTML: (attrs: Record<string, any>) => {
          if (!attrs.commentId) return {}
          return { 'data-comment-id': attrs.commentId }
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'mark[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'inline-comment',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setInlineComment:
        (commentId: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { commentId })
        },

      unsetInlineComment:
        (commentId: string) =>
        ({ tr, state, dispatch }) => {
          let found = false
          state.doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === 'inlineComment' && mark.attrs.commentId === commentId) {
                const to = pos + node.nodeSize
                if (dispatch) {
                  tr.removeMark(pos, to, mark.type)
                  found = true
                }
              }
            })
          })
          if (found && dispatch) dispatch(tr)
          return found
        },

      scrollToInlineComment:
        (commentId: string) =>
        ({ editor, commands }) => {
          let targetPos: number | null = null
          editor.state.doc.descendants((node, pos) => {
            if (targetPos !== null) return false
            node.marks.forEach((mark) => {
              if (mark.type.name === 'inlineComment' && mark.attrs.commentId === commentId) {
                targetPos = pos
              }
            })
          })
          if (targetPos === null) return false
          commands.setTextSelection(targetPos)
          try {
            const domInfo = editor.view.domAtPos(targetPos)
            const el = domInfo.node as Element
            el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
          } catch {
            // ignore scroll failures
          }
          return true
        },
    }
  },
})
