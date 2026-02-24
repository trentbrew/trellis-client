<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AgentMessage } from '~/types/agent'

const props = defineProps<{
  message: AgentMessage
}>()

const _emit = defineEmits<{
  action: [payload: any]
}>()

const accordionValue = ref<string | undefined>(props.message.content ? undefined : 'thinking')

watch(() => props.message.content, (newContent) => {
  if (newContent && accordionValue.value === 'thinking') {
    accordionValue.value = undefined
  }
})

const isUser = computed(() => props.message.role === 'user')
const timestamp = computed(() => {
  const date = new Date(props.message.timestamp)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
})
</script>

<template>
  <div :class="['flex gap-2 items-start', isUser ? 'justify-end' : 'justify-start']">
    <!-- Icon (assistant only) -->
    <div v-if="!isUser" class="shrink-0 mt-1">
      <div class="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon name="lucide:bot" class="h-3.5 w-3.5 text-primary" />
      </div>
    </div>

    <!-- Message bubble -->
    <div
      :class="[
        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground',
      ]">

      <!-- Tool calls indicator (Thinking Accordion) -->
      <div v-if="!isUser && message.toolCalls && message.toolCalls.length > 0" class="mb-2">
        <UiAccordion v-model="accordionValue" type="single" class="w-full" collapsible>
          <UiAccordionItem value="thinking" class="border-b-0">
            <UiAccordionTrigger class="py-1 text-xs text-muted-foreground hover:no-underline flex gap-1 justify-start">
              <Icon name="lucide:cpu" class="h-3.5 w-3.5" />
              <span>Thinking...</span>
            </UiAccordionTrigger>
            <UiAccordionContent class="pb-1 pt-0">
              <div class="space-y-1 bg-background/50 rounded-md p-2 text-xs font-mono overflow-x-auto">
                <div v-for="(tool, idx) in message.toolCalls" :key="idx" class="opacity-80">
                  <div class="flex items-center gap-1 text-primary">
                    <Icon name="lucide:zap" class="h-3 w-3" />
                    <span>{{ tool.name }}</span>
                  </div>
                  <div v-if="tool.args && Object.keys(tool.args).length > 0" class="pl-4 mt-0.5 text-[10px] opacity-70 break-all">
                    {{ JSON.stringify(tool.args) }}
                  </div>
                </div>
              </div>
            </UiAccordionContent>
          </UiAccordionItem>
        </UiAccordion>
      </div>

      <!-- Content -->
      <div
        v-if="message.content"
        class="whitespace-pre-wrap">
        {{ message.content }}
      </div>

      <!-- Timestamp -->
      <div
        :class="[
          'text-[10px] mt-1',
          isUser ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground',
        ]">
        {{ timestamp }}
      </div>
    </div>

    <!-- Icon (user only) -->
    <div v-if="isUser" class="shrink-0 mt-1">
      <div class="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
        <Icon name="lucide:user" class="h-3.5 w-3.5 text-primary" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure markdown prose doesn't conflict with message bubble styling */
:deep(.prose) {
  color: inherit;
}

:deep(.prose p) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

:deep(.prose p:first-child) {
  margin-top: 0;
}

:deep(.prose p:last-child) {
  margin-bottom: 0;
}

:deep(.prose code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

:deep(.prose pre) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.75rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

:deep(.prose ul),
:deep(.prose ol) {
  margin-top: 0.5em;
  margin-bottom: 0.5em;
}

/* Accordion overrides */
:deep(.accordion-trigger svg.lucide-chevron-down) {
  height: 0.75rem;
  width: 0.75rem;
}
</style>
