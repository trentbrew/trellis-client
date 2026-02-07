<script lang="ts" setup>
  import type { EventType } from '~/types/calendarItem'
  import { EVENT_TYPE_OPTIONS } from '~/types/calendarItem'

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
  const eventTypeOpen = ref(false)
</script>

<template>
  <div class="divide-y divide-border">
    <!-- Event Type -->
    <div class="p-4 space-y-1.5">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Event Type</p>
      <UiPopover v-model:open="eventTypeOpen">
        <UiPopoverTrigger as-child>
          <button
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
            :class="EVENT_TYPE_OPTIONS.find((e) => e.value === item.eventType)?.color || 'bg-muted/50'">
            <Icon :name="EVENT_TYPE_OPTIONS.find((e) => e.value === item.eventType)?.icon || 'lucide:calendar'" class="h-3.5 w-3.5" />
            {{ EVENT_TYPE_OPTIONS.find((e) => e.value === item.eventType)?.label || 'Type' }}
          </button>
        </UiPopoverTrigger>
        <UiPopoverContent align="start" class="w-44 p-1">
          <button
            v-for="opt in EVENT_TYPE_OPTIONS"
            :key="opt.value"
            class="w-full px-2 py-1.5 text-xs text-left rounded hover:bg-muted flex items-center gap-2"
            @click="item.eventType = opt.value as EventType; eventTypeOpen = false">
            <Icon :name="opt.icon" class="h-3.5 w-3.5 text-muted-foreground" />
            <span class="flex-1">{{ opt.label }}</span>
            <Icon v-if="item.eventType === opt.value" name="lucide:check" class="h-3.5 w-3.5 text-primary" />
          </button>
        </UiPopoverContent>
      </UiPopover>
    </div>

    <!-- Location -->
    <div class="p-4 space-y-1.5">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
      <UiInput v-if="!isViewMode" v-model="item.location" placeholder="e.g. Conference Room A" class="text-sm" />
      <p v-else class="text-sm">{{ item.location || '—' }}</p>
    </div>

    <!-- Conference Link -->
    <div class="p-4 space-y-1.5">
      <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conference Link</p>
      <UiInput v-if="!isViewMode" v-model="item.conferenceLink" placeholder="https://..." class="text-sm" />
      <a v-else-if="item.conferenceLink" :href="item.conferenceLink" target="_blank" class="text-sm text-primary underline">
        {{ item.conferenceLink }}
      </a>
      <p v-else class="text-sm text-muted-foreground">—</p>
    </div>
  </div>
</template>
