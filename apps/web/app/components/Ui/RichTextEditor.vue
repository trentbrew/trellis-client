<script lang="ts" setup>
  import StarterKit from '@tiptap/starter-kit'
  import Placeholder from '@tiptap/extension-placeholder'
  import { EditorContent, useEditor } from '@tiptap/vue-3'
  import { createMentionExtension } from '~/lib/mention-extension'
  import { useEntitySearch } from '~/composables/useEntitySearch'
  import type { EntitySearchItem } from '~/composables/useEntitySearch'
  import { markdownToHtml } from '~/utils/markdown'

  const props = defineProps<{
    modelValue?: string
    placeholder?: string
    minHeight?: string
    compact?: boolean
    seamless?: boolean
    fillHeight?: boolean
    mentions?: boolean
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'mention-click': [attrs: { id: string; label: string; entityType: string }]
  }>()

  const editorClass = props.seamless
    ? 'min-h-[24px] focus:outline-none prose-sm prose-p:my-0.5 prose-headings:my-1 prose-ul:my-0.5 prose-li:my-0'
    : props.compact
      ? 'min-h-[60px] focus:outline-none prose-sm prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5'
      : 'min-h-[100px] focus:outline-none prose-sm prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-1'

  // Build entity search for mentions
  const entitySearch = props.mentions ? useEntitySearch() : null

  const buildExtensions = () => {
    const exts = [
      StarterKit,
      Placeholder.configure({
        placeholder: props.placeholder || '',
      }),
    ]
    if (props.mentions && entitySearch) {
      exts.push(
        createMentionExtension({
          getItems(query: string) {
            entitySearch.search.value = query
            return entitySearch.filteredItems.value as EntitySearchItem[]
          },
        }) as any,
      )
    }
    return exts
  }

  const editor = useEditor({
    extensions: buildExtensions(),
    content: markdownToHtml(props.modelValue || ''),
    editorProps: {
      attributes: {
        class: editorClass,
      },
      handlePaste: (view, event) => {
        const clipboardData = event.clipboardData
        if (!clipboardData) return false
        const html = clipboardData.getData('text/html')
        if (html) return false // already has HTML — let TipTap handle it
        const text = clipboardData.getData('text/plain')
        if (!text) return false
        const converted = markdownToHtml(text)
        if (converted === text) return false // no conversion happened
        editor.value?.commands.insertContent(converted)
        return true
      },
    },
    onUpdate: ({ editor: e }) => {
      emit('update:modelValue', e.getHTML())
    },
  })

  watch(
    () => props.modelValue,
    (val) => {
      if (editor.value && val !== editor.value.getHTML()) {
        editor.value.commands.setContent(markdownToHtml(val || ''))
      }
    },
  )

  onBeforeUnmount(() => {
    editor.value?.destroy()
  })
</script>

