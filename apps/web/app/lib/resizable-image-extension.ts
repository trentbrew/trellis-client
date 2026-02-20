import Image from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ResizableImage from '~/components/editor/ResizableImage.vue'

export const ResizableImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          element.style.width || element.getAttribute('width') || null,
        renderHTML: (attributes: Record<string, any>) =>
          attributes.width ? { style: `width: ${attributes.width}`, width: attributes.width } : {},
      },
      align: {
        default: 'left',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'left',
        renderHTML: (attributes: Record<string, any>) => ({ 'data-align': attributes.align }),
      },
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ResizableImage)
  },
})
