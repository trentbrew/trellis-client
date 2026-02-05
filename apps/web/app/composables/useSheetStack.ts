import { ref, computed, inject, provide, type Ref } from 'vue'

const SHEET_STACK_KEY = Symbol('sheet-stack')

export interface SheetState {
  id: string
}

export function provideSheetStack() {
  const stack = ref<SheetState[]>([])
  provide(SHEET_STACK_KEY, stack)
  return stack
}

export function useSheetStack() {
  const stack = inject<Ref<SheetState[]>>(SHEET_STACK_KEY, ref([]))

  const register = (id: string) => {
    if (!stack.value.find((s) => s.id === id)) {
      stack.value.push({ id })
    }
  }

  const unregister = (id: string) => {
    const index = stack.value.findIndex((s) => s.id === id)
    if (index !== -1) {
      stack.value.splice(index, 1)
    }
  }

  const depth = computed(() => stack.value.length)
  const isNested = computed(() => stack.value.length > 1)

  return {
    stack,
    depth,
    isNested,
    register,
    unregister,
  }
}
