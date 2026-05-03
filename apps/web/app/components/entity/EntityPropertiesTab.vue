<script lang="ts" setup>
  import type { Priority, Urgency, TaskStatus, PropertyFieldId } from '~/types/entity'
  import { PRIORITY_OPTIONS, URGENCY_OPTIONS, CATEGORY_OPTIONS, TASK_STATUS_OPTIONS } from '~/types/entity'
  import { useEntityFormulas } from '~/composables/useEntityFormulas'

  const editableItem = defineModel<any>('editableItem', { required: true })
  const selectedRepeat = defineModel<string>('selectedRepeat', { default: 'none' })

  const props = defineProps<{
    hasField: (_fieldId: PropertyFieldId) => boolean
    isViewMode: boolean
    isDark: boolean
    owners: { id: string; name: string }[]
    folders: string[]
    scheduleDescription: { scheduleText: string; statusText: string; isOverdue: boolean; isRecurring: boolean }
  }>()

  const { applyFormulas } = useEntityFormulas()
  const { user: currentUser } = useInstantAuth()

  // Popover open states
  const dateOpen = ref(false)
  const statusOpen = ref(false)
  const priorityOpen = ref(false)
  const urgencyOpen = ref(false)
  const ownerOpen = ref(false)
  const involvedOpen = ref(false)
  const categoryOpen = ref(false)
  const folderOpen = ref(false)

  const ownerSearch = ref('')
  const folderSearch = ref('')
  const involvedSearch = ref('')

  const currentPriority = computed(() => PRIORITY_OPTIONS.find((p) => p.value === editableItem.value.priority))
  const currentUrgency = computed(() => URGENCY_OPTIONS.find((u) => u.value === editableItem.value.urgency))
  const currentCategory = computed(() => CATEGORY_OPTIONS.find((c) => c.value === editableItem.value.category))
  const currentStatus = computed(() => TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.value.taskStatus))
  const ownerName = computed(() => props.owners.find((o) => o.id === editableItem.value.owner)?.name)
  const createdByName = computed(() => {
    const id = editableItem.value.createdBy || editableItem.value.ownerId
    if (!id) return undefined
    return props.owners.find((o) => o.id === id)?.name
  })

  const filteredOwners = computed(() => {
    let list = props.owners
    if (ownerSearch.value) {
      const s = ownerSearch.value.toLowerCase()
      list = list.filter((o) => o.name.toLowerCase().includes(s))
    }
    if (currentUser.value?.id) {
      const uid = currentUser.value.id
      list = [...list].sort((a, b) => (a.id === uid ? -1 : b.id === uid ? 1 : 0))
    }
    return list
  })

  const filteredInvolved = computed(() => {
    if (!involvedSearch.value) return props.owners
    const s = involvedSearch.value.toLowerCase()
    return props.owners.filter((o) => o.name.toLowerCase().includes(s))
  })

  const filteredFolders = computed(() => {
    if (!folderSearch.value) return props.folders
    const s = folderSearch.value.toLowerCase()
    return props.folders.filter((f) => f.toLowerCase().includes(s))
  })

  const setPriority = (v: Priority) => {
    editableItem.value.priority = v
    editableItem.value.priorityOverride = true
    priorityOpen.value = false
  }
  const resetPriority = () => {
    editableItem.value.priorityOverride = false
    applyFormulas(editableItem.value)
    priorityOpen.value = false
  }
  const setUrgency = (v: Urgency) => {
    editableItem.value.urgency = v
    editableItem.value.urgencyOverride = true
    urgencyOpen.value = false
  }
  const resetUrgency = () => {
    editableItem.value.urgencyOverride = false
    applyFormulas(editableItem.value)
    urgencyOpen.value = false
  }
  const toggleInvolved = (uid: string) => {
    const arr: string[] = editableItem.value.involved ?? (editableItem.value.involved = [])
    const i = arr.indexOf(uid)
    if (i === -1) arr.push(uid)
    else arr.splice(i, 1)
  }

  const formatTimestamp = (raw: string | number | undefined) => {
    if (!raw) return null
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return null
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const createdAtFormatted = computed(() => formatTimestamp(editableItem.value.createdAt))
  const updatedAtFormatted = computed(() => formatTimestamp(editableItem.value.updatedAt))
</script>

<template>
  <div class="flex flex-col pt-3 divide-y divide-border/50">
    <!-- Date / schedule row — popover holds the full schedule UI -->
    <div v-if="props.hasField('startDate')" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
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

    <!-- Status -->
    <div v-if="props.hasField('status')" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
      <Icon name="lucide:circle-dot" class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Status</span>
      <UiPopover v-model:open="statusOpen">
        <UiPopoverTrigger as-child>
          <button
            class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors text-left"
            :class="currentStatus?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentStatus?.icon || 'lucide:circle'" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ currentStatus?.label || 'Status' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in TASK_STATUS_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="
              () => {
                editableItem.taskStatus = opt.value as TaskStatus
                statusOpen = false
              }
            ">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.taskStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Priority -->
    <div v-if="props.hasField('priority')" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
      <Icon name="lucide:flag" class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Priority</span>
      <UiPopover v-model:open="priorityOpen">
        <UiPopoverTrigger as-child>
          <button
            class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors text-left"
            :class="currentPriority?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentPriority?.icon || 'lucide:minus'" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ currentPriority?.label || 'Priority' }}</span>
            <span v-if="editableItem.priority && !editableItem.priorityOverride" class="text-[9px] opacity-60">
              auto
            </span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in PRIORITY_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="setPriority(opt.value)">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.priority === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
          <button
            v-if="editableItem.priorityOverride"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground border-t border-border mt-1 pt-1.5"
            @click="resetPriority">
            <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
            Reset to auto
          </button>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Urgency -->
    <div v-if="props.hasField('urgency')" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
      <Icon name="lucide:zap" class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Urgency</span>
      <UiPopover v-model:open="urgencyOpen">
        <UiPopoverTrigger as-child>
          <button
            class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors text-left"
            :class="currentUrgency?.color || 'bg-muted/50 hover:bg-muted'">
            <Icon :name="currentUrgency?.icon || 'lucide:clock'" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ currentUrgency?.label || 'Urgency' }}</span>
            <span v-if="editableItem.urgency && !editableItem.urgencyOverride" class="text-[9px] opacity-60">auto</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in URGENCY_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="setUrgency(opt.value)">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.urgency === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
          <button
            v-if="editableItem.urgencyOverride"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground border-t border-border mt-1 pt-1.5"
            @click="resetUrgency">
            <Icon name="lucide:rotate-ccw" class="h-3.5 w-3.5" />
            Reset to auto
          </button>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Owner -->
    <div v-if="props.hasField('owner')" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
      <Icon name="lucide:user" class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Owner</span>
      <UiPopover v-model:open="ownerOpen">
        <UiPopoverTrigger as-child>
          <button
            class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors text-left"
            :class="
              editableItem.owner
                ? 'bg-muted/50 hover:bg-muted'
                : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
            ">
            <div
              class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium shrink-0"
              :class="editableItem.owner ? 'bg-primary/20 text-primary' : 'bg-muted-foreground/20 text-muted-foreground'">
              <Icon v-if="!editableItem.owner" name="lucide:user" class="h-2.5 w-2.5" />
              <template v-else>
                {{ (ownerName || 'U').slice(0, 2).toUpperCase() }}
              </template>
            </div>
            <span class="truncate">{{ ownerName || 'Unassigned' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
          <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
            <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-model="ownerSearch"
              type="text"
              placeholder="Search..."
              class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div class="overflow-y-auto max-h-52">
            <p v-if="!owners.length" class="px-2 py-1.5 text-xs text-muted-foreground italic">No owners available</p>
            <template v-else>
              <button
                v-if="editableItem.owner"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
                @click="
                  () => {
                    editableItem.owner = undefined
                    ownerOpen = false
                    ownerSearch = ''
                  }
                ">
                <Icon name="lucide:x" class="h-3.5 w-3.5" />
                No assignee
              </button>
              <button
                v-for="o in filteredOwners"
                :key="o.id"
                class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
                @click="
                  () => {
                    editableItem.owner = o.id
                    ownerOpen = false
                    ownerSearch = ''
                  }
                ">
                <div
                  class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary shrink-0">
                  {{ o.name.slice(0, 2).toUpperCase() }}
                </div>
                <span class="flex-1 truncate">{{ o.name }}</span>
                <Icon v-if="editableItem.owner === o.id" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
              </button>
            </template>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Involved -->
    <div v-if="props.hasField('involved')" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
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
              v-for="o in filteredInvolved"
              :key="o.id"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="toggleInvolved(o.id)">
              <Icon
                :name="editableItem.involved?.includes(o.id) ? 'lucide:check-square' : 'lucide:square'"
                class="h-3.5 w-3.5"
                :class="editableItem.involved?.includes(o.id) ? 'text-primary' : 'text-muted-foreground'" />
              <span class="flex-1 truncate">{{ o.name }}</span>
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Category -->
    <div v-if="props.hasField('category')" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
      <Icon name="lucide:tag" class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Category</span>
      <UiPopover v-model:open="categoryOpen">
        <UiPopoverTrigger as-child>
          <button
            class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-muted/50 hover:bg-muted transition-colors text-left">
            <Icon :name="currentCategory?.icon || 'lucide:tag'" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ currentCategory?.label || editableItem.category || 'General' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in CATEGORY_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="
              () => {
                editableItem.category = opt.value
                categoryOpen = false
              }
            ">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="editableItem.category === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Folder -->
    <div v-if="props.hasField('folder')" class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2">
      <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60">Folder</span>
      <UiPopover v-model:open="folderOpen">
        <UiPopoverTrigger as-child>
          <button
            class="max-w-fit inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors text-left"
            :class="
              editableItem.folder
                ? 'bg-muted/50 hover:bg-muted'
                : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
            ">
            <Icon name="lucide:folder" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">{{ editableItem.folder || 'No folder' }}</span>
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
          <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
            <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              v-model="folderSearch"
              type="text"
              placeholder="Search..."
              class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div class="overflow-y-auto max-h-52">
            <button
              v-if="editableItem.folder"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
              @click="
                () => {
                  editableItem.folder = undefined
                  folderOpen = false
                  folderSearch = ''
                }
              ">
              <Icon name="lucide:x" class="h-3.5 w-3.5" />
              No folder
            </button>
            <button
              v-for="f in filteredFolders"
              :key="f"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="
                () => {
                  editableItem.folder = f
                  folderOpen = false
                  folderSearch = ''
                }
              ">
              <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="flex-1 truncate">{{ f }}</span>
              <Icon v-if="editableItem.folder === f" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- ── System / read-only fields ───────────────────────────────── -->
    <div
      class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2"
      :title="'Read-only'">
      <Icon name="lucide:calendar-plus" class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Created at
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="max-w-fit text-xs text-muted-foreground truncate">
        {{ createdAtFormatted || '—' }}
      </span>
    </div>

    <div class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2" :title="'Read-only'">
      <Icon name="lucide:user-check" class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Created by
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="max-w-fit inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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

    <div class="grid grid-cols-[20px_1fr_auto] items-center gap-2 px-3 py-2" :title="'Read-only'">
      <Icon name="lucide:history" class="h-3.5 w-3.5 text-muted-foreground/70" />
      <span class="text-[10px] uppercase tracking-wide text-muted-foreground/60 flex items-center gap-1">
        Last edited
        <Icon name="lucide:lock" class="h-2.5 w-2.5 opacity-50" />
      </span>
      <span class="max-w-fit text-xs text-muted-foreground truncate">
        {{ updatedAtFormatted || '—' }}
      </span>
    </div>
  </div>
</template>
