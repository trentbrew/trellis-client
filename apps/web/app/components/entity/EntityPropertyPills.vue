<script lang="ts" setup>
  /**
   * EntityPropertyPills — All property pill popovers for EntityDialog.
   *
   * Renders the horizontal flex-wrap row of popover pills for:
   * - Core fields: date badge, task status, priority, urgency, owner, involved, category, folder
   * - Payment: paymentStatus, amount, payee, invoiceNumber, recurring
   * - Trip: tripStatus, origin, destination, transportation, tripBudget, confirmationNumber
   * - Sprint: sprintStatus, velocity, sprintGoal
   * - Milestone: achieved, projectId
   * - Budget: budgetStatus, budgetAmount
   * - Goal: metric, targetDate, currentValue, targetValue
   * - Event: eventSubtype, location
   *
   * All popover open/close state is managed internally.
   * editableItem is a two-way model (defineModel) — mutations flow to parent.
   */
  import type {
    TaskStatus,
    Priority,
    Urgency,
    EventType,
    PropertyFieldId,
  } from '~/types/entity'
  import {
    PRIORITY_OPTIONS,
    URGENCY_OPTIONS,
    CATEGORY_OPTIONS,
    EVENT_TYPE_OPTIONS,
    TASK_STATUS_OPTIONS,
    PAYMENT_STATUS_OPTIONS,
    TRIP_STATUS_OPTIONS,
    TRANSPORT_OPTIONS,
    SPRINT_STATUS_OPTIONS,
    BUDGET_STATUS_OPTIONS,
    CURRENCY_OPTIONS,
  } from '~/types/entity'
  import { useEntityFormulas } from '~/composables/useEntityFormulas'

  const editableItem = defineModel<any>('editableItem', { required: true })

  const props = defineProps<{
    hasField: (_fieldId: PropertyFieldId) => boolean
    isViewMode: boolean
    owners: { id: string; name: string }[]
    folders: string[]
    schedulePanelOpen: boolean
    scheduleDescription: { scheduleText: string; statusText: string; isOverdue: boolean; isRecurring: boolean }
  }>()

  const emit = defineEmits<{
    'toggle-schedule': []
  }>()

  const { user: currentUser } = useInstantAuth()
  const { applyFormulas } = useEntityFormulas()

  // ── Popover open states (all self-contained) ─────────────────────
  const taskStatusOpen = ref(false)
  const priorityOpen = ref(false)
  const urgencyOpen = ref(false)
  const categoryOpen = ref(false)
  const ownerOpen = ref(false)
  const involvedOpen = ref(false)
  const folderOpen = ref(false)
  const paymentStatusOpen = ref(false)
  const amountOpen = ref(false)
  const payeeOpen = ref(false)
  const invoiceNumberOpen = ref(false)
  const tripStatusOpen = ref(false)
  const originOpen = ref(false)
  const destinationOpen = ref(false)
  const transportationOpen = ref(false)
  const tripBudgetOpen = ref(false)
  const confirmationNumberOpen = ref(false)
  const sprintStatusOpen = ref(false)
  const velocityOpen = ref(false)
  const sprintGoalOpen = ref(false)
  const projectIdOpen = ref(false)
  const budgetAmountOpen = ref(false)
  const budgetStatusOpen = ref(false)
  const metricOpen = ref(false)
  const targetDateOpen = ref(false)
  const currentValueOpen = ref(false)
  const targetValueOpen = ref(false)
  const locationOpen = ref(false)
  const eventSubtypeOpen = ref(false)

  // ── Search state ────────────────────────────────────────────────
  const ownerSearch = ref('')
  const folderSearch = ref('')
  const involvedSearch = ref('')

  // ── Computed lookups ────────────────────────────────────────────
  const isOwnerUnset = computed(() => !editableItem.value.owner)
  const isFolderUnset = computed(() => !editableItem.value.folder)
  const isInvolvedUnset = computed(() => !editableItem.value.involved?.length)

  const currentPriority = computed(() => PRIORITY_OPTIONS.find((p) => p.value === editableItem.value.priority))
  const currentUrgency = computed(() => URGENCY_OPTIONS.find((u) => u.value === editableItem.value.urgency))
  const currentCategory = computed(() => CATEGORY_OPTIONS.find((c) => c.value === editableItem.value.category))

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

  const filteredFolders = computed(() => {
    if (!folderSearch.value) return props.folders
    const s = folderSearch.value.toLowerCase()
    return props.folders.filter((f) => f.toLowerCase().includes(s))
  })

  const filteredInvolvedOwners = computed(() => {
    if (!involvedSearch.value) return props.owners
    const s = involvedSearch.value.toLowerCase()
    return props.owners.filter((o) => o.name.toLowerCase().includes(s))
  })

  // ── Actions ────────────────────────────────────────────────────
  const toggleInvolvedUser = (uid: string) => {
    const i = editableItem.value.involved.indexOf(uid)
    if (i === -1) editableItem.value.involved.push(uid)
    else editableItem.value.involved.splice(i, 1)
  }

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
</script>

