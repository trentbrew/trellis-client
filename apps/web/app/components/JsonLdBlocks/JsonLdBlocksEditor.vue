<script setup lang="ts">
  import { cn } from '~/lib/utils'
  import type { DatabaseSchema } from '~/types/database'
  import JsonLdBlocksNode from './JsonLdBlocksNode.vue'
  import PropertyPickerDialog from '~/components/dialogs/PropertyPickerDialog.vue'

  type JsonScalarType = 'string' | 'number' | 'boolean' | 'null'
  type JsonContainerType = 'object' | 'array'
  type JsonType = JsonScalarType | JsonContainerType

  interface Props {
    modelValue?: string
    focusIri?: string
    focusPath?: string
    schema?: DatabaseSchema | null
    class?: any
  }

  const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    focusIri: '',
    focusPath: '',
    schema: null,
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    change: [value: string]
    'request-source': []
  }>()

  const parseError = ref<string | null>(null)
  const doc = ref<any>({})
  const lastEmittedValue = ref<string | null>(null)

  const isAddPropertyOpen = ref(false)
  const pendingAddPropertyPath = ref<Array<string | number>>([])

  const stripJsoncComments = (input: string) => {
    const raw = String(input || '')
    const withoutLine = raw.replace(/^\s*\/\/.*$/gm, '')
    return withoutLine.replace(/\/\*[\s\S]*?\*\//g, '')
  }

  const focusPathKey = computed(() => (props.focusPath || '').trim())
  const focusIriKey = computed(() => (props.focusIri || '').trim())

  const rootEl = ref<HTMLElement | null>(null)

  const scrollToTop = () => {
    const el = rootEl.value
    if (!el) return

    try {
      el.scrollTo({ top: 0, behavior: 'auto' })
      el.parentElement?.scrollTo({ top: 0, behavior: 'auto' })
    } catch {
      el.scrollTop = 0
      if (el.parentElement) el.parentElement.scrollTop = 0
    }
  }

  defineExpose({ scrollToTop })

  const tryParse = (value: string) => {
    try {
      const trimmed = (value || '').trim()
      const parsed = trimmed === '' ? {} : JSON.parse(stripJsoncComments(trimmed))
      doc.value = parsed
      parseError.value = null
    } catch (e: any) {
      parseError.value = e?.message ? String(e.message) : 'Invalid JSON'
    }
  }

  watch(
    () => props.modelValue,
    (v) => {
      // Skip re-parsing if this value came from our own emit (prevents cursor jump)
      if (v === lastEmittedValue.value) return
      tryParse(v)
    },
    { immediate: true },
  )

  const scrollToFocused = async () => {
    if (!import.meta.client) return
    await nextTick()

    const el = rootEl.value
    if (!el) return

    const byPath = focusPathKey.value
      ? (el.querySelector(`[data-json-path="${CSS.escape(focusPathKey.value)}"]`) as HTMLElement | null)
      : null

    const byIri =
      !byPath && focusIriKey.value
        ? (el.querySelector(`[data-focus-iri="${CSS.escape(focusIriKey.value)}"]`) as HTMLElement | null)
        : null

    const target = byPath || byIri
    if (!target) return

    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  watch([focusPathKey, focusIriKey, () => parseError.value], () => {
    if (parseError.value) return
    void scrollToFocused()
  })

  const defaultValueForType = (t: JsonType) => {
    if (t === 'object') return {}
    if (t === 'array') return []
    if (t === 'string') return ''
    if (t === 'number') return 0
    if (t === 'boolean') return false
    return null
  }

  const getType = (v: any): JsonType => {
    if (v === null) return 'null'
    if (Array.isArray(v)) return 'array'
    if (typeof v === 'object') return 'object'
    if (typeof v === 'string') return 'string'
    if (typeof v === 'number') return 'number'
    if (typeof v === 'boolean') return 'boolean'
    return 'string'
  }

  const clone = (v: any) => {
    return JSON.parse(JSON.stringify(v))
  }

  const getAtPath = (root: any, path: Array<string | number>) => {
    let cursor: any = root
    for (const key of path) {
      if (cursor === undefined || cursor === null) return undefined
      cursor = cursor[key]
    }
    return cursor
  }

  const setAtPath = (root: any, path: Array<string | number>, next: any) => {
    if (path.length === 0) return next
    const r = clone(root)
    let cursor: any = r
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i]!
      cursor[key] = clone(cursor[key])
      cursor = cursor[key]
    }
    cursor[path[path.length - 1]!] = next
    return r
  }

  const deleteAtPath = (root: any, path: Array<string | number>) => {
    if (path.length === 0) return root
    const parentPath = path.slice(0, -1)
    const last = path[path.length - 1]

    const r = clone(root)
    const parent = parentPath.length === 0 ? r : getAtPath(r, parentPath)
    if (parent === undefined || parent === null) return r

    if (Array.isArray(parent) && typeof last === 'number') {
      parent.splice(last, 1)
      return r
    }

    if (typeof parent !== 'object' || Array.isArray(parent)) return r
    const nextParent = Object.fromEntries(Object.entries(parent).filter(([k]) => k !== String(last)))
    if (parentPath.length === 0) return nextParent
    return setAtPath(r, parentPath, nextParent)
  }

  const addObjectProperty = (root: any, path: Array<string | number>, key: string, value: any) => {
    const target = path.length === 0 ? root : getAtPath(root, path)
    if (!target || typeof target !== 'object' || Array.isArray(target)) return root

    const r = clone(root)
    const container = path.length === 0 ? r : getAtPath(r, path)
    if (!container || typeof container !== 'object' || Array.isArray(container)) return r

    container[key] = value
    return r
  }

  const addArrayItem = (root: any, path: Array<string | number>, value: any) => {
    const target = path.length === 0 ? root : getAtPath(root, path)
    if (!Array.isArray(target)) return root

    const r = clone(root)
    const arr = path.length === 0 ? r : getAtPath(r, path)
    if (!Array.isArray(arr)) return r

    arr.push(value)
    return r
  }

  const renameObjectProperty = (root: any, path: Array<string | number>, nextKey: string) => {
    if (path.length === 0) return root
    const parentPath = path.slice(0, -1)
    const oldKey = String(path[path.length - 1])

    const r = clone(root)
    const parent = parentPath.length === 0 ? r : getAtPath(r, parentPath)
    if (!parent || typeof parent !== 'object' || Array.isArray(parent)) return r

    const desired = String(nextKey || '').trim()
    if (!desired || desired === oldKey) return r

    const value = (parent as any)[oldKey]
    const entries = Object.entries(parent as any)
    const out: Record<string, any> = {}
    for (const [k, v] of entries) {
      if (k === oldKey) {
        let finalKey = desired
        if (finalKey in (parent as any) && finalKey !== oldKey) {
          let i = 2
          while (`${finalKey} (${i})` in (parent as any)) i++
          finalKey = `${finalKey} (${i})`
        }
        out[finalKey] = value
      } else {
        out[k] = v
      }
    }

    if (parentPath.length === 0) return out
    return setAtPath(r, parentPath, out)
  }

  const emitDoc = (nextDoc: any) => {
    doc.value = nextDoc
    const next = JSON.stringify(nextDoc, null, 2)
    lastEmittedValue.value = next
    emit('update:modelValue', next)
    emit('change', next)
  }

  const handleUpdateValue = (path: Array<string | number>, nextValue: any) => {
    emitDoc(setAtPath(doc.value, path, nextValue))
  }

  const handleUpdateType = (path: Array<string | number>, nextType: JsonType) => {
    emitDoc(setAtPath(doc.value, path, defaultValueForType(nextType)))
  }

  const handleDelete = (path: Array<string | number>) => {
    emitDoc(deleteAtPath(doc.value, path))
  }

  const handleAddProperty = (path: Array<string | number>) => {
    pendingAddPropertyPath.value = path
    isAddPropertyOpen.value = true
  }

  const handleAddArrayItem = (path: Array<string | number>) => {
    emitDoc(addArrayItem(doc.value, path, ''))
  }

  const handleRenameKey = (path: Array<string | number>, nextKey: string) => {
    emitDoc(renameObjectProperty(doc.value, path, nextKey))
  }

  const handleConfirmAddProperty = (key: string) => {
    emitDoc(addObjectProperty(doc.value, pendingAddPropertyPath.value, key, ''))
  }
