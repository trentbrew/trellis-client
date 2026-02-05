<script setup lang="ts">
  import type { TypeField, TypeFieldType } from '~/types/database'
  import { SYSTEM_TYPES } from '~/lib/systemTypes'

  definePageMeta({
    title: 'Type Editor',
    layout: 'fullscreen',
    middleware: ['auth'],
  })

  const route = useRoute()
  const typeId = computed(() => String(route.params.id || ''))

  const { currentApp, customTypes, updateCustomType } = useInstantData()

  const titleInputRef = ref<HTMLInputElement | null>(null)
  const descriptionTextareaRef = ref<HTMLTextAreaElement | null>(null)

  const isIconPickerOpen = ref(false)
  const activeTab = ref<'fields' | 'advanced'>('fields')

  const fieldTypes: Array<{ value: TypeFieldType; label: string; icon: string }> = [
    { value: 'text', label: 'Text', icon: 'lucide:type' },
    { value: 'number', label: 'Number', icon: 'lucide:hash' },
    { value: 'select', label: 'Select', icon: 'lucide:list' },
    { value: 'multiselect', label: 'Multi-select', icon: 'lucide:list-checks' },
    { value: 'date', label: 'Date', icon: 'lucide:calendar' },
    { value: 'checkbox', label: 'Checkbox', icon: 'lucide:check-square' },
    { value: 'url', label: 'URL', icon: 'lucide:link' },
    { value: 'email', label: 'Email', icon: 'lucide:mail' },
    { value: 'file', label: 'File', icon: 'lucide:paperclip' },
    { value: 'relation', label: 'Relation', icon: 'lucide:link-2' },
    { value: 'formula', label: 'Formula', icon: 'lucide:function-square' },
  ]

  const type = computed(() => {
    const id = typeId.value
    if (!id) return null
    return (customTypes.value || []).find((t) => t.id === id) || null
  })

  watchEffect(() => {
    if (!type.value) return
    if (!Array.isArray(type.value.fields)) {
      type.value.fields = []
    }
  })

  const isLoading = computed(() => !currentApp.value)
  const isSaving = ref(false)

  const pendingPatch = ref<Record<string, any>>({})

  const persistPatch = async (patch: Record<string, any>) => {
    if (!type.value?.id) return
    isSaving.value = true
    try {
      await updateCustomType(type.value.id, patch)
    } finally {
      isSaving.value = false
    }
  }

  const flushPendingPatch = async () => {
    const patch = pendingPatch.value
    pendingPatch.value = {}
    if (!Object.keys(patch).length) return
    await persistPatch(patch)
  }

  const debouncedFlush = useDebounceFn(() => void flushPendingPatch(), 400)

  const schedulePatch = (patch: Record<string, any>) => {
    pendingPatch.value = { ...pendingPatch.value, ...patch }
    debouncedFlush()
  }

  const lastVisitedKey = computed(() => {
    const appId = currentApp.value?.id
    return appId ? `last-visited-type:${appId}` : ''
  })

  watch(
    [() => currentApp.value?.id, () => type.value?.id],
    () => {
      if (!import.meta.client) return
      if (!type.value?.id) return
      if (!lastVisitedKey.value) return
      try {
        localStorage.setItem(lastVisitedKey.value, type.value.id)
      } catch {
        return
      }
    },
    { immediate: true },
  )

  const onTitleBlur = async () => {
    if (!type.value) return
    await persistPatch({ name: type.value.name })
  }

  const onDescriptionBlur = async () => {
    if (!type.value) return
    await persistPatch({ description: type.value.description })
  }

  const selectIcon = async (icon: string) => {
    if (!type.value) return
    type.value.icon = icon
    await persistPatch({ icon })
    isIconPickerOpen.value = false
  }

  const safeFields = computed<TypeField[]>(() => {
    if (!type.value?.fields) return []
    return type.value.fields
  })

  const extendsOptions = computed(() => {
    const system = SYSTEM_TYPES.map((t) => ({
      value: t.id,
      label: t.name,
      icon: t.icon || 'lucide:box',
      group: 'System',
    }))
    const custom = (customTypes.value || [])
      .filter((t) => t.id !== type.value?.id)
      .map((t) => ({ value: t.id, label: t.name, icon: t.icon || 'lucide:blocks', group: 'Custom' }))
    return [...system, ...custom]
  })

  const extendsSelectValue = computed(() => {
    return type.value?.extends || '__none__'
  })

  const handleExtendsUpdate = (val: unknown) => {
    if (!type.value) return
    const next = val === '__none__' ? undefined : String(val)
    type.value.extends = next
    schedulePatch({ extends: next })
  }

  const addField = () => {
    if (!type.value) return
    const next: TypeField = {
      id: crypto.randomUUID(),
      name: `field_${safeFields.value.length + 1}`,
      type: 'text',
      required: false,
      order: safeFields.value.length,
    }
    type.value.fields = [...safeFields.value, next]
    schedulePatch({ fields: type.value.fields })
  }

  const deleteField = (fieldId: string) => {
    if (!type.value) return
    const next = safeFields.value.filter((f) => f.id !== fieldId).map((f, idx) => ({ ...f, order: idx }))
    type.value.fields = next
    schedulePatch({ fields: next })
  }

  const updateField = (fieldId: string, patch: Partial<TypeField>) => {
    if (!type.value) return
    const next = safeFields.value.map((f) => (f.id === fieldId ? { ...f, ...patch } : f))
    type.value.fields = next
    schedulePatch({ fields: next })
  }