<template>
  <div
    v-if="editor"
    :class="[
      seamless ? 'overflow-hidden' : 'rounded-none border-none bg-card overflow-hidden',
      fillHeight ? 'flex flex-col min-h-0' : '',
    ]">
    <!-- Compact Toolbar -->
    <div v-if="!seamless" class="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-1.5 py-1">
      <!-- Text Formatting -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('bold')"
              @click="editor.chain().focus().toggleBold().run()">
              <Icon name="lucide:bold" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Bold</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('italic')"
              @click="editor.chain().focus().toggleItalic().run()">
              <Icon name="lucide:italic" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Italic</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('strike')"
              @click="editor.chain().focus().toggleStrike().run()">
              <Icon name="lucide:strikethrough" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Strike</UiTooltipContent>
        </UiTooltip>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Headings -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('heading', { level: 1 })"
              @click="editor.chain().focus().toggleHeading({ level: 1 }).run()">
              <Icon name="lucide:heading-1" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Heading 1</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('heading', { level: 2 })"
              @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">
              <Icon name="lucide:heading-2" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Heading 2</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('heading', { level: 3 })"
              @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">
              <Icon name="lucide:heading-3" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Heading 3</UiTooltipContent>
        </UiTooltip>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Lists -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('bulletList')"
              @click="editor.chain().focus().toggleBulletList().run()">
              <Icon name="lucide:list" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Bullet List</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('orderedList')"
              @click="editor.chain().focus().toggleOrderedList().run()">
              <Icon name="lucide:list-ordered" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Ordered List</UiTooltipContent>
        </UiTooltip>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Block Elements -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('codeBlock')"
              @click="editor.chain().focus().toggleCodeBlock().run()">
              <Icon name="lucide:code" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Code Block</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiToggle
              size="sm"
              class="h-7 w-7 p-0"
              :pressed="editor.isActive('blockquote')"
              @click="editor.chain().focus().toggleBlockquote().run()">
              <Icon name="lucide:quote" class="h-3.5 w-3.5" />
            </UiToggle>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Blockquote</UiTooltipContent>
        </UiTooltip>
      </div>

      <UiSeparator orientation="vertical" class="h-5 mx-0.5" />

      <!-- Undo/Redo -->
      <div class="flex items-center">
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiButton
              size="icon"
              variant="ghost"
              class="h-7 w-7"
              :disabled="!editor.can().undo()"
              @click="editor.chain().focus().undo().run()">
              <Icon name="lucide:undo" class="h-3.5 w-3.5" />
            </UiButton>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Undo</UiTooltipContent>
        </UiTooltip>
        <UiTooltip>
          <UiTooltipTrigger as-child>
            <UiButton
              size="icon"
              variant="ghost"
              class="h-7 w-7"
              :disabled="!editor.can().redo()"
              @click="editor.chain().focus().redo().run()">
              <Icon name="lucide:redo" class="h-3.5 w-3.5" />
            </UiButton>
          </UiTooltipTrigger>
          <UiTooltipContent side="bottom" class="text-xs">Redo</UiTooltipContent>
        </UiTooltip>
      </div>
    </div>

    <!-- Editor Content -->
    <EditorContent
      :editor="editor"
      class="prose prose-sm max-w-none text-sm text-foreground"
      :class="[
        seamless ? 'px-0 py-0' : 'px-3 py-2',
        seamless ? 'min-h-[24px]' : compact ? 'min-h-[60px]' : 'min-h-[100px]',
        fillHeight ? 'flex-1 min-h-0 overflow-y-auto' : '',
      ]" />
  </div>
</template>

<style scoped>
  :deep(.ProseMirror) {
    outline: none;
    color: hsl(var(--foreground)) !important;
  }

  :deep(.tiptap) {
    height: 100%;
  }

  :deep(.ProseMirror p),
  :deep(.ProseMirror li),
  :deep(.ProseMirror h1),
  :deep(.ProseMirror h2),
  :deep(.ProseMirror h3) {
    color: hsl(var(--foreground));
  }

  :deep(.ProseMirror p.is-editor-empty:first-child::before) {
    color: hsl(var(--muted-foreground));
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
  }

  :deep(.ProseMirror pre) {
    background: hsl(var(--muted));
    border-radius: 0.375rem;
    color: hsl(var(--foreground));
    font-family: 'JetBrainsMono', monospace;
    font-size: 0.8rem;
    padding: 0.5rem 0.75rem;
  }

  :deep(.ProseMirror code) {
    background: hsl(var(--muted));
    border-radius: 0.25rem;
    color: hsl(var(--foreground));
    font-size: 0.85em;
    padding: 0.15em 0.3em;
  }

  :deep(.ProseMirror pre code) {
    background: none;
    color: inherit;
    font-size: inherit;
    padding: 0;
  }

  :deep(.ProseMirror blockquote) {
    border-left: 2px solid hsl(var(--border));
    padding-left: 0.75rem;
    color: hsl(var(--muted-foreground));
    margin: 0.5rem 0;
  }

  :deep(.ProseMirror ul),
  :deep(.ProseMirror ol) {
    padding-left: 1.25rem;
  }

  :deep(.ProseMirror h1) {
    font-size: 1.25rem;
    font-weight: 600;
  }

  :deep(.ProseMirror h2) {
    font-size: 1.1rem;
    font-weight: 600;
  }

  :deep(.ProseMirror h3) {
    font-size: 1rem;
    font-weight: 600;
  }

  /* Mention chip styles live in MentionChip.vue — do not duplicate here */
</style>