</script>

<template>
  <div
    ref="rootEl"
    :class="cn('h-full w-full px-6 py-4', props.class)"
    :style="{
      '--blocks-sticky-row': '48px',
      '--blocks-sticky-offset': '0px',
    }">
    <UiAlert
      v-if="parseError"
      variant="destructive"
      :title="'Blocks view unavailable'"
      :description="parseError"
      icon="lucide:triangle-alert"
      class="mb-4">
      <template #description>
        <div class="space-y-3">
          <div class="text-sm">{{ parseError }}</div>
          <div>
            <UiButton size="sm" variant="secondary" @click="emit('request-source')">Open Source</UiButton>
          </div>
        </div>
      </template>
    </UiAlert>

    <div v-else class="h-full">
      <JsonLdBlocksNode
        :path="[]"
        :value="doc"
        :type="getType(doc)"
        :depth="0"
        :schema="props.schema"
        :focus-iri="focusIriKey"
        :focus-path="focusPathKey"
        @update:value="handleUpdateValue"
        @update:type="handleUpdateType"
        @delete="handleDelete"
        @add:property="handleAddProperty"
        @add:item="handleAddArrayItem"
        @rename:key="handleRenameKey" />

      <PropertyPickerDialog
        v-model:open="isAddPropertyOpen"
        title="Add property"
        description="Enter a property name."
        placeholder="Property name"
        confirm-label="Add"
        @confirm="handleConfirmAddProperty" />
    </div>
  </div>
</template>