</script>

<template>
  <Page variant="canvas" :fill-height="true" subtitle="Schema Layer" show-back-button>
    <template v-if="type" #header>
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button
              class="bg-foreground/10 hover:bg-accent/80 flex h-10 w-10 items-center justify-center rounded-lg transition"
              @click="isIconPickerOpen = true">
              <Icon :name="type.icon || 'lucide:boxes'" class="h-5 w-5" />
            </button>

            <input
              ref="titleInputRef"
              :value="type.name"
              class="bg-transparent text-3xl font-bold outline-none border-none focus:outline-none focus:ring-0 rounded px-2 -ml-2 inline-block min-w-[100px]"
              placeholder="Untitled"
              @input="
                (e) => {
                  const target = e.target as HTMLInputElement
                  type && (type.name = target.value)
                  target.style.width = 'auto'
                  target.style.width = `${Math.max(100, target.scrollWidth + 10)}px`
                }
              "
              @blur="onTitleBlur" />
          </div>
        </div>

        <div class="ml-0">
          <textarea
            ref="descriptionTextareaRef"
            :value="type.description || ''"
            class="bg-transparent text-sm text-foreground/50 outline-none border-none focus:outline-none focus:ring-0 rounded px-2 -ml-2 max-w-[800px] w-full resize-none overflow-hidden"
            :rows="1"
            placeholder="Add a description..."
            @input="
              (e) => {
                const target = e.target as HTMLTextAreaElement
                type && (type.description = target.value)
                target.style.height = 'auto'
                target.style.height = `${target.scrollHeight}px`
              }
            "
            @blur="onDescriptionBlur" />
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="flex h-full items-center justify-center">
      <UiLoader />
    </div>

    <div v-else-if="!type" class="flex h-full items-center justify-center">
      <div class="text-center">
        <Icon name="lucide:alert-circle" class="text-muted-foreground mx-auto mb-4 h-16 w-16" />
        <h2 class="mb-2 text-2xl font-bold">Type Not Found</h2>
        <UiButton as-child>
          <NuxtLink to="/types">Back to Types</NuxtLink>
        </UiButton>
      </div>
    </div>

    <UiTabs v-else-if="type" v-model="activeTab" class="flex h-full flex-col">
      <div class="shrink-0 border-b border-border">
        <div class="relative px-6 py-3">
          <UiTabsList class="bg-transparent flex-1 justify-start gap-1">
            <UiTabsIndicator />
            <UiTabsTrigger
              value="fields"
              class="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-md">
              <Icon name="lucide:list-tree" class="mr-2 h-4 w-4" />
              Fields
            </UiTabsTrigger>
            <UiTabsTrigger
              value="advanced"
              class="data-[state=active]:bg-transparent data-[state=active]:shadow-none rounded-md">
              <Icon name="lucide:braces" class="mr-2 h-4 w-4" />
              Advanced
            </UiTabsTrigger>
          </UiTabsList>
        </div>
      </div>

      <UiTabsContent value="fields" class="flex-1 overflow-auto">
        <div class="space-y-6 p-6">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <UiLabel>Extends</UiLabel>
              <UiSelect :model-value="extendsSelectValue" @update:model-value="handleExtendsUpdate">
                <UiSelectTrigger class="w-full">
                  <UiSelectValue placeholder="Select a base type" />
                </UiSelectTrigger>
                <UiSelectContent>
                  <UiSelectItem value="__none__">None (Custom Type)</UiSelectItem>
                  <UiSelectItem v-for="opt in extendsOptions" :key="opt.value" :value="opt.value">
                    <div class="flex items-center gap-2">
                      <Icon :name="opt.icon" class="h-4 w-4" />
                      <span class="truncate">{{ opt.label }}</span>
                      <span class="text-muted-foreground ml-auto text-xs">{{ opt.group }}</span>
                    </div>
                  </UiSelectItem>
                </UiSelectContent>
              </UiSelect>
            </div>
            <div class="flex items-end justify-end">
              <UiButton variant="outline" @click="addField">
                <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
                Add field
              </UiButton>
            </div>
          </div>

          <div class="space-y-2">
            <UiLabel>Fields</UiLabel>
            <div
              v-if="safeFields.length === 0"
              class="rounded-lg border border-border p-6 text-center text-muted-foreground">
              No fields yet. Add your first field to define this type.
            </div>
            <div v-else class="space-y-2">
              <div
                v-for="field in safeFields"
                :key="field.id"
                class="hover:bg-accent/50 group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors">
                <Icon name="lucide:grip-vertical" class="text-muted-foreground h-4 w-4" />

                <div class="flex-1 space-y-2">
                  <div class="flex items-center gap-2">
                    <UiInput
                      :model-value="field.name"
                      placeholder="Field name"
                      class="flex-1"
                      @update:model-value="updateField(field.id, { name: String($event) })" />

                    <UiSelect
                      :model-value="field.type"
                      @update:model-value="updateField(field.id, { type: $event as TypeFieldType })">
                      <UiSelectTrigger class="w-[180px]">
                        <UiSelectValue />
                      </UiSelectTrigger>
                      <UiSelectContent>
                        <UiSelectItem v-for="t in fieldTypes" :key="t.value" :value="t.value">
                          <div class="flex items-center gap-2">
                            <Icon :name="t.icon" class="h-4 w-4" />
                            {{ t.label }}
                          </div>
                        </UiSelectItem>
                      </UiSelectContent>
                    </UiSelect>

                    <UiButton
                      variant="ghost"
                      size="icon"
                      class="opacity-0 group-hover:opacity-100"
                      @click="deleteField(field.id)">
                      <Icon name="lucide:trash-2" class="h-4 w-4" />
                    </UiButton>
                  </div>

                  <div class="flex items-center gap-4">
                    <label class="flex items-center gap-2 text-sm">
                      <UiCheckbox
                        :checked="field.required"
                        @update:checked="updateField(field.id, { required: Boolean($event) })" />
                      Required
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span v-if="isSaving" class="text-muted-foreground text-xs">Saving…</span>
            <span v-else class="text-muted-foreground text-xs">Saved</span>
          </div>
        </div>
      </UiTabsContent>

      <UiTabsContent value="advanced" class="flex-1 overflow-auto">
        <div class="space-y-4 p-6">
          <UiLabel>Raw JSON</UiLabel>
          <pre class="bg-muted/40 rounded-lg border border-border p-4 text-xs overflow-auto">{{
            JSON.stringify(type, null, 2)
          }}</pre>
        </div>
      </UiTabsContent>
    </UiTabs>

    <IconPicker v-model:open="isIconPickerOpen" :model-value="type?.icon || ''" @update:model-value="selectIcon" />
  </Page>
</template>
