<script setup lang="ts">
  import type { PermitCondition } from './ConditionCard.vue'

  interface Props {
    condition: PermitCondition
    isActive?: boolean
    position?: { x: number; y: number }
  }

  const props = withDefaults(defineProps<Props>(), {
    isActive: false,
    position: () => ({ x: 0, y: 0 }),
  })

  const emit = defineEmits<{
    select: [condition: PermitCondition]
    'go-to-page': [page: number]
    close: []
  }>()

  const isExpanded = ref(false)

  const bubbleRef = ref<HTMLElement>()

  function getTypeBadgeClass(type: PermitCondition['type']) {
    const classes: Record<string, string> = {
      monitoring: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      recordkeeping: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      reporting: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      other: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    }
    return classes[type || 'other'] || classes.other
  }

  function handleClick() {
    if (!isExpanded.value) {
      isExpanded.value = true
      emit('select', props.condition)
    }
  }

  function handleClose(e: Event) {
    e.stopPropagation()
    isExpanded.value = false
  }

  function handleGoToPage() {
    emit('go-to-page', props.condition.page)
  }

  onClickOutside(bubbleRef, () => {
    if (isExpanded.value) {
      isExpanded.value = false
    }
  })
</script>

<template>
  <div
    ref="bubbleRef"
    class="condition-bubble"
    :class="[isExpanded ? 'expanded' : 'collapsed', isActive ? 'active' : '']"
    :style="{
      '--bubble-x': `${position.x}px`,
      '--bubble-y': `${position.y}px`,
    }"
    @click="handleClick">
    <!-- Collapsed State: Small pill indicator -->
    <div v-if="!isExpanded" class="bubble-collapsed">
      <span class="bubble-number">{{ condition.number }}</span>
      <span v-if="condition.needsTask" class="bubble-alert">
        <Icon name="lucide:alert-circle" class="size-2.5" />
      </span>
    </div>

    <!-- Expanded State: Full card with frosted glass -->
    <Transition name="bubble-expand">
      <div v-if="isExpanded" class="bubble-expanded">
        <!-- Header -->
        <div class="bubble-header">
          <div class="flex items-center gap-2">
            <span class="bubble-number-lg">{{ condition.number }}</span>
            <span :class="getTypeBadgeClass(condition.type)" class="rounded border px-1.5 py-0.5 text-xs capitalize">
              {{ condition.type || 'Other' }}
            </span>
          </div>
          <button class="bubble-close" @click="handleClose">
            <Icon name="lucide:x" class="size-3.5" />
          </button>
        </div>

        <!-- Content -->
        <div class="bubble-content">
          <p class="bubble-quote">"{{ condition.quote }}"</p>

          <div v-if="condition.taskDescription" class="bubble-field">
            <span class="bubble-label">Task</span>
            <span class="bubble-value">{{ condition.taskDescription }}</span>
          </div>

          <div v-if="condition.limits" class="bubble-field">
            <span class="bubble-label">Limits</span>
            <span class="bubble-value whitespace-pre-line">{{ condition.limits }}</span>
          </div>

          <div v-if="condition.specificUnits?.length" class="bubble-field">
            <span class="bubble-label">Units</span>
            <div class="flex flex-wrap gap-1">
              <span
                v-for="unit in condition.specificUnits"
                :key="unit"
                class="rounded bg-white/10 px-1.5 py-0.5 text-xs">
                {{ unit }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="bubble-footer">
          <button class="bubble-page-link" @click.stop="handleGoToPage">
            <Icon name="lucide:file-text" class="size-3" />
            Page {{ condition.page }}
          </button>
          <div v-if="condition.needsTask" class="bubble-needs-task">
            <Icon name="lucide:alert-circle" class="size-3" />
            Task needed
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
  .condition-bubble {
    position: absolute;
    left: var(--bubble-x);
    top: var(--bubble-y);
    z-index: 50;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .bubble-collapsed {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 8px;
    border-radius: 9999px;
    background: rgba(139, 92, 246, 0.9);
    backdrop-filter: blur(8px);
    box-shadow:
      0 4px 12px rgba(139, 92, 246, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .bubble-collapsed:hover {
    transform: scale(1.05);
    box-shadow:
      0 6px 16px rgba(139, 92, 246, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }

  .condition-bubble.active .bubble-collapsed {
    background: rgba(139, 92, 246, 1);
    box-shadow:
      0 0 0 3px rgba(139, 92, 246, 0.3),
      0 4px 12px rgba(139, 92, 246, 0.4);
  }

  .bubble-number {
    font-size: 11px;
    font-weight: 600;
    color: white;
    line-height: 1;
  }

  .bubble-alert {
    color: rgba(251, 191, 36, 1);
  }

  .bubble-number-lg {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 9999px;
    background: rgba(139, 92, 246, 0.3);
    font-size: 12px;
    font-weight: 600;
    color: white;
  }

  .bubble-expanded {
    width: 320px;
    max-height: 400px;
    overflow: hidden;
    border-radius: 12px;
    background: rgba(30, 30, 40, 0.85);
    backdrop-filter: blur(16px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.3),
      0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  }

  .bubble-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .bubble-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.6);
    transition: all 0.15s ease;
  }

  .bubble-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .bubble-content {
    padding: 12px;
    max-height: 280px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .bubble-quote {
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9);
    font-style: italic;
  }

  .bubble-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bubble-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.5);
  }

  .bubble-value {
    font-size: 12px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.8);
  }

  .bubble-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }

  .bubble-page-link {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: rgba(139, 92, 246, 0.9);
    transition: color 0.15s ease;
  }

  .bubble-page-link:hover {
    color: rgba(139, 92, 246, 1);
  }

  .bubble-needs-task {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: rgba(251, 191, 36, 0.9);
  }

  /* Expansion animation */
  .bubble-expand-enter-active,
  .bubble-expand-leave-active {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: top left;
  }

  .bubble-expand-enter-from,
  .bubble-expand-leave-to {
    opacity: 0;
    transform: scale(0.9);
  }
</style>