<template>
  <!-- Date badge (toggles schedule sidebar) -->
  <button
    v-if="hasField('startDate')"
    class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
    :class="[
      scheduleDescription.isOverdue
        ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
        : 'bg-muted/50 text-muted-foreground hover:bg-muted',
      schedulePanelOpen ? 'ring-1 ring-primary/30' : '',
    ]"
    @click="emit('toggle-schedule')">
    <Icon :name="scheduleDescription.isRecurring ? 'lucide:repeat' : 'lucide:calendar'" class="h-3.5 w-3.5" />
    <span>{{ scheduleDescription.scheduleText }}</span>
    <span v-if="scheduleDescription.statusText" class="opacity-70">({{ scheduleDescription.statusText }})</span>
  </button>

  <!-- Task Status -->
  <UiPopover v-if="hasField('status')" v-model:open="taskStatusOpen">
    <UiPopoverTrigger as-child>
      <button
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
        :class="TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.color || 'bg-muted/50 hover:bg-muted'">
        <Icon :name="TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
        <span>{{ TASK_STATUS_OPTIONS.find((s) => s.value === editableItem.taskStatus)?.label || 'Status' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-44 p-1">
      <button
        v-for="opt in TASK_STATUS_OPTIONS"
        :key="opt.value"
        class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
        @click="editableItem.taskStatus = opt.value as TaskStatus; taskStatusOpen = false">
        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="flex-1">{{ opt.label }}</span>
        <Icon v-if="editableItem.taskStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Priority -->
  <UiPopover v-if="hasField('priority')" v-model:open="priorityOpen">
    <UiPopoverTrigger as-child>
      <button
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
        :class="currentPriority?.color || 'bg-muted/50 hover:bg-muted'">
        <Icon :name="currentPriority?.icon || 'lucide:minus'" class="h-3.5 w-3.5" />
        <span>{{ currentPriority?.label || 'Priority' }}</span>
        <span v-if="editableItem.priority && !editableItem.priorityOverride" class="text-[9px] opacity-60">(auto)</span>
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
        <span>Reset to auto</span>
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Urgency -->
  <UiPopover v-if="hasField('urgency')" v-model:open="urgencyOpen">
    <UiPopoverTrigger as-child>
      <button
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors"
        :class="currentUrgency?.color || 'bg-muted/50 hover:bg-muted'">
        <Icon :name="currentUrgency?.icon || 'lucide:clock'" class="h-3.5 w-3.5" />
        <span>{{ currentUrgency?.label || 'Urgency' }}</span>
        <span v-if="editableItem.urgency && !editableItem.urgencyOverride" class="text-[9px] opacity-60">(auto)</span>
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
        <span>Reset to auto</span>
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Owner -->
  <UiPopover v-if="hasField('owner')" v-model:open="ownerOpen">
    <UiPopoverTrigger as-child>
      <button
        :class="[
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors',
          isOwnerUnset
            ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30'
            : 'bg-muted/50 hover:bg-muted',
        ]">
        <div
          :class="[
            'w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-medium',
            isOwnerUnset ? 'bg-muted-foreground/20 text-muted-foreground' : 'bg-primary/20 text-primary',
          ]">
          <Icon v-if="isOwnerUnset" name="lucide:user" class="h-2.5 w-2.5" />
          <template v-else>
            {{ (owners?.find((o) => o.id === editableItem.owner)?.name || 'U').slice(0, 2).toUpperCase() }}
          </template>
        </div>
        <span>{{ owners?.find((o) => o.id === editableItem.owner)?.name || 'Owner' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
      <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
        <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input v-model="ownerSearch" type="text" placeholder="Search..." class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
      </div>
      <div class="overflow-y-auto max-h-52">
        <p v-if="!owners?.length" class="px-2 py-1.5 text-xs text-muted-foreground italic">No owners available</p>
        <template v-else>
          <button
            v-if="editableItem.owner"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground"
            @click="() => { editableItem.owner = undefined; ownerOpen = false; ownerSearch = '' }">
            <Icon name="lucide:x" class="h-3.5 w-3.5" />No assignee
          </button>
          <button
            v-for="o in filteredOwners"
            :key="o.id"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="() => { editableItem.owner = o.id; ownerOpen = false; ownerSearch = '' }">
            <div class="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium text-primary">{{ o.name.slice(0, 2).toUpperCase() }}</div>
            <span class="flex-1">{{ o.name }}</span>
            <Icon v-if="editableItem.owner === o.id" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </template>
      </div>
    </UiPopoverContent>
  </UiPopover>

  <!-- Involved -->
  <UiPopover v-if="hasField('involved')" v-model:open="involvedOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', isInvolvedUnset ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30' : 'bg-muted/50 hover:bg-muted']">
        <Icon name="lucide:users" class="h-3.5 w-3.5" :class="isInvolvedUnset ? 'opacity-50' : ''" />
        <span>{{ editableItem.involved.length ? `Involved (${editableItem.involved.length})` : 'Involved' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-56 p-1 max-h-64 overflow-hidden">
      <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
        <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input v-model="involvedSearch" type="text" placeholder="Search..." class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
      </div>
      <div class="overflow-y-auto max-h-52">
        <button v-for="o in filteredInvolvedOwners" :key="o.id" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="toggleInvolvedUser(o.id)">
          <Icon :name="editableItem.involved.includes(o.id) ? 'lucide:check-square' : 'lucide:square'" class="h-3.5 w-3.5" :class="editableItem.involved.includes(o.id) ? 'text-primary' : 'text-muted-foreground'" />
          <span class="flex-1 truncate">{{ o.name }}</span>
        </button>
      </div>
    </UiPopoverContent>
  </UiPopover>

  <!-- Category -->
  <UiPopover v-if="hasField('category')" v-model:open="categoryOpen">
    <UiPopoverTrigger as-child>
      <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
        <Icon :name="currentCategory?.icon || 'lucide:tag'" class="h-3.5 w-3.5" />
        <span>{{ currentCategory?.label || editableItem.category || 'Category' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-44 p-1">
      <button v-for="opt in CATEGORY_OPTIONS" :key="opt.value" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="() => { editableItem.category = opt.value; categoryOpen = false }">
        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
        <span class="flex-1">{{ opt.label }}</span>
        <Icon v-if="editableItem.category === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Folder -->
  <UiPopover v-if="hasField('folder')" v-model:open="folderOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', isFolderUnset ? 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30' : 'bg-muted/50 hover:bg-muted']">
        <Icon name="lucide:folder" class="h-3.5 w-3.5" :class="isFolderUnset ? 'opacity-50' : ''" />
        <span>{{ editableItem.folder || 'Folder' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-52 p-1 max-h-64 overflow-hidden">
      <div class="flex items-center gap-2 px-2 py-1.5 border-b border-border mb-1">
        <Icon name="lucide:search" class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input v-model="folderSearch" type="text" placeholder="Search..." class="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60" />
      </div>
      <div class="overflow-y-auto max-h-52">
        <button v-if="editableItem.folder" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2 text-muted-foreground" @click="() => { editableItem.folder = undefined; folderOpen = false; folderSearch = '' }">
          <Icon name="lucide:x" class="h-3.5 w-3.5" />No folder
        </button>
        <button v-for="f in filteredFolders" :key="f" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="() => { editableItem.folder = f; folderOpen = false; folderSearch = '' }">
          <Icon name="lucide:folder" class="h-3.5 w-3.5 text-muted-foreground" />
          <span class="flex-1">{{ f }}</span>
          <Icon v-if="editableItem.folder === f" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
        </button>
      </div>
    </UiPopoverContent>
  </UiPopover>

  <!-- ═══ Type-specific property pills ═══ -->

  <!-- Payment Status -->
  <UiPopover v-if="hasField('paymentStatus')" v-model:open="paymentStatusOpen">
    <UiPopoverTrigger as-child>
      <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.color || 'bg-muted/50 hover:bg-muted'">
        <Icon :name="PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.icon || 'lucide:clock'" class="h-3.5 w-3.5" />
        <span>{{ PAYMENT_STATUS_OPTIONS.find((s) => s.value === editableItem.paymentStatus)?.label || 'Status' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-44 p-1">
      <button v-for="opt in PAYMENT_STATUS_OPTIONS" :key="opt.value" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="editableItem.paymentStatus = opt.value; paymentStatusOpen = false">
        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" /><span class="flex-1">{{ opt.label }}</span>
        <Icon v-if="editableItem.paymentStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Amount -->
  <UiPopover v-if="hasField('amount')" v-model:open="amountOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.amount ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:banknote" class="h-3.5 w-3.5" /><span>{{ editableItem.amount ? `${editableItem.currency || '$'}${editableItem.amount}` : 'Amount' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2 space-y-2">
      <div class="flex items-center gap-2">
        <select v-model="editableItem.currency" class="h-7 rounded-md border border-border bg-transparent text-xs px-1.5 outline-none w-16 shrink-0">
          <option v-for="c in CURRENCY_OPTIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <input v-model.number="editableItem.amount" type="number" placeholder="0.00" class="flex-1 h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="amountOpen = false" />
      </div>
    </UiPopoverContent>
  </UiPopover>

  <!-- Payee -->
  <UiPopover v-if="hasField('payee')" v-model:open="payeeOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.payee ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:user-check" class="h-3.5 w-3.5" /><span>{{ editableItem.payee || 'Payee' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2">
      <input v-model="editableItem.payee" type="text" placeholder="Who to pay" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="payeeOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Invoice # -->
  <UiPopover v-if="hasField('invoiceNumber')" v-model:open="invoiceNumberOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.invoiceNumber ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:hash" class="h-3.5 w-3.5" /><span>{{ editableItem.invoiceNumber || 'Invoice #' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2">
      <input v-model="editableItem.invoiceNumber" type="text" placeholder="INV-001" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="invoiceNumberOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Recurring -->
  <button v-if="hasField('recurring') && !isViewMode" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors" :class="editableItem.recurring ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-muted-foreground'" @click="editableItem.recurring = !editableItem.recurring">
    <Icon name="lucide:repeat" class="h-3.5 w-3.5" /><span>Recurring</span>
  </button>
  <span v-else-if="hasField('recurring') && editableItem.recurring" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-primary/10 text-primary"><Icon name="lucide:repeat" class="h-3.5 w-3.5" /> Recurring</span>

  <!-- Trip Status -->
  <UiPopover v-if="hasField('tripStatus')" v-model:open="tripStatusOpen">
    <UiPopoverTrigger as-child>
      <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.color || 'bg-muted/50 hover:bg-muted'">
        <Icon :name="TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.icon || 'lucide:map'" class="h-3.5 w-3.5" />
        <span>{{ TRIP_STATUS_OPTIONS.find((s) => s.value === editableItem.tripStatus)?.label || 'Trip Status' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-44 p-1">
      <button v-for="opt in TRIP_STATUS_OPTIONS" :key="opt.value" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="editableItem.tripStatus = opt.value; tripStatusOpen = false">
        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" /><span class="flex-1">{{ opt.label }}</span>
        <Icon v-if="editableItem.tripStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Origin -->
  <UiPopover v-if="hasField('origin')" v-model:open="originOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.origin ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:map-pin" class="h-3.5 w-3.5" /><span>{{ editableItem.origin || 'Origin' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2">
      <input v-model="editableItem.origin" type="text" placeholder="Departure city" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="originOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Destination -->
  <UiPopover v-if="hasField('destination')" v-model:open="destinationOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.destination ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:map-pin" class="h-3.5 w-3.5" /><span>{{ editableItem.destination || 'Destination' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2">
      <input v-model="editableItem.destination" type="text" placeholder="Arrival city" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="destinationOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Transportation -->
  <UiPopover v-if="hasField('transportation')" v-model:open="transportationOpen">
    <UiPopoverTrigger as-child>
      <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
        <Icon :name="TRANSPORT_OPTIONS.find((t) => t.value === editableItem.transportation)?.icon || 'lucide:navigation'" class="h-3.5 w-3.5" />
        <span>{{ TRANSPORT_OPTIONS.find((t) => t.value === editableItem.transportation)?.label || 'Transport' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-40 p-1">
      <button v-for="opt in TRANSPORT_OPTIONS" :key="opt.value" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="editableItem.transportation = opt.value; transportationOpen = false">
        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" /><span class="flex-1">{{ opt.label }}</span>
        <Icon v-if="editableItem.transportation === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Trip Budget -->
  <UiPopover v-if="hasField('tripBudget')" v-model:open="tripBudgetOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.budget ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:wallet" class="h-3.5 w-3.5" /><span>{{ editableItem.budget ? `${editableItem.currency || '$'}${editableItem.budget}` : 'Budget' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-40 p-2">
      <input v-model.number="editableItem.budget" type="number" placeholder="0.00" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="tripBudgetOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Confirmation # -->
  <UiPopover v-if="hasField('confirmationNumber')" v-model:open="confirmationNumberOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.confirmationNumber ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:ticket" class="h-3.5 w-3.5" /><span>{{ editableItem.confirmationNumber || 'Confirmation #' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2">
      <input v-model="editableItem.confirmationNumber" type="text" placeholder="ABC123" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="confirmationNumberOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Sprint Status -->
  <UiPopover v-if="hasField('sprintStatus')" v-model:open="sprintStatusOpen">
    <UiPopoverTrigger as-child>
      <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="SPRINT_STATUS_OPTIONS.find((s) => s.value === editableItem.sprintStatus)?.color || 'bg-muted/50 hover:bg-muted'">
        <Icon :name="SPRINT_STATUS_OPTIONS.find((s) => s.value === editableItem.sprintStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
        <span>{{ SPRINT_STATUS_OPTIONS.find((s) => s.value === editableItem.sprintStatus)?.label || 'Sprint Status' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-44 p-1">
      <button v-for="opt in SPRINT_STATUS_OPTIONS" :key="opt.value" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="editableItem.sprintStatus = opt.value; sprintStatusOpen = false">
        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" /><span class="flex-1">{{ opt.label }}</span>
        <Icon v-if="editableItem.sprintStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Velocity -->
  <UiPopover v-if="hasField('velocity')" v-model:open="velocityOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.velocity != null ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:gauge" class="h-3.5 w-3.5" /><span>{{ editableItem.velocity != null ? `${editableItem.velocity} pts` : 'Velocity' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-40 p-2">
      <input v-model.number="editableItem.velocity" type="number" placeholder="Story points" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="velocityOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Sprint Goal -->
  <UiPopover v-if="hasField('sprintGoal')" v-model:open="sprintGoalOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors max-w-48 truncate', editableItem.sprintGoal ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:target" class="h-3.5 w-3.5 shrink-0" /><span class="truncate">{{ editableItem.sprintGoal || 'Sprint Goal' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-64 p-2">
      <textarea v-model="editableItem.sprintGoal" placeholder="What does this sprint aim to achieve?" rows="3" class="w-full text-xs bg-transparent outline-none resize-none placeholder:text-muted-foreground/50 border border-border rounded-md px-2 py-1.5" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Achieved -->
  <button v-if="hasField('achieved') && !isViewMode" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors" :class="editableItem.achieved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted/50 hover:bg-muted text-muted-foreground'" @click="editableItem.achieved = !editableItem.achieved">
    <Icon :name="editableItem.achieved ? 'lucide:check-circle' : 'lucide:circle'" class="h-3.5 w-3.5" /><span>{{ editableItem.achieved ? 'Achieved' : 'Not yet' }}</span>
  </button>
  <span v-else-if="hasField('achieved') && isViewMode" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs" :class="editableItem.achieved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted/50 text-muted-foreground'">
    <Icon :name="editableItem.achieved ? 'lucide:check-circle' : 'lucide:circle'" class="h-3.5 w-3.5" />{{ editableItem.achieved ? 'Achieved' : 'Not yet' }}
  </span>

  <!-- Project ID -->
  <UiPopover v-if="hasField('projectId')" v-model:open="projectIdOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.projectId ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:folder-kanban" class="h-3.5 w-3.5" /><span>{{ editableItem.projectId || 'Project' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2">
      <input v-model="editableItem.projectId" type="text" placeholder="Link to project..." class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="projectIdOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Budget Status -->
  <UiPopover v-if="hasField('budgetStatus')" v-model:open="budgetStatusOpen">
    <UiPopoverTrigger as-child>
      <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="BUDGET_STATUS_OPTIONS.find((s) => s.value === editableItem.budgetStatus)?.color || 'bg-muted/50 hover:bg-muted'">
        <Icon :name="BUDGET_STATUS_OPTIONS.find((s) => s.value === editableItem.budgetStatus)?.icon || 'lucide:circle'" class="h-3.5 w-3.5" />
        <span>{{ BUDGET_STATUS_OPTIONS.find((s) => s.value === editableItem.budgetStatus)?.label || 'Budget Status' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-44 p-1">
      <button v-for="opt in BUDGET_STATUS_OPTIONS" :key="opt.value" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="editableItem.budgetStatus = opt.value; budgetStatusOpen = false">
        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" /><span class="flex-1">{{ opt.label }}</span>
        <Icon v-if="editableItem.budgetStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Budget Amount -->
  <UiPopover v-if="hasField('budgetAmount')" v-model:open="budgetAmountOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.amount ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:banknote" class="h-3.5 w-3.5" /><span>{{ editableItem.amount ? `${editableItem.currency || 'USD'} ${editableItem.amount?.toLocaleString()}` : 'Amount' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2 space-y-2">
      <div class="flex items-center gap-2">
        <select v-model="editableItem.currency" class="h-7 rounded-md border border-border bg-transparent text-xs px-1.5 outline-none w-16 shrink-0">
          <option v-for="c in CURRENCY_OPTIONS" :key="c.value" :value="c.value">{{ c.label }}</option>
        </select>
        <input v-model.number="editableItem.amount" type="number" placeholder="0.00" class="flex-1 h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="budgetAmountOpen = false" />
      </div>
    </UiPopoverContent>
  </UiPopover>

  <!-- Metric -->
  <UiPopover v-if="hasField('metric')" v-model:open="metricOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.metric ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:bar-chart-3" class="h-3.5 w-3.5" /><span>{{ editableItem.metric || 'Metric' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2">
      <input v-model="editableItem.metric" type="text" placeholder="e.g. Revenue, Users" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="metricOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Target Date -->
  <UiPopover v-if="hasField('targetDate')" v-model:open="targetDateOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.targetDate ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:calendar-check" class="h-3.5 w-3.5" /><span>{{ editableItem.targetDate || 'Target Date' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-48 p-2">
      <input v-model="editableItem.targetDate" type="date" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Current Value -->
  <UiPopover v-if="hasField('currentValue')" v-model:open="currentValueOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.currentValue != null ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:trending-up" class="h-3.5 w-3.5" /><span>{{ editableItem.currentValue != null ? `Current: ${editableItem.currentValue}` : 'Current' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-40 p-2">
      <input v-model.number="editableItem.currentValue" type="number" placeholder="0" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="currentValueOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Target Value -->
  <UiPopover v-if="hasField('targetValue')" v-model:open="targetValueOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors', editableItem.targetValue != null ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:target" class="h-3.5 w-3.5" /><span>{{ editableItem.targetValue != null ? `Target: ${editableItem.targetValue}` : 'Target' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-40 p-2">
      <input v-model.number="editableItem.targetValue" type="number" placeholder="100" class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="targetValueOpen = false" />
    </UiPopoverContent>
  </UiPopover>

  <!-- Event Subtype -->
  <UiPopover v-if="hasField('eventSubtype')" v-model:open="eventSubtypeOpen">
    <UiPopoverTrigger as-child>
      <button class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors" :class="EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.color || 'bg-muted/50 hover:bg-muted'">
        <Icon :name="EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.icon || 'lucide:calendar'" class="h-3.5 w-3.5" />
        <span>{{ EVENT_TYPE_OPTIONS.find((e) => e.value === editableItem.eventType)?.label || 'Event Type' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-44 p-1">
      <button v-for="opt in EVENT_TYPE_OPTIONS" :key="opt.value" class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2" @click="editableItem.eventType = opt.value as EventType; eventSubtypeOpen = false">
        <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" /><span class="flex-1">{{ opt.label }}</span>
        <Icon v-if="editableItem.eventType === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
      </button>
    </UiPopoverContent>
  </UiPopover>

  <!-- Location -->
  <UiPopover v-if="hasField('location')" v-model:open="locationOpen">
    <UiPopoverTrigger as-child>
      <button :class="['inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors max-w-48 truncate', editableItem.location ? 'bg-muted/50 hover:bg-muted' : 'border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground/60 hover:bg-muted/30']">
        <Icon name="lucide:map-pin" class="h-3.5 w-3.5 shrink-0" /><span class="truncate">{{ editableItem.location || 'Location' }}</span>
      </button>
    </UiPopoverTrigger>
    <UiPopoverContent align="start" class="w-64 p-2">
      <input v-model="editableItem.location" type="text" placeholder="Address, room, or meeting link..." class="w-full h-7 rounded-md border border-border bg-transparent text-xs px-2 outline-none" @keydown.enter="locationOpen = false" />
    </UiPopoverContent>
  </UiPopover>
</template>
