<script lang="ts" setup>
  import type { PaymentStatus } from '~/types/calendarItem'
  import { PAYMENT_STATUS_OPTIONS } from '~/types/calendarItem'

  const props = defineProps<{
    modelValue: any
    mode: 'view' | 'create' | 'edit'
  }>()

  const emit = defineEmits<{
    'update:modelValue': [value: any]
  }>()

  const item = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
  })

  const isViewMode = computed(() => props.mode === 'view')
  const paymentStatusOpen = ref(false)
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Amount / Payment Status -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</p>
        <UiInput v-if="!isViewMode" v-model.number="item.amount" type="number" placeholder="0.00" class="text-sm" />
        <p v-else class="text-sm font-medium">{{ item.currency }} {{ item.amount?.toFixed(2) }}</p>
      </div>
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Status</p>
        <UiPopover v-model:open="paymentStatusOpen">
          <UiPopoverTrigger as-child>
            <button
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              :class="PAYMENT_STATUS_OPTIONS.find((s) => s.value === item.paymentStatus)?.color || 'bg-muted/50'">
              <Icon :name="PAYMENT_STATUS_OPTIONS.find((s) => s.value === item.paymentStatus)?.icon || 'lucide:clock'" class="h-3.5 w-3.5" />
              {{ PAYMENT_STATUS_OPTIONS.find((s) => s.value === item.paymentStatus)?.label || 'Status' }}
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-44 p-1">
            <button
              v-for="opt in PAYMENT_STATUS_OPTIONS"
              :key="opt.value"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="item.paymentStatus = opt.value as PaymentStatus; paymentStatusOpen = false">
              <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="flex-1">{{ opt.label }}</span>
              <Icon v-if="item.paymentStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </UiPopoverContent>
        </UiPopover>
      </div>
    </div>

    <!-- Payee / Invoice -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payee</p>
        <UiInput v-if="!isViewMode" v-model="item.payee" placeholder="Who to pay" class="text-sm" />
        <p v-else class="text-sm">{{ item.payee || '—' }}</p>
      </div>
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Invoice #</p>
        <UiInput v-if="!isViewMode" v-model="item.invoiceNumber" placeholder="INV-001" class="text-sm" />
        <p v-else class="text-sm">{{ item.invoiceNumber || '—' }}</p>
      </div>
    </div>

    <!-- Recurring toggle -->
    <div class="p-4 flex items-center gap-3">
      <button
        v-if="!isViewMode"
        class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
        :class="item.recurring ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-muted-foreground'"
        @click="item.recurring = !item.recurring">
        <Icon name="lucide:repeat" class="h-3.5 w-3.5" />
        <span>Recurring</span>
      </button>
      <span v-else-if="item.recurring" class="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs">
        <Icon name="lucide:repeat" class="h-3.5 w-3.5" /> Recurring
      </span>
    </div>
  </div>
</template>
