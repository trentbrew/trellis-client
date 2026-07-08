import type { Ref } from 'vue'
import {
  buildViewFieldCatalog,
  defaultVisibleKeys,
  loadViewFieldsState,
  moveViewFieldKey,
  saveViewFieldsState,
  toggleViewFieldKey,
  type ViewFieldsState,
} from '~/lib/view-field-catalog'
import { useOntologyRegistry } from '~/composables/useOntologyRegistry'

/**
 * Persisted view-field visibility for browse card projections.
 * Merges builtin card properties with ontology-backed columns per entity type.
 */
export function useViewFields(storageKey: Ref<string>, entityType: Ref<string>) {
  const { getBrowseConfig } = useOntologyRegistry()

  const catalog = computed(() => {
    const type = entityType.value
    if (!type || type === 'all') {
      return buildViewFieldCatalog('all')
    }
    const cols = getBrowseConfig(type).tableColumns.map((col) => ({
      key: col.key,
      label: col.label,
      valueType: col.valueType,
      isTitle: col.isTitle,
    }))
    return buildViewFieldCatalog(type, cols)
  })

  const state = ref<ViewFieldsState>({
    visible: [],
    showEmpty: false,
  })

  watch(
    [storageKey, catalog, entityType],
    ([key, cat, type]) => {
      state.value = loadViewFieldsState(key, cat, type)
    },
    { immediate: true },
  )

  watch(
    state,
    (next) => {
      saveViewFieldsState(storageKey.value, next)
    },
    { deep: true },
  )

  const visibleFields = computed(() => state.value.visible)
  const showEmptyProperties = computed(() => state.value.showEmpty)

  const hiddenCount = computed(() => Math.max(0, catalog.value.length - state.value.visible.length))

  const builtinOptions = computed(() => catalog.value.filter((f) => f.source === 'builtin'))
  const ontologyOptions = computed(() => catalog.value.filter((f) => f.source === 'ontology'))

  function setVisible(key: string, on: boolean) {
    state.value = {
      ...state.value,
      visible: toggleViewFieldKey(state.value.visible, key, on, catalog.value),
    }
  }

  function move(key: string, direction: -1 | 1) {
    state.value = {
      ...state.value,
      visible: moveViewFieldKey(state.value.visible, key, direction),
    }
  }

  function setShowEmpty(on: boolean) {
    state.value = { ...state.value, showEmpty: on }
  }

  function reset() {
    state.value = {
      visible: defaultVisibleKeys(catalog.value, entityType.value),
      showEmpty: false,
    }
  }

  /** Catalog entries in visible order, then hidden — for popover display. */
  const popoverFields = computed(() => {
    const cat = catalog.value
    const byKey = new Map(cat.map((f) => [f.key, f]))
    const orderedVisible = state.value.visible
      .map((k) => byKey.get(k))
      .filter((f): f is (typeof cat)[number] => !!f)
    const hidden = cat.filter((f) => !state.value.visible.includes(f.key))
    return [...orderedVisible, ...hidden]
  })

  return {
    catalog,
    popoverFields,
    builtinOptions,
    ontologyOptions,
    visibleFields,
    showEmptyProperties,
    hiddenCount,
    setVisible,
    move,
    setShowEmpty,
    reset,
  }
}
