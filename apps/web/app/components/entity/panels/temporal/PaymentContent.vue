<script lang="ts" setup>
  import type { PaymentLineItem } from '~/types/entity'
  import { PAYMENT_STATUS_OPTIONS } from '~/types/entity'

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

  // ── Currency formatting ──────────────────────────────────────────────
  const formatAmount = (val?: number) => {
    if (val == null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: item.value.currency || 'USD',
      minimumFractionDigits: 2,
    }).format(val)
  }

  // ── Status styling ───────────────────────────────────────────────────
  const statusConfig = computed(() =>
    PAYMENT_STATUS_OPTIONS.find((s) => s.value === item.value.paymentStatus),
  )

  const directionLabel = computed(() => {
    if (item.value.direction === 'credit') return 'Deposit'
    return 'Payment'
  })

  const directionIcon = computed(() => {
    if (item.value.direction === 'credit') return 'lucide:arrow-down-left'
    return 'lucide:arrow-up-right'
  })

  const directionColor = computed(() => {
    if (item.value.direction === 'credit') return 'text-emerald-500'
    return 'text-foreground'
  })

  // ── Channel icon ─────────────────────────────────────────────────────
  const channelConfig = computed(() => {
    const map: Record<string, { icon: string; label: string }> = {
      online: { icon: 'lucide:globe', label: 'Online' },
      in_store: { icon: 'lucide:store', label: 'In Store' },
      atm: { icon: 'lucide:landmark', label: 'ATM' },
      other: { icon: 'lucide:circle-dot', label: 'Other' },
    }
    return map[item.value.paymentChannel] || null
  })

  // ── Date formatting ──────────────────────────────────────────────────
  const formatDate = (d?: string) => {
    if (!d) return null
    try {
      return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return d
    }
  }

  // ── Line items ───────────────────────────────────────────────────────
  const lineItems = computed(() => item.value.lineItems || [])

  const addLineItem = () => {
    if (!item.value.lineItems) item.value.lineItems = []
    item.value.lineItems.push({
      id: `li-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    })
  }

  const removeLineItem = (index: number) => {
    item.value.lineItems?.splice(index, 1)
    recalcTotals()
  }

  const updateLineItemTotal = (li: PaymentLineItem) => {
    li.total = li.quantity * li.unitPrice
    recalcTotals()
  }

  const recalcTotals = () => {
    const lines = item.value.lineItems || []
    const sub = lines.reduce((sum: number, li: PaymentLineItem) => sum + (li.total || 0), 0)
    item.value.subtotal = sub
    const tax = item.value.taxRate ? sub * (item.value.taxRate / 100) : (item.value.taxAmount || 0)
    item.value.taxAmount = tax
    item.value.amount = sub + tax - (item.value.discount || 0) + (item.value.tip || 0)
  }

  // ── Computed totals for display ──────────────────────────────────────
  const computedSubtotal = computed(() => {
    if (item.value.subtotal != null) return item.value.subtotal
    return lineItems.value.reduce((sum: number, li: PaymentLineItem) => sum + (li.total || 0), 0)
  })

  const hasBreakdown = computed(() =>
    lineItems.value.length > 0
    || item.value.subtotal != null
    || item.value.taxAmount
    || item.value.discount
    || item.value.tip,
  )

  const hasTransactionMeta = computed(() =>
    item.value.merchantName
    || item.value.paymentChannel
    || item.value.accountName
    || item.value.referenceNumber
    || item.value.checkNumber
    || item.value.financeCategory
    || item.value.authorizedDate,
  )

  // ── Merchant display ─────────────────────────────────────────────────
  const merchantInitials = computed(() => {
    const name = item.value.merchantName || item.value.payee || ''
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() ?? '')
      .join('')
  })
</script>

<template>
  <div class="divide-y divide-border">
    <!-- ═══════════════════════════════════════════════════════════════════
         Invoice / Receipt Visual
         ═══════════════════════════════════════════════════════════════════ -->
    <div class="p-5">
      <div class="rounded-xl border border-border bg-card overflow-hidden">
        <!-- Receipt header — merchant + amount hero -->
        <div class="p-5 pb-4 space-y-4">
          <!-- Merchant row -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <!-- Merchant logo / initials -->
              <div class="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                <img
                  v-if="item.merchantLogoUrl"
                  :src="item.merchantLogoUrl"
                  :alt="item.merchantName || item.payee"
                  class="h-10 w-10 rounded-lg object-cover" />
                <span v-else-if="merchantInitials" class="text-sm font-semibold text-muted-foreground">
                  {{ merchantInitials }}
                </span>
                <Icon v-else name="lucide:credit-card" class="h-5 w-5 text-muted-foreground" />
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold truncate">
                  {{ item.merchantName || item.payee || 'Unknown Merchant' }}
                </p>
                <div class="flex items-center gap-2 mt-0.5">
                  <span
                    v-if="statusConfig"
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                    :class="statusConfig.color">
                    <Icon :name="statusConfig.icon" class="h-2.5 w-2.5" />
                    {{ statusConfig.label }}
                  </span>
                  <span v-if="item.pending" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-500">
                    <Icon name="lucide:clock" class="h-2.5 w-2.5" />
                    Pending
                  </span>
                  <span v-if="item.recurring" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                    <Icon name="lucide:repeat" class="h-2.5 w-2.5" />
                    Recurring
                  </span>
                </div>
              </div>
            </div>
            <!-- Direction badge -->
            <div class="flex items-center gap-1 shrink-0">
              <Icon :name="directionIcon" class="h-3.5 w-3.5" :class="directionColor" />
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{{ directionLabel }}</span>
            </div>
          </div>

          <!-- Amount hero -->
          <div class="text-center py-3">
            <p :class="['text-3xl font-bold tracking-tight tabular-nums', directionColor]">
              <span v-if="item.direction === 'credit'">+</span>
              <span v-else>−</span>
              {{ formatAmount(item.amount) }}
            </p>
            <p v-if="formatDate(item.startDate)" class="text-xs text-muted-foreground mt-1">
              {{ formatDate(item.startDate) }}
              <template v-if="item.authorizedDate && item.authorizedDate !== item.startDate">
                · Authorized {{ formatDate(item.authorizedDate) }}
              </template>
            </p>
          </div>
        </div>

        <!-- Transaction metadata strip -->
        <div v-if="hasTransactionMeta || !isViewMode" class="border-t border-border/60 bg-muted/20">
          <div class="grid grid-cols-2 gap-px bg-border/30">
            <!-- Account -->
            <div v-if="item.accountName || item.accountMask || !isViewMode" class="bg-card p-3 space-y-0.5">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Account</p>
              <template v-if="!isViewMode">
                <div class="flex items-center gap-1.5">
                  <input
                    v-model="item.accountName"
                    type="text"
                    placeholder="Account name"
                    class="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50 min-w-0" />
                  <span class="text-muted-foreground/40">·</span>
                  <input
                    v-model="item.accountMask"
                    type="text"
                    placeholder="••••"
                    maxlength="4"
                    class="w-12 text-xs bg-transparent outline-none placeholder:text-muted-foreground/50 text-right tabular-nums" />
                </div>
              </template>
              <p v-else class="text-xs">
                {{ item.accountName || 'Account' }}
                <span v-if="item.accountMask" class="text-muted-foreground"> ····{{ item.accountMask }}</span>
              </p>
            </div>

            <!-- Channel -->
            <div v-if="item.paymentChannel || !isViewMode" class="bg-card p-3 space-y-0.5">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Channel</p>
              <template v-if="!isViewMode">
                <select
                  v-model="item.paymentChannel"
                  class="w-full text-xs bg-transparent outline-none border-none cursor-pointer">
                  <option value="">Select...</option>
                  <option value="online">Online</option>
                  <option value="in_store">In Store</option>
                  <option value="atm">ATM</option>
                  <option value="other">Other</option>
                </select>
              </template>
              <div v-else-if="channelConfig" class="flex items-center gap-1.5">
                <Icon :name="channelConfig.icon" class="h-3 w-3 text-muted-foreground" />
                <span class="text-xs">{{ channelConfig.label }}</span>
              </div>
              <p v-else class="text-xs text-muted-foreground">—</p>
            </div>

            <!-- Category -->
            <div v-if="item.financeCategory || !isViewMode" class="bg-card p-3 space-y-0.5">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Category</p>
              <template v-if="!isViewMode">
                <input
                  v-model="item.financeCategory"
                  type="text"
                  placeholder="e.g. Software, Food"
                  class="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/50" />
              </template>
              <p v-else class="text-xs">{{ item.financeCategory }}</p>
            </div>

            <!-- Reference # -->
            <div v-if="item.referenceNumber || item.checkNumber || !isViewMode" class="bg-card p-3 space-y-0.5">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Reference</p>
              <template v-if="!isViewMode">
                <input
                  v-model="item.referenceNumber"
                  type="text"
                  placeholder="Ref / Check #"
                  class="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground/50 tabular-nums" />
              </template>
              <p v-else class="text-xs tabular-nums">{{ item.referenceNumber || item.checkNumber }}</p>
            </div>
          </div>
        </div>

        <!-- Merchant link -->
        <div v-if="item.merchantWebsite" class="border-t border-border/60 px-4 py-2.5 flex items-center gap-2">
          <Icon name="lucide:globe" class="h-3 w-3 text-muted-foreground shrink-0" />
          <a
            :href="item.merchantWebsite"
            target="_blank"
            class="text-xs text-primary hover:underline truncate">
            {{ item.merchantWebsite }}
          </a>
        </div>

        <!-- ═══════════════════════════════════════════════════════════════
             Line Items / Invoice Breakdown
             ═══════════════════════════════════════════════════════════════ -->
        <div v-if="hasBreakdown || !isViewMode" class="border-t border-border">
          <!-- Line items table -->
          <div v-if="lineItems.length > 0 || !isViewMode" class="p-4 space-y-2">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Line Items</p>
              <button
                v-if="!isViewMode"
                class="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                @click="addLineItem">
                <Icon name="lucide:plus" class="h-3 w-3" />
                Add
              </button>
            </div>

            <!-- Header row -->
            <div v-if="lineItems.length > 0" class="grid grid-cols-[1fr_60px_80px_80px_24px] gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">
              <span>Description</span>
              <span class="text-right">Qty</span>
              <span class="text-right">Price</span>
              <span class="text-right">Total</span>
              <span></span>
            </div>

            <!-- Line item rows -->
            <div v-for="(li, i) in lineItems" :key="li.id" class="grid grid-cols-[1fr_60px_80px_80px_24px] gap-2 items-center group">
              <template v-if="!isViewMode">
                <input
                  v-model="li.description"
                  type="text"
                  placeholder="Item description"
                  class="text-xs bg-transparent outline-none placeholder:text-muted-foreground/40 px-1 py-1 rounded hover:bg-muted/30 focus:bg-muted/30 transition-colors" />
                <input
                  v-model.number="li.quantity"
                  type="number"
                  min="0"
                  step="1"
                  class="text-xs bg-transparent outline-none text-right tabular-nums px-1 py-1 rounded hover:bg-muted/30 focus:bg-muted/30 transition-colors"
                  @input="updateLineItemTotal(li)" />
                <input
                  v-model.number="li.unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  class="text-xs bg-transparent outline-none text-right tabular-nums px-1 py-1 rounded hover:bg-muted/30 focus:bg-muted/30 transition-colors"
                  @input="updateLineItemTotal(li)" />
                <span class="text-xs text-right tabular-nums px-1">{{ formatAmount(li.total) }}</span>
                <button
                  class="h-5 w-5 flex items-center justify-center rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="removeLineItem(Number(i))">
                  <Icon name="lucide:x" class="h-3 w-3 text-muted-foreground" />
                </button>
              </template>
              <template v-else>
                <span class="text-xs px-1">{{ li.description }}</span>
                <span class="text-xs text-right tabular-nums px-1">{{ li.quantity }}</span>
                <span class="text-xs text-right tabular-nums px-1">{{ formatAmount(li.unitPrice) }}</span>
                <span class="text-xs text-right tabular-nums font-medium px-1">{{ formatAmount(li.total) }}</span>
                <span></span>
              </template>
            </div>

            <!-- Empty state for edit mode -->
            <p v-if="!isViewMode && lineItems.length === 0" class="text-xs text-muted-foreground/50 italic text-center py-2">
              No line items — add items for a detailed breakdown
            </p>
          </div>

          <!-- Totals breakdown -->
          <div class="border-t border-border/60 p-4 space-y-1.5">
            <!-- Subtotal -->
            <div v-if="lineItems.length > 0" class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Subtotal</span>
              <span class="tabular-nums">{{ formatAmount(computedSubtotal) }}</span>
            </div>

            <!-- Tax -->
            <div v-if="item.taxAmount || item.taxRate || !isViewMode" class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-1.5">
                <span class="text-muted-foreground">Tax</span>
                <template v-if="!isViewMode">
                  <input
                    v-model.number="item.taxRate"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="%"
                    class="w-12 bg-transparent outline-none text-right tabular-nums text-[11px] text-muted-foreground placeholder:text-muted-foreground/40 rounded px-1 hover:bg-muted/30 focus:bg-muted/30"
                    @input="recalcTotals" />
                  <span class="text-muted-foreground/50 text-[10px]">%</span>
                </template>
                <span v-else-if="item.taxRate" class="text-muted-foreground/60 text-[10px]">({{ item.taxRate }}%)</span>
              </div>
              <span class="tabular-nums">{{ formatAmount(item.taxAmount || 0) }}</span>
            </div>

            <!-- Discount -->
            <div v-if="item.discount || !isViewMode" class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Discount</span>
              <div class="flex items-center gap-1">
                <span class="text-muted-foreground/50">−</span>
                <template v-if="!isViewMode">
                  <input
                    v-model.number="item.discount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="w-20 bg-transparent outline-none text-right tabular-nums text-xs placeholder:text-muted-foreground/40 rounded px-1 hover:bg-muted/30 focus:bg-muted/30"
                    @input="recalcTotals" />
                </template>
                <span v-else class="tabular-nums">{{ formatAmount(item.discount) }}</span>
              </div>
            </div>

            <!-- Tip -->
            <div v-if="item.tip || !isViewMode" class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Tip</span>
              <template v-if="!isViewMode">
                <input
                  v-model.number="item.tip"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-20 bg-transparent outline-none text-right tabular-nums text-xs placeholder:text-muted-foreground/40 rounded px-1 hover:bg-muted/30 focus:bg-muted/30"
                  @input="recalcTotals" />
              </template>
              <span v-else class="tabular-nums">{{ formatAmount(item.tip) }}</span>
            </div>

            <!-- Total divider -->
            <div class="border-t border-border pt-2 mt-2 flex items-center justify-between">
              <span class="text-sm font-semibold">Total</span>
              <span :class="['text-sm font-bold tabular-nums', directionColor]">
                {{ formatAmount(item.amount) }}
              </span>
            </div>

            <!-- Balance after -->
            <div v-if="item.balanceAfter != null" class="flex items-center justify-between text-xs pt-1">
              <span class="text-muted-foreground">Balance after</span>
              <span class="tabular-nums font-medium">{{ formatAmount(item.balanceAfter) }}</span>
            </div>
          </div>
        </div>

        <!-- Memo -->
        <div v-if="item.memo || !isViewMode" class="border-t border-border/60 p-4 space-y-1">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Memo</p>
          <template v-if="!isViewMode">
            <textarea
              v-model="item.memo"
              rows="2"
              placeholder="Add a note about this transaction..."
              class="w-full text-xs bg-transparent outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed" />
          </template>
          <p v-else class="text-xs text-foreground/80 leading-relaxed">{{ item.memo }}</p>
        </div>

        <!-- Counterparties -->
        <div v-if="item.counterparties?.length" class="border-t border-border/60 p-4 space-y-2">
          <p class="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Counterparties</p>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="cp in item.counterparties"
              :key="cp.name"
              class="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-lg bg-muted/60 text-xs">
              <div class="h-5 w-5 rounded flex items-center justify-center bg-muted shrink-0 overflow-hidden">
                <img v-if="cp.logoUrl" :src="cp.logoUrl" :alt="cp.name" class="h-5 w-5 object-cover rounded" />
                <Icon v-else name="lucide:building-2" class="h-3 w-3 text-muted-foreground" />
              </div>
              <span class="font-medium">{{ cp.name }}</span>
              <span v-if="cp.type" class="text-[9px] px-1.5 py-0.5 rounded bg-muted-foreground/10 text-muted-foreground capitalize">
                {{ cp.type?.replace('_', ' ') }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
