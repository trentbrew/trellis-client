<script lang="ts" setup>
  import type { EntityType, PropertyFieldId } from '~/types/entity'
  import {
    fieldDisplayIcon,
    getSidebarSchemaFields,
    schemaFieldToPropertyFieldId,
    titleCaseFieldName,
  } from '~/lib/ontology-sidebar-fields'

  const editableItem = defineModel<any>('editableItem', { required: true })
  const selectedRepeat = defineModel<string>('selectedRepeat', { default: 'none' })

  const props = defineProps<{
    hasField: (_fieldId: PropertyFieldId) => boolean
    isViewMode: boolean
    isDark: boolean
    owners: { id: string; name: string }[]
    folders: string[]
    scheduleDescription: {
      scheduleText: string
      statusText: string
      isOverdue: boolean
      isRecurring: boolean
    }
  }>()

  const { getEntityConfig } = useOntologyRegistry()

  const dateOpen = ref(false)
  const involvedOpen = ref(false)
  const involvedSearch = ref('')

  const typeConfig = computed(() => getEntityConfig(editableItem.value?.type as EntityType))

  const schemaFields = computed(() => {
    const config = typeConfig.value
    if (!config || !('fields' in config) || !Array.isArray(config.fields)) return []
    return getSidebarSchemaFields(config.fields)
  })

  const sidebarFields = computed(() =>
    schemaFields.value.filter((field) => {
      if (field.name === 'startDate') return props.hasField('startDate')
      if (field.name === 'involved') return props.hasField('involved')
      const propertyFieldId = schemaFieldToPropertyFieldId(field.name)
      if (propertyFieldId) return props.hasField(propertyFieldId)
      return true
    }),
  )

  const createdByName = computed(() => {
    const id = editableItem.value.createdBy || editableItem.value.ownerId
    if (!id) return undefined
    return props.owners.find((owner) => owner.id === id)?.name
  })

  const filteredInvolved = computed(() => {
    if (!involvedSearch.value) return props.owners
    const query = involvedSearch.value.toLowerCase()
    return props.owners.filter((owner) => owner.name.toLowerCase().includes(query))
  })

  function formatTimestamp(raw: string | number | undefined) {
    if (!raw) return null
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const createdAtFormatted = computed(() => formatTimestamp(editableItem.value.createdAt))
  const updatedAtFormatted = computed(() => formatTimestamp(editableItem.value.updatedAt))

  function toggleInvolved(userId: string) {
    const current: string[] = editableItem.value.involved ?? (editableItem.value.involved = [])
    const index = current.indexOf(userId)
    if (index === -1) current.push(userId)
    else current.splice(index, 1)
  }

  function usesPropertyFieldEditor(fieldName: string): PropertyFieldId | null {
    if (fieldName === 'startDate' || fieldName === 'involved') return null
    const propertyFieldId = schemaFieldToPropertyFieldId(fieldName)
    if (!propertyFieldId || !props.hasField(propertyFieldId)) return null
    return propertyFieldId
  }
</script>

<template>
  <div class="flex flex-col pt-3 divide-y divide-border/50">
    <template v-for="field in sidebarFields" :key="field.name">
      <!-- Schedule row (temporal entities) -->
      <div
        v-if="field.name === 'startDate' && props.hasField('startDate')"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:calendar" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Date</span>
        <UiPopover v-model:open="dateOpen">
          <UiPopoverTrigger as-child>
            <button
              class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors text-left"
              :class="[
                scheduleDescription.isOverdue
                  ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                  : editableItem.startDate
                    ? 'bg-muted/50 hover:bg-muted'
                    : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30',
              ]">
              <Icon
                :name="scheduleDescription.isRecurring ? 'lucide:repeat' : 'lucide:calendar'"
                class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{{ scheduleDescription.scheduleText }}</span>
              <span v-if="scheduleDescription.statusText" class="opacity-70 truncate">
                ({{ scheduleDescription.statusText }})
              </span>
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-80 p-0 max-h-[480px] overflow-y-auto">
            <EntityScheduleSidebar
              v-model:editable-item="editableItem"
              v-model:selected-repeat="selectedRepeat"
              :has-field="props.hasField"
              :is-view-mode="props.isViewMode"
              :is-dark="props.isDark" />
          </UiPopoverContent>
        </UiPopover>
      </div>

      <!-- Involved (multi-person) -->
      <div v-else-if="field.name === 'involved'" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon name="lucide:users" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Involved</span>
        <UiPopover v-model:open="involvedOpen">
          <UiPopoverTrigger as-child>
            <button
              class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors text-left"
              :class="
                editableItem.involved?.length
                  ? 'bg-muted/50 hover:bg-muted'
                  : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
              ">
              <Icon name="lucide:users" class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">
                {{ editableItem.involved?.length ? `${editableItem.involved.length} people` : 'No one' }}
              </span>
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-56 p-1 max-h-64 overflow-hidden">
            <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
              <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                v-model="involvedSearch"
                type="text"
                placeholder="Search..."
                class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
            </div>
            <div class="overflow-y-auto max-h-52">
              <button
                v-for="owner in filteredInvolved"
                :key="owner.id"
                type="button"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="toggleInvolved(owner.id)">
                <Icon
                  :name="editableItem.involved?.includes(owner.id) ? 'lucide:check-square' : 'lucide:square'"
                  class="h-3.5 w-3.5"
                  :class="editableItem.involved?.includes(owner.id) ? 'text-primary' : 'text-muted-foreground'" />
                <span class="flex-1 truncate">{{ owner.name }}</span>
              </button>
            </div>
          </UiPopoverContent>
        </UiPopover>
      </div>

      <!-- Registry-backed fields (status, priority, owner, etc.) -->
      <div
        v-else-if="usesPropertyFieldEditor(field.name)"
        class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
        <Icon :name="fieldDisplayIcon(field)" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">
          {{ titleCaseFieldName(field.name === 'taskStatus' ? 'status' : field.name) }}
        </span>
        <EntityFieldEditor
          :field-id="usesPropertyFieldEditor(field.name)!"
          :model-value="editableItem[field.name]"
          :entity-type="editableItem.type"
          :owners="owners"
          :readonly="isViewMode"
          @update:model-value="editableItem[field.name] = $event" />
      </div>

      <!-- Ontology-native fields (email, phone, avatar, jobTitle, …) -->
      <OntologySchemaFieldRow
        v-else
        :field="field"
        :model-value="editableItem[field.name]"
        :is-view-mode="isViewMode"
        :owners="owners"
        @update:model-value="editableItem[field.name] = $event" />
    </template>

    <!-- Audit trail -->
    <div class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2 border-t border-border/50" title="Read-only">
      <Icon name="lucide:calendar-plus" class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Created at
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground truncate">
        {{ createdAtFormatted || '—' }}
      </span>
    </div>

    <div class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2" title="Read-only">
      <Icon name="lucide:user-check" class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Created by
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground">
        <template v-if="createdByName">
          <div
            class="w-4 h-4 rounded-full bg-muted-foreground/15 flex items-center justify-center text-[8px] font-medium shrink-0">
            {{ createdByName.slice(0, 2).toUpperCase() }}
          </div>
          <span class="truncate">{{ createdByName }}</span>
        </template>
        <span v-else>—</span>
      </span>
    </div>

    <div class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2" title="Read-only">
      <Icon name="lucide:history" class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Last edited
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground truncate">
        {{ updatedAtFormatted || '—' }}
      </span>
    </div>
  </div>
</template>
