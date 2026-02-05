<script setup lang="ts">
  export interface PermitCondition {
    id: string
    number: number
    page: number
    reference: string
    type:
      | 'inspection'
      | 'report'
      | 'monitoring'
      | 'notification'
      | 'training'
      | 'update-review'
      | 'plan'
      | 'registration'
      | 'testing'
      | 'safety'
      | 'calibration'
      | 'other'
    quote: string
    taskDescription?: string
    valuableAsAuditItem: boolean
    limits?: string
    affiliation?: string
    specificUnits?: string[]
    taskAssociations?: { id: string; title: string }[]
    needsTask: boolean
  }

  interface Props {
    condition: PermitCondition
    isActive?: boolean
    isCompact?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    isActive: false,
    isCompact: false,
  })

  const emit = defineEmits<{
    select: [condition: PermitCondition]
    edit: [condition: PermitCondition]
    linkTask: [condition: PermitCondition]
    goToPage: [page: number]
  }>()

  const isExpanded = ref(!props.isCompact)

  const typeColors: Record<PermitCondition['type'], string> = {
    inspection: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    report: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    monitoring: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    notification: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    training: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    'update-review': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    plan: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
    registration: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    testing: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    safety: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    calibration: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const typeLabel = computed(() => {
    const labels: Record<PermitCondition['type'], string> = {
      inspection: 'Inspection',
      report: 'Report',
      monitoring: 'Monitoring',
      notification: 'Notification',
      training: 'Training',
      'update-review': 'Update/Review',
      plan: 'Plan',
      registration: 'Registration',
      testing: 'Testing',
      safety: 'Safety',
      calibration: 'Calibration',
      other: 'Other',
    }
    return labels[props.condition.type]
  })

  function handleCardClick() {
    emit('select', props.condition)
  }

  function handleGoToPage() {
    emit('goToPage', props.condition.page)
  }
</script>

<template>
  <div
    :class="[
      'group cursor-pointer rounded-lg border transition-all duration-200',
      isActive
        ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
        : 'border-border bg-card hover:border-primary/30 hover:bg-accent/50',
    ]"
    @click="handleCardClick">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3 p-3">
      <div class="flex items-start gap-3">
        <button
          type="button"
          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent"
          @click.stop="isExpanded = !isExpanded">
          <Icon
            :name="isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-right'"
            class="size-4 transition-transform" />
        </button>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-medium">Condition #{{ condition.number }}</span>
            <span :class="['rounded-full px-2 py-0.5 text-xs font-medium', typeColors[condition.type]]">
              {{ typeLabel }}
            </span>
          </div>
          <button
            type="button"
            class="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            @click.stop="handleGoToPage">
            <Icon name="lucide:file-text" class="size-3" />
            Page {{ condition.page }} · Ref {{ condition.reference }}
          </button>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <UiButton
          variant="ghost"
          size="icon"
          class="size-7"
          title="Edit condition"
          @click.stop="emit('edit', condition)">
          <Icon name="lucide:pencil" class="size-3.5" />
        </UiButton>
        <UiButton
          variant="ghost"
          size="icon"
          class="size-7"
          title="Link task"
          @click.stop="emit('linkTask', condition)">
          <Icon name="lucide:link" class="size-3.5" />
        </UiButton>
      </div>
    </div>

    <!-- Expanded content -->
    <div v-show="isExpanded" class="border-t border-border px-3 pb-3 pt-2">
      <!-- Quote -->
      <div class="mb-3">
        <p class="text-sm leading-relaxed text-foreground/90">"{{ condition.quote }}"</p>
      </div>

      <!-- Details grid -->
      <div class="space-y-2 text-xs">
        <div v-if="condition.taskDescription" class="flex gap-2">
          <span class="shrink-0 font-medium text-muted-foreground">Task:</span>
          <span class="text-foreground/80">{{ condition.taskDescription }}</span>
        </div>

        <div class="flex gap-2">
          <span class="shrink-0 font-medium text-muted-foreground">Audit Item:</span>
          <span :class="condition.valuableAsAuditItem ? 'text-emerald-600' : 'text-muted-foreground'">
            {{ condition.valuableAsAuditItem ? 'Yes' : 'No' }}
          </span>
        </div>

        <div v-if="condition.limits" class="flex gap-2">
          <span class="shrink-0 font-medium text-muted-foreground">Limits:</span>
          <span class="text-foreground/80">{{ condition.limits }}</span>
        </div>

        <div v-if="condition.specificUnits?.length" class="flex gap-2">
          <span class="shrink-0 font-medium text-muted-foreground">Units:</span>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="unit in condition.specificUnits"
              :key="unit"
              class="rounded bg-muted px-1.5 py-0.5 text-foreground/80">
              {{ unit }}
            </span>
          </div>
        </div>

        <div v-if="condition.needsTask" class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Icon name="lucide:alert-circle" class="size-3.5" />
          <span class="font-medium">Task needed</span>
        </div>
      </div>
    </div>
  </div>
</template>
