<script lang="ts" setup>
  import type { TripStatus, TransportMode } from '~/types/calendarItem'
  import { TRIP_STATUS_OPTIONS, TRANSPORT_OPTIONS } from '~/types/calendarItem'

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
  const tripStatusOpen = ref(false)
  const transportOpen = ref(false)
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Origin / Destination -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Origin</p>
        <UiInput v-if="!isViewMode" v-model="item.origin" placeholder="Departure city" class="text-sm" />
        <p v-else class="text-sm">{{ item.origin || '—' }}</p>
      </div>
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Destination</p>
        <UiInput v-if="!isViewMode" v-model="item.destination" placeholder="Arrival city" class="text-sm" />
        <p v-else class="text-sm">{{ item.destination || '—' }}</p>
      </div>
    </div>

    <!-- Transportation / Trip Status -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transportation</p>
        <UiPopover v-model:open="transportOpen">
          <UiPopoverTrigger as-child>
            <button class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-muted/50 hover:bg-muted transition-colors">
              <Icon :name="TRANSPORT_OPTIONS.find((t) => t.value === item.transportation)?.icon || 'lucide:navigation'" class="h-3.5 w-3.5" />
              {{ TRANSPORT_OPTIONS.find((t) => t.value === item.transportation)?.label || 'Mode' }}
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-40 p-1">
            <button
              v-for="opt in TRANSPORT_OPTIONS"
              :key="opt.value"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="item.transportation = opt.value as TransportMode; transportOpen = false">
              <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="flex-1">{{ opt.label }}</span>
              <Icon v-if="item.transportation === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </UiPopoverContent>
        </UiPopover>
      </div>
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trip Status</p>
        <UiPopover v-model:open="tripStatusOpen">
          <UiPopoverTrigger as-child>
            <button
              class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              :class="TRIP_STATUS_OPTIONS.find((s) => s.value === item.tripStatus)?.color || 'bg-muted/50'">
              <Icon :name="TRIP_STATUS_OPTIONS.find((s) => s.value === item.tripStatus)?.icon || 'lucide:map'" class="h-3.5 w-3.5" />
              {{ TRIP_STATUS_OPTIONS.find((s) => s.value === item.tripStatus)?.label || 'Status' }}
            </button>
          </UiPopoverTrigger>
          <UiPopoverContent align="start" class="w-44 p-1">
            <button
              v-for="opt in TRIP_STATUS_OPTIONS"
              :key="opt.value"
              class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
              @click="item.tripStatus = opt.value as TripStatus; tripStatusOpen = false">
              <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
              <span class="flex-1">{{ opt.label }}</span>
              <Icon v-if="item.tripStatus === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
            </button>
          </UiPopoverContent>
        </UiPopover>
      </div>
    </div>

    <!-- Budget / Confirmation -->
    <div class="p-4 grid grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</p>
        <UiInput v-if="!isViewMode" v-model.number="item.budget" type="number" placeholder="0.00" class="text-sm" />
        <p v-else class="text-sm">{{ item.budget ? `${item.currency || '$'}${item.budget}` : '—' }}</p>
      </div>
      <div class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Confirmation #</p>
        <UiInput v-if="!isViewMode" v-model="item.confirmationNumber" placeholder="ABC123" class="text-sm" />
        <p v-else class="text-sm">{{ item.confirmationNumber || '—' }}</p>
      </div>
    </div>
  </div>
</template>
