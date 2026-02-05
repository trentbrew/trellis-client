import { type VariantProps, cva } from 'class-variance-authority'

export { default as CodeEditor } from './CodeEditor.vue'

export const codeEditorVariants = cva('rounded-lg border border-border overflow-hidden', {
  variants: {
    variant: {
      default: 'bg-card',
      ghost: 'border-none bg-transparent',
      outline: 'bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export type CodeEditorVariants = VariantProps<typeof codeEditorVariants>
