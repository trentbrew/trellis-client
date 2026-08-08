<script setup lang="ts">
  import { parseTurtleIri, routeForTurtleIri } from '~/lib/ontology'
  import type { DatabaseField, DatabaseSchema } from '~/types/database'

  const CLEAR_SELECT_VALUE = '__clear__'

  type JsonScalarType = 'string' | 'number' | 'boolean' | 'null'
  type JsonContainerType = 'object' | 'array'
  type JsonType = JsonScalarType | JsonContainerType

  interface Props {
    path: Array<string | number>
    value: any
    type: JsonType
    depth: number
    name?: string
    isArrayItem?: boolean
    focusIri?: string
    focusPath?: string
    schema?: DatabaseSchema | null
  }

  const props = withDefaults(defineProps<Props>(), {
    name: '',
    isArrayItem: false,
    focusIri: '',
    focusPath: '',
    schema: null,
  })

  const emit = defineEmits<{
    'update:value': [path: Array<string | number>, nextValue: any]
    'update:type': [path: Array<string | number>, nextType: JsonType]
    delete: [path: Array<string | number>]
    'rename:key': [path: Array<string | number>, nextKey: string]
    'add:property': [path: Array<string | number>]
    'add:item': [path: Array<string | number>]
  }>()

  const isContainer = computed(() => props.type === 'object' || props.type === 'array')
  const isObject = computed(() => props.type === 'object')
  const isArray = computed(() => props.type === 'array')

  const schemaField = computed<DatabaseField | null>(() => {
    if (!props.schema || !Array.isArray(props.schema.fields)) return null
    if (props.depth === 0) return null
    if (props.isArrayItem) return null
    if (isCommentNode.value) return null

    const key = String(props.name || '').trim()
    if (!key) return null

    if (key.startsWith('user:')) {
      const id = key.slice('user:'.length)
      const byId = props.schema.fields.find((f) => f.id === id)
      if (byId) return byId
    }

    const byId = props.schema.fields.find((f) => f.id === key)
    if (byId) return byId

    const byName = props.schema.fields.find((f) => f.name === key)
    if (byName) return byName

    return null
  })

  const isSchemaFieldNode = computed(() => !!schemaField.value)

  const isCommentNode = computed(() => {
    if (props.depth === 0) return false
    if (props.isArrayItem) return false
    const n = (props.name || '').trim()
    return n.startsWith('//')
  })

  const route = useRoute()
  const toast = useNuxtApp().$toast as any

  const pathKey = computed(() => JSON.stringify(props.path))
  const isFocusedByPath = computed(() => {
    const fp = (props.focusPath || '').trim()
    if (!fp) return false
    return fp === pathKey.value
  })

  const isFocusedByIri = computed(() => {
    const fi = (props.focusIri || '').trim()
    if (!fi) return false
    if (props.type === 'string' && typeof props.value === 'string') return props.value === fi
    if (props.type === 'object' && props.value && typeof props.value === 'object' && !Array.isArray(props.value)) {
      const id = (props.value as any)['@id']
      return typeof id === 'string' && id === fi
    }
    return false
  })

  const isFocused = computed(() => isFocusedByPath.value || isFocusedByIri.value)

  const rowIndentStyle = computed(() => {
    const base: Record<string, any> = { paddingLeft: `${props.depth * 16}px` }

    if (!isContainer.value) return base

    return {
      ...base,
      position: 'sticky',
      top: `calc(var(--blocks-sticky-offset, 0px) + ${props.depth} * var(--blocks-sticky-row, 44px))`,
      zIndex: 50 - props.depth,
    }
  })

  const typeOptions: Array<{ value: JsonType; label: string; icon: string }> = [
    { value: 'object', label: 'object', icon: 'lucide:braces' },
    { value: 'array', label: 'array', icon: 'lucide:brackets' },
    { value: 'string', label: 'string', icon: 'lucide:type' },
    { value: 'number', label: 'number', icon: 'lucide:hash' },
    { value: 'boolean', label: 'boolean', icon: 'lucide:toggle-left' },
    { value: 'null', label: 'null', icon: 'lucide:circle-slash' },
  ]

  const scalarString = computed(() => {
    if (props.type === 'null') return 'null'
    if (props.type === 'boolean') return props.value ? 'true' : 'false'
    if (props.type === 'number') return Number.isFinite(props.value) ? String(props.value) : '0'
    return typeof props.value === 'string' ? props.value : ''
  })

  const schemaFieldValue = computed(() => {
    const f = schemaField.value
    if (!f) return undefined
    return props.value
  })

  const schemaDateModel = computed<Date | null>(() => {
    const f = schemaField.value
    if (!f || f.type !== 'date') return null
    const v = schemaFieldValue.value
    if (v === null || v === undefined || v === '') return null
    const d = v instanceof Date ? v : new Date(v as any)
    return Number.isFinite(d.getTime()) ? d : null
  })

  const updateSchemaValue = (next: any) => {
    emit('update:value', props.path, next)
  }

  const updateSchemaSelect = (v: unknown) => {
    const next = String(v ?? '')
    updateSchemaValue(next === CLEAR_SELECT_VALUE ? '' : next)
  }

  const updateSchemaMultiselect = (v: unknown) => {
    if (Array.isArray(v)) {
      updateSchemaValue(v.map((x) => String(x)).filter((s) => s.trim() !== ''))
      return
    }
    const asString = String(v ?? '')
    updateSchemaValue(
      asString
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }

  const updateSchemaNumber = (v: unknown) => {
    const n = Number(v)
    updateSchemaValue(Number.isFinite(n) ? n : 0)
  }

  const updateSchemaDate = (v: unknown) => {
    if (!v) {
      updateSchemaValue(null)
      return
    }
    const d = v instanceof Date ? v : new Date(v as any)
    updateSchemaValue(Number.isFinite(d.getTime()) ? d.getTime() : null)
  }

  const relationTarget = computed(() => {
    if (props.type !== 'string') return null
    const v = typeof props.value === 'string' ? props.value : ''
    const parsed = parseTurtleIri(v)
    if (!parsed) return null
    const route = routeForTurtleIri(v)
    if (!route) return null
    return { iri: v, route, parsed }
  })

  const isTurtleCollectionLink = computed(() => {
    return relationTarget.value?.parsed?.kind === 'collection'
  })

  const openRelation = async () => {
    const target = relationTarget.value
    if (!target) return

    await navigateTo({ path: target.route, query: { focusIri: target.iri } })
  }

  const onScalarLinkClick = async (e: MouseEvent) => {
    if (!isTurtleCollectionLink.value) return
    if (!(e.metaKey || e.ctrlKey)) return

    e.preventDefault()
    e.stopPropagation()
    await openRelation()
  }

  const onScalarLinkDblClick = async (e: MouseEvent) => {
    if (!isTurtleCollectionLink.value) return

    e.preventDefault()
    e.stopPropagation()
    await openRelation()
  }

  const copyFocusLink = async () => {
    if (!import.meta.client) return

    const query: Record<string, any> = { ...(route.query || {}) }
    query.focusPath = pathKey.value

    if (relationTarget.value?.iri) {
      query.focusIri = relationTarget.value.iri
    }

    const url = `${window.location.origin}${route.path}?${new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
        .map(([k, v]) => [k, String(v)]),
    ).toString()}`

    try {
      await navigator.clipboard.writeText(url)
      toast?.success?.('Copied focus link')
    } catch (e) {
      console.error('Failed to copy focus link:', e)
      toast?.error?.('Failed to copy focus link')
    }
  }

  const onScalarInput = (value: unknown) => {
    const v = value === null || value === undefined ? '' : String(value)

    if (props.type === 'number') {
      const n = Number(v)
      emit('update:value', props.path, Number.isFinite(n) ? n : 0)
      return
    }
    if (props.type === 'boolean') {
      emit('update:value', props.path, v === 'true')
      return
    }
    if (props.type === 'null') {
      emit('update:value', props.path, null)
      return
    }
    emit('update:value', props.path, v)
  }

  const objectEntries = computed(() => {
    if (!isObject.value) return [] as Array<[string, any]>
    const v = props.value && typeof props.value === 'object' ? props.value : {}
    return Object.entries(v)
  })

  const arrayItems = computed(() => {
    if (!isArray.value) return [] as any[]
    return Array.isArray(props.value) ? props.value : []
  })

  const detectType = (v: any): JsonType => {
    if (v === null) return 'null'
    if (Array.isArray(v)) return 'array'
    if (typeof v === 'object') return 'object'
    if (typeof v === 'string') return 'string'
    if (typeof v === 'number') return 'number'
    if (typeof v === 'boolean') return 'boolean'
    return 'string'
  }

  const headerLabel = computed(() => {
    if (props.depth === 0) return '$'
    if (props.isArrayItem) return `[${props.name}]`
    return props.name
  })
</script>

<template>
  <UiCollapsible :default-open="props.depth < 2" class="group/collapsible w-full">
    <div
      v-if="isCommentNode"
      class="group flex w-full items-center gap-3 rounded-md border px-3 py-2 transition-colors bg-muted/20 border-border/60"
      :style="rowIndentStyle"
      :data-json-path="pathKey">
      <div class="min-w-0 flex-1">
        <UiInput
          :model-value="props.name"
          class="h-8 bg-background/50 font-mono text-xs"
          @update:model-value="(v) => emit('rename:key', props.path, String(v ?? ''))" />
      </div>

      <UiButton
        size="icon"
        variant="ghost"
        class="h-8 w-8 opacity-0 group-hover:opacity-100"
        aria-label="Delete comment"
        @click="emit('delete', props.path)">
        <Icon name="lucide:trash-2" class="h-4 w-4 text-destructive" />
      </UiButton>
    </div>

    <div
      v-else
      class="group flex w-full items-center gap-3 rounded-md border px-3 py-2 transition-colors group-data-[state=open]/collapsible:shadow-sm group-data-[state=closed]/collapsible:opacity-90"
      :style="rowIndentStyle"
      :data-json-path="pathKey"
      :data-focus-iri="isFocusedByIri ? props.focusIri || '' : null"
      :class="{
        'ring-2 ring-primary/40 backdrop-blur-2xl': isFocused,
        'bg-card/30 backdrop-blur-2xl border-border': props.depth === 0,
        'bg-card/20 backdrop-blur-2xl border-border/80': props.depth === 1,
        'bg-card/10 backdrop-blur-2xl border-border/60': props.depth >= 2,
      }">
      <UiCollapsibleTrigger as-child>
        <button
          type="button"
          class="text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md hover:bg-foreground/5 transition"
          :class="{ 'opacity-0 pointer-events-none': !isContainer }">
          <Icon
            :name="'lucide:chevron-down'"
            class="h-4 w-4 -rotate-90 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-0" />
        </button>
      </UiCollapsibleTrigger>

      <div class="flex min-w-0 flex-1 items-center gap-2">
        <div class="w-fit">
          <div v-if="isSchemaFieldNode" class="h-8 px-2 rounded-md border bg-background/50 flex items-center">
            <div class="text-xs font-mono text-muted-foreground">{{ schemaField?.type }}</div>
          </div>
          <UiSelect
            v-else
            :model-value="props.type"
            @update:model-value="(v) => emit('update:type', props.path, (v ?? 'string') as any)">
            <UiSelectTrigger size="sm" class="h-8">
              <UiSelectValue />
            </UiSelectTrigger>
            <UiSelectContent>
              <UiSelectItem v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                <div class="flex items-center gap-2">
                  <Icon :name="opt.icon" class="h-4 w-4" />
                  {{ opt.label }}
                </div>
              </UiSelectItem>
            </UiSelectContent>
          </UiSelect>
        </div>

        <div class="min-w-[120px] max-w-[240px] flex-1">
          <UiInput
            v-if="props.depth > 0 && !props.isArrayItem"
            :model-value="props.name"
            disabled
            class="h-8 bg-background/50" />
          <div v-else class="text-sm font-medium truncate">{{ headerLabel }}</div>
        </div>

        <div v-if="!isContainer" class="flex flex-1 items-center gap-2">
          <div class="flex-1">
            <template v-if="isSchemaFieldNode && schemaField">
              <template v-if="schemaField.type === 'formula'">
                <div class="flex h-8 items-center gap-2 rounded-md border bg-background/50 px-2">
                  <Icon name="lucide:zap" class="h-3.5 w-3.5 text-amber-500" />
                  <div class="text-xs text-muted-foreground italic truncate">computed</div>
                </div>
              </template>

              <template v-else-if="schemaField.type === 'checkbox'">
                <div class="flex h-8 items-center">
                  <UiSwitch :checked="!!schemaFieldValue" @update:checked="(v: boolean) => updateSchemaValue(!!v)" />
                </div>
              </template>

              <template v-else-if="schemaField.type === 'select'">
                <UiSelect :model-value="String(schemaFieldValue ?? '')" @update:model-value="updateSchemaSelect">
                  <UiSelectTrigger size="sm" class="h-8 bg-background/50">
                    <UiSelectValue placeholder="Select" />
                  </UiSelectTrigger>
                  <UiSelectContent>
                    <UiSelectItem :value="CLEAR_SELECT_VALUE">—</UiSelectItem>
                    <UiSelectItem v-for="opt in schemaField.options || []" :key="opt.value" :value="opt.value">
                      {{ opt.value }}
                    </UiSelectItem>
                  </UiSelectContent>
                </UiSelect>
              </template>

              <template v-else-if="schemaField.type === 'multiselect'">
                <UiInput
                  :model-value="Array.isArray(schemaFieldValue) ? (schemaFieldValue as any[]).join(', ') : ''"
                  class="h-8 bg-background/50"
                  placeholder="Comma-separated"
                  @update:model-value="updateSchemaMultiselect" />
              </template>

              <template v-else-if="schemaField.type === 'date'">
                <UiDatepicker :model-value="schemaDateModel" @update:model-value="updateSchemaDate">
                  <template #default="{ inputValue, inputEvents }">
                    <UiInput
                      class="h-8 bg-background/50"
                      :model-value="inputValue"
                      placeholder="Pick a date"
                      v-on="inputEvents" />
                  </template>
                </UiDatepicker>
              </template>

              <template v-else-if="schemaField.type === 'number'">
                <UiInput
                  :model-value="Number.isFinite(schemaFieldValue as any) ? String(schemaFieldValue) : ''"
                  class="h-8 bg-background/50 font-mono"
                  inputmode="decimal"
                  @update:model-value="updateSchemaNumber" />
              </template>

              <template v-else>
                <UiInput
                  :model-value="String(schemaFieldValue ?? '')"
                  class="h-8 bg-background/50 font-mono"
                  :class="
                    schemaField.type === 'relation' && isTurtleCollectionLink
                      ? 'text-primary underline decoration-primary/40 underline-offset-2 cursor-pointer'
                      : ''
                  "
                  :title="
                    schemaField.type === 'relation' && isTurtleCollectionLink
                      ? 'Cmd/Ctrl+Click to open relation'
                      : undefined
                  "
                  @click="schemaField.type === 'relation' ? onScalarLinkClick : undefined"
                  @dblclick="schemaField.type === 'relation' ? onScalarLinkDblClick : undefined"
                  @update:model-value="(v) => updateSchemaValue(String(v ?? ''))" />
              </template>
            </template>

            <template v-else>
              <UiInput
                v-if="props.type !== 'boolean'"
                :model-value="scalarString"
                class="h-8 bg-background/50 font-mono"
                :class="
                  isTurtleCollectionLink
                    ? 'text-primary underline decoration-primary/40 underline-offset-2 cursor-pointer'
                    : ''
                "
                :title="isTurtleCollectionLink ? 'Cmd/Ctrl+Click to open relation' : undefined"
                @click="onScalarLinkClick"
                @dblclick="onScalarLinkDblClick"
                @update:model-value="onScalarInput" />
              <UiSelect v-else :model-value="scalarString" @update:model-value="onScalarInput">
                <UiSelectTrigger size="sm" class="h-8">
                  <UiSelectValue />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="true">true</UiSelectItem>
                  <UiSelectItem value="false">false</UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </template>
          </div>

          <UiButton
            v-if="
              (isSchemaFieldNode && schemaField?.type === 'relation' && relationTarget) ||
              (!isSchemaFieldNode && relationTarget)
            "
            size="icon"
            variant="secondary"
            class="h-8 w-8"
            aria-label="Open relation"
            @click.stop="openRelation">
            <Icon name="lucide:arrow-up-right" class="h-4 w-4" />
          </UiButton>

          <UiButton
            size="icon"
            variant="ghost"
            class="h-8 w-8"
            aria-label="Copy focus link"
            @click.stop="copyFocusLink">
            <Icon name="lucide:link" class="h-4 w-4" />
          </UiButton>
        </div>

        <div class="flex items-center gap-1">
          <UiButton
            v-if="isObject"
            size="sm"
            variant="ghost"
            class="h-8 text-muted-foreground hover:text-foreground"
            @click="emit('add:property', props.path)">
            <Icon name="lucide:plus" class="mr-1 h-4 w-4" />
            Add
          </UiButton>

          <UiButton
            v-if="isArray"
            size="sm"
            variant="ghost"
            class="h-8 text-muted-foreground hover:text-foreground"
            @click="emit('add:item', props.path)">
            <Icon name="lucide:plus" class="mr-1 h-4 w-4" />
            Add
          </UiButton>

          <UiButton
            v-if="props.depth > 0"
            size="icon"
            variant="ghost"
            class="h-8 w-8 opacity-0 group-hover:opacity-100"
            @click="emit('delete', props.path)">
            <Icon name="lucide:trash-2" class="h-4 w-4 text-destructive" />
          </UiButton>
        </div>
      </div>
    </div>

    <UiCollapsibleContent
      v-if="isContainer"
      class="mt-2 space-y-2 border-l border-border/30 pl-3 ml-2 group-data-[state=closed]/collapsible:hidden">
      <div v-if="isObject" class="space-y-2">
        <JsonLdBlocksNode
          v-for="([k, v], idx) in objectEntries"
          :key="k + ':' + idx"
          :name="k"
          :path="[...props.path, k]"
          :value="v"
          :type="detectType(v)"
          :depth="props.depth + 1"
          :schema="props.schema"
          :focus-iri="props.focusIri"
          :focus-path="props.focusPath"
          @update:value="(...args) => emit('update:value', ...args)"
          @update:type="(...args) => emit('update:type', ...args)"
          @delete="emit('delete', $event)"
          @add:property="emit('add:property', $event)"
          @add:item="emit('add:item', $event)" />
      </div>

      <div v-else class="space-y-2">
        <JsonLdBlocksNode
          v-for="(v, i) in arrayItems"
          :key="i"
          :name="String(i)"
          :path="[...props.path, i]"
          :value="v"
          :type="detectType(v)"
          :depth="props.depth + 1"
          :is-array-item="true"
          :schema="props.schema"
          :focus-iri="props.focusIri"
          :focus-path="props.focusPath"
          @update:value="(...args) => emit('update:value', ...args)"
          @update:type="(...args) => emit('update:type', ...args)"
          @delete="emit('delete', $event)"
          @add:property="emit('add:property', $event)"
          @add:item="emit('add:item', $event)" />
      </div>
    </UiCollapsibleContent>
  </UiCollapsible>
</template>
