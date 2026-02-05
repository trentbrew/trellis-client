<script setup lang="ts">
  import type { HTMLAttributes } from 'vue'
  import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
  import { cn } from '~/lib/utils'
  import { getCurrentThemeStyles } from '~/utils/theme'
  import { useThemeStore } from '~/stores/theme'
  import { type CodeEditorVariants, codeEditorVariants } from '.'

  interface Props {
    modelValue?: string
    language?: string
    theme?: 'vs' | 'vs-dark' | 'hc-black' | 'auto'
    height?: string | number
    width?: string | number
    readonly?: boolean
    lineNumbers?: boolean
    minimap?: boolean
    wordWrap?: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
    fontSize?: number
    tabSize?: number
    options?: Record<string, any>
    persistKey?: string
    persistViewState?: boolean
    class?: HTMLAttributes['class']
    variant?: CodeEditorVariants['variant']
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    language: 'javascript',
    theme: 'auto',
    height: '300px',
    width: '100%',
    readonly: false,
    lineNumbers: true,
    minimap: false,
    wordWrap: 'on',
    fontSize: 14,
    tabSize: 2,
    persistViewState: false,
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    mount: [editor: any]
    change: [value: string]
  }>()

  const modelValue = computed({
    get: () => props.modelValue,
    set: (value) => {
      lastEmittedModelValue.value = value
      emit('update:modelValue', value)
    },
  })

  const isDark = ref(false)
  const editorInstance = ref<any>(null)
  const dynamicThemeName = ref('turtle-dynamic')
  const viewState = ref<any>(null)
  const lastEmittedModelValue = ref<string | null>(null)

  const themeStore = useThemeStore()

  const monacoLanguage = computed(() => {
    return props.language === 'jsonc' ? 'json' : props.language
  })

  const parseRgb = (value: string): { r: number; g: number; b: number } | null => {
    const v = String(value || '').trim()
    const rgb = v.match(/^rgba?\((\s*\d+\s*),\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+\s*)?\)$/i)
    if (!rgb) return null
    const r = Math.max(0, Math.min(255, Number(rgb[1])))
    const g = Math.max(0, Math.min(255, Number(rgb[2])))
    const b = Math.max(0, Math.min(255, Number(rgb[3])))
    return { r, g, b }
  }

  const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => {
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  }

  const withAlpha = (hex: string, alpha: number) => {
    const a = Math.max(0, Math.min(1, alpha))
    const aa = Math.round(a * 255)
      .toString(16)
      .padStart(2, '0')
    return `${hex}${aa}`
  }

  const toMonacoHexColor = (value: string | undefined) => {
    if (!value) return undefined
    const v = String(value).trim()

    if (v.startsWith('#')) {
      const hex = v.slice(1)
      if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        const expanded = hex
          .split('')
          .map((c) => `${c}${c}`)
          .join('')
        return `#${expanded.toLowerCase()}`
      }
      if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex.toLowerCase()}`
      return undefined
    }

    const parsed = parseRgb(v)
    if (parsed) return rgbToHex(parsed)

    if (!import.meta.client) return undefined
    try {
      const el = document.createElement('span')
      el.style.color = v
      el.style.position = 'absolute'
      el.style.left = '-9999px'
      el.style.top = '-9999px'
      document.body.appendChild(el)
      const computed = getComputedStyle(el).color
      document.body.removeChild(el)
      const fromComputed = parseRgb(computed)
      return fromComputed ? rgbToHex(fromComputed) : undefined
    } catch {
      return undefined
    }
  }

  const toMonacoTokenColor = (value: string | undefined) => {
    const hex = toMonacoHexColor(value)
    return hex ? hex.slice(1) : undefined
  }

  const applyDynamicTheme = () => {
    if (!import.meta.client) return
    const monaco = (window as any).monaco
    if (!monaco?.editor) return

    const styles = getCurrentThemeStyles(isDark.value ? 'dark' : 'light')

    const foreground = styles.foreground || '#e4e4e7'
    const muted = styles['muted-foreground'] || '#a1a1aa'
    const primary = styles.primary || '#3b82f6'
    const destructive = styles.destructive || '#ef4444'
    const chart1 = styles['chart-1'] || primary
    const chart2 = styles['chart-2'] || '#9ECBFF'
    const chart3 = styles['chart-3'] || '#79B8FF'
    const background = styles.background || (isDark.value ? '#0b0b0f' : '#ffffff')
    const card = styles.card || background
    const border = styles.border || '#404040'
    const accent = styles.accent || '#27272a'

    const backgroundHex = toMonacoHexColor(background) || (isDark.value ? '#0b0b0f' : '#ffffff')
    const foregroundHex = toMonacoHexColor(foreground) || (isDark.value ? '#e4e4e7' : '#111827')
    const mutedHex = toMonacoHexColor(muted) || (isDark.value ? '#a1a1aa' : '#6b7280')
    const borderHex = toMonacoHexColor(border) || (isDark.value ? '#27272a' : '#e5e7eb')
    const cardHex = toMonacoHexColor(card) || backgroundHex
    const accentHex = toMonacoHexColor(accent) || (isDark.value ? '#27272a' : '#e5e7eb')
    const destructiveHex = toMonacoHexColor(destructive) || (isDark.value ? '#ef4444' : '#dc2626')

    const name = `turtle-dynamic-${isDark.value ? 'dark' : 'light'}`
    dynamicThemeName.value = name

    const commentHex = toMonacoTokenColor(muted)
    const stringHex = toMonacoTokenColor(chart2)
    const numberHex = toMonacoTokenColor(chart3)
    const keywordHex = toMonacoTokenColor(primary)
    const typeHex = toMonacoTokenColor(chart1)
    const identifierHex = toMonacoTokenColor(foreground)
    const delimiterHex = toMonacoTokenColor(muted)

    monaco.editor.defineTheme(name, {
      base: (isDark.value ? 'vs-dark' : 'vs') as any,
      inherit: true,
      rules: [
        ...(commentHex ? [{ token: 'comment', foreground: commentHex }] : []),
        ...(stringHex ? [{ token: 'string', foreground: stringHex }] : []),
        ...(numberHex ? [{ token: 'number', foreground: numberHex }] : []),
        ...(keywordHex ? [{ token: 'keyword', foreground: keywordHex }] : []),
        ...(typeHex ? [{ token: 'type', foreground: typeHex }] : []),
        ...(identifierHex ? [{ token: 'identifier', foreground: identifierHex }] : []),
        ...(delimiterHex ? [{ token: 'delimiter', foreground: delimiterHex }] : []),
      ],
      colors: {
        'editor.background': backgroundHex,
        'editor.foreground': foregroundHex,
        'editorLineNumber.foreground': mutedHex,
        'editorLineNumber.activeForeground': foregroundHex,
        'editorCursor.foreground': foregroundHex,
        'editor.selectionBackground': withAlpha(accentHex, isDark.value ? 0.35 : 0.25),
        'editor.inactiveSelectionBackground': withAlpha(accentHex, isDark.value ? 0.25 : 0.18),
        'editor.lineHighlightBackground': withAlpha(accentHex, isDark.value ? 0.12 : 0.08),
        'editorWidget.background': cardHex,
        'editorWidget.border': borderHex,
        'editorSuggestWidget.background': cardHex,
        'editorSuggestWidget.border': borderHex,
        'editorError.foreground': destructiveHex,
      },
    })

    if (props.theme === 'auto' && typeof monaco.editor.setTheme === 'function') {
      monaco.editor.setTheme(name)
    }
  }

  const scrollToTop = () => {
    const editor = editorInstance.value
    if (!editor) return
    if (typeof editor.setScrollTop === 'function') editor.setScrollTop(0)
  }

  defineExpose({ scrollToTop })

  const customTheme = {
    base: 'vs-dark' as const,
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A737D' },
      { token: 'string', foreground: '9ECBFF' },
      { token: 'number', foreground: '79B8FF' },
      { token: 'keyword', foreground: 'F97583' },
      { token: 'type', foreground: 'B392F0' },
      { token: 'identifier', foreground: 'E1E4E8' },
    ],
    colors: {
      'editor.background': '#0b0b0f',
      'editor.foreground': '#e4e4e7', // zinc-200
      'editor.lineHighlightBackground': '#27272a33', // zinc-800 with opacity
      'editorLineNumber.foreground': '#71717a', // zinc-500
      'editorLineNumber.activeForeground': '#a1a1aa', // zinc-400
      'editor.selectionBackground': '#3f3f4655', // zinc-700 with opacity
      'editor.inactiveSelectionBackground': '#3f3f4633',
      'editorCursor.foreground': '#a1a1aa', // zinc-400
      'editorWhitespace.foreground': '#52525b', // zinc-600
    },
  }

  onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark')

    const observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark')
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    applyDynamicTheme()
  })

  watch(isDark, () => {
    applyDynamicTheme()
  })

  watch(
    () => themeStore.currentPresetId,
    () => {
      applyDynamicTheme()
    },
  )

  const editorTheme = computed(() => {
    if (props.theme === 'auto') {
      return dynamicThemeName.value
    }
    return props.theme
  })

  const persistStorageKey = computed(() => {
    if (!props.persistKey) return ''
    return `codeEditor:viewState:${props.persistKey}`
  })

  const maybeLoadViewState = () => {
    if (!import.meta.client) return
    if (!props.persistViewState) return
    if (!persistStorageKey.value) return
    try {
      const raw = sessionStorage.getItem(persistStorageKey.value)
      if (!raw) return
      viewState.value = JSON.parse(raw)
    } catch {
      // ignore
    }
  }

  const maybeSaveViewState = () => {
    const editor = editorInstance.value
    if (!editor) return
    if (!props.persistViewState) return
    if (typeof editor.saveViewState !== 'function') return
    try {
      viewState.value = editor.saveViewState()
      if (import.meta.client && persistStorageKey.value) {
        sessionStorage.setItem(persistStorageKey.value, JSON.stringify(viewState.value))
      }
    } catch {
      // ignore
    }
  }

  const mergedOptions = computed(() => ({
    readOnly: props.readonly,
    lineNumbers: props.lineNumbers ? 'on' : 'off',
    minimap: { enabled: props.minimap },
    wordWrap: props.wordWrap,
    fontSize: props.fontSize,
    tabSize: props.tabSize,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 12, bottom: 12 },
    scrollbar: {
      verticalScrollbarSize: 8,
      horizontalScrollbarSize: 8,
    },
    ...props.options,
  }))

  function handleMount(editor: any) {
    editorInstance.value = editor

    applyDynamicTheme()

    const monaco = (window as any).monaco
    if (monaco) {
      monaco.editor.defineTheme('custom-dark', customTheme)

      // Ensure JSON syntax highlighting works even when caller uses "jsonc".
      // We map to JSON language and allow comments.
      if (props.language === 'jsonc' && monaco.languages?.json?.jsonDefaults?.setDiagnosticsOptions) {
        monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: true,
        })
      }
    }

    maybeLoadViewState()

    if (props.persistViewState) {
      if (typeof editor.onDidChangeCursorPosition === 'function') {
        editor.onDidChangeCursorPosition(() => maybeSaveViewState())
      }
      if (typeof editor.onDidScrollChange === 'function') {
        editor.onDidScrollChange(() => maybeSaveViewState())
      }

      const state = viewState.value
      if (state && typeof editor.restoreViewState === 'function') {
        nextTick(() => {
          editor.restoreViewState(state)
        })
      }
    }

    emit('mount', editor)
  }

  function handleChange(value: string) {
    maybeSaveViewState()
    emit('change', value)
  }

  watch(
    () => props.modelValue,
    (nextValue) => {
      if (lastEmittedModelValue.value === nextValue) {
        lastEmittedModelValue.value = null
        return
      }

      const editor = editorInstance.value
      if (!editor) return
      if (!props.persistViewState) return
      const state = viewState.value
      if (!state) return
      if (typeof editor.restoreViewState !== 'function') return
      nextTick(() => {
        editor.restoreViewState(state)
      })
    },
  )
</script>

<template>
  <div data-slot="code-editor" :class="cn(codeEditorVariants({ variant }), props.class)" class="h-full bg-background">
    <VueMonacoEditor
      v-model:value="modelValue"
      :language="monacoLanguage"
      :theme="editorTheme"
      :options="mergedOptions"
      :height="height"
      :width="width"
      @mount="handleMount"
      @change="handleChange" />
  </div>
</template>
