<script setup lang="ts">
  import { computed, onUnmounted, ref, watch } from 'vue'
  import { markdownToHtml } from '~/utils/markdown'
  import { renderAgentEntityReferences } from '~/utils/agentEntityReferences'
  import type { AgentMessage } from '~/types/agent'
  import type { Entity, EntityType } from '~/types/entity'

  const props = defineProps<{
    message: AgentMessage
  }>()

  const renderedContent = computed(() => {
    const raw = props.message.content
    if (!raw) return ''
    if (props.message.role === 'user') return raw
    try {
      return markdownToHtml(renderAgentEntityReferences(raw))
    } catch (e) {
      console.warn('[AgentMessage] markdown parse failed:', e)
      return raw
    }
  })

  const _emit = defineEmits<{
    action: [payload: any]
  }>()

  const accordionValue = ref<string | undefined>(props.message.content ? undefined : 'thinking')

  watch(
    () => props.message.content,
    (newContent) => {
      if (newContent && accordionValue.value === 'thinking') {
        accordionValue.value = undefined
      }
    },
  )

  const isUser = computed(() => props.message.role === 'user')
  const { items: entityItems } = useEntities()
  const dialogStack = useDialogStack()
  const mentionPreview = ref<{ entityId: string; rect: DOMRect } | null>(null)
  let hidePreviewTimer: ReturnType<typeof setTimeout> | null = null

  const mentionEntity = computed(() => {
    if (!mentionPreview.value) return null
    return entityItems.value.find((item) => item.id === mentionPreview.value!.entityId) ?? null
  })

  const mentionPreviewStyle = computed(() => {
    if (!mentionPreview.value) return {}
    const { top, left } = mentionPreview.value.rect
    return {
      position: 'fixed' as const,
      top: `${top - 8}px`,
      left: `${Math.max(8, Math.min(left, (typeof window !== 'undefined' ? window.innerWidth : 800) - 288))}px`,
      transform: 'translateY(-100%)',
      zIndex: 9998,
    }
  })

  function findMentionChip(target: EventTarget | null) {
    return (target as HTMLElement | null)?.closest?.('[data-type="mention"], .mention-chip') as HTMLElement | null
  }

  function normalizeMentionId(id: string | null) {
    return id?.replace(/^entity:/, '') ?? ''
  }

  function openMention(chip: HTMLElement | null) {
    const id = normalizeMentionId(chip?.getAttribute('data-id') ?? null)
    if (!id) return
    const entity = entityItems.value.find((item) => item.id === id)
    if (!entity) return
    dialogStack.push(id, entity.type as EntityType, entity as Entity)
  }

  function handleContentClick(event: MouseEvent) {
    const chip = findMentionChip(event.target)
    if (!chip) return
    openMention(chip)
    event.stopPropagation()
  }

  function handleContentKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const chip = findMentionChip(event.target)
    if (!chip) return
    openMention(chip)
    event.preventDefault()
    event.stopPropagation()
  }

  function handleContentMouseOver(event: MouseEvent) {
    const chip = findMentionChip(event.target)
    if (!chip) return
    if (hidePreviewTimer) {
      clearTimeout(hidePreviewTimer)
      hidePreviewTimer = null
    }
    const id = normalizeMentionId(chip.getAttribute('data-id'))
    if (id) mentionPreview.value = { entityId: id, rect: chip.getBoundingClientRect() }
  }

  function handleContentMouseLeave(event: MouseEvent) {
    const to = event.relatedTarget as HTMLElement | null
    if (to?.closest('[data-agent-mention-preview]')) return
    hidePreviewTimer = setTimeout(() => {
      mentionPreview.value = null
    }, 180)
  }

  function keepPreview() {
    if (hidePreviewTimer) {
      clearTimeout(hidePreviewTimer)
      hidePreviewTimer = null
    }
  }

  function startHidePreview() {
    hidePreviewTimer = setTimeout(() => {
      mentionPreview.value = null
    }, 180)
  }

  onUnmounted(() => {
    if (hidePreviewTimer) clearTimeout(hidePreviewTimer)
  })

  const timestamp = computed(() => {
    const date = new Date(props.message.timestamp)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  })

  /**
   * Routing badge derived from TokenRouter metadata.
   * Strips the provider prefix for readability and picks a concise task label.
   */
  const routingBadge = computed(() => {
    const r = props.message.routing
    if (!r?.model && !r?.provider) return null

    const rawModel = r.model ?? ''
    // Strip provider prefix (e.g. 'anthropic:claude-3-5-sonnet-20241022' → 'claude-3-5-sonnet-20241022')
    const modelLabel = rawModel.includes(':') ? rawModel.split(':')[1] : rawModel
    // Strip trailing date stamp if present (e.g. 'claude-3-5-sonnet-20241022' → 'claude-3-5-sonnet')
    const prettyModel = modelLabel?.replace(/-(\d{8})$/, '') ?? ''

    return {
      model: prettyModel,
      provider: r.provider || inferProviderFromModel(rawModel),
      taskClass: r.taskClass,
      rationale: r.rationale,
      router: r.router,
    }
  })

  function inferProviderFromModel(model: string): string | undefined {
    if (!model) return undefined
    if (model.startsWith('anthropic:') || model.includes('claude')) return 'anthropic'
    if (model.startsWith('openai:') || model.includes('gpt')) return 'openai'
    if (model.startsWith('gemini:') || model.includes('gemini')) return 'google'
    if (model.startsWith('auto:')) return 'auto'
    return undefined
  }
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
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
      ]">
      <!-- Routing badge: shows which model TokenRouter picked and why -->
      <UiTooltip v-if="!isUser && routingBadge">
        <UiTooltipTrigger as-child>
          <div
            class="mb-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-foreground cursor-help">
            <Icon name="lucide:route" class="h-2.5 w-2.5 text-primary" />
            <span class="font-mono">{{ routingBadge.model || routingBadge.provider }}</span>
            <template v-if="routingBadge.taskClass">
              <span class="text-muted-foreground">·</span>
              <span class="capitalize">{{ routingBadge.taskClass }}</span>
            </template>
          </div>
        </UiTooltipTrigger>
        <UiTooltipContent side="top" class="max-w-xs">
          <div class="space-y-1 text-xs">
            <div v-if="routingBadge.router" class="text-muted-foreground">
              Routed via
              <span class="font-semibold text-foreground">{{ routingBadge.router }}</span>
            </div>
            <div v-if="routingBadge.model">
              Model:
              <span class="font-mono">{{ routingBadge.model }}</span>
            </div>
            <div v-if="routingBadge.provider && routingBadge.provider !== 'auto'">
              Provider:
              <span class="font-mono">{{ routingBadge.provider }}</span>
            </div>
            <div v-if="routingBadge.rationale" class="pt-1 text-muted-foreground border-t border-border/40">
              {{ routingBadge.rationale }}
            </div>
          </div>
        </UiTooltipContent>
      </UiTooltip>

      <!-- Tool calls indicator (Thinking Accordion) -->
      <div v-if="!isUser && message.toolCalls && message.toolCalls.length > 0" class="mb-2">
        <UiAccordion v-model="accordionValue" type="single" class="w-full" collapsible>
          <UiAccordionItem value="thinking" class="border-b-0">
            <UiAccordionTrigger class="py-1 text-xs text-foreground hover:no-underline flex gap-1 justify-start">
              <Icon name="lucide:cpu" class="h-3.5 w-3.5" />
              <span>Thinking...</span>
            </UiAccordionTrigger>
            <UiAccordionContent class="pb-1 pt-0">
              <div
                class="space-y-1 bg-background rounded-md border border-border p-2 text-xs font-mono overflow-x-auto">
                <div v-for="(tool, idx) in message.toolCalls" :key="idx" class="opacity-90">
                  <div class="flex items-center gap-1 text-primary">
                    <Icon name="lucide:zap" class="h-3 w-3" />
                    <span>{{ tool.name }}</span>
                  </div>
                  <div
                    v-if="tool.args && Object.keys(tool.args).length > 0"
                    class="pl-4 mt-0.5 text-[10px] text-muted-foreground break-all">
                    {{ JSON.stringify(tool.args) }}
                  </div>
                </div>
              </div>
            </UiAccordionContent>
          </UiAccordionItem>
        </UiAccordion>
      </div>

      <!-- Content -->
      <div v-if="isUser && (message.content || message.attachments?.length)" class="space-y-2">
        <div v-if="message.content" class="whitespace-pre-wrap">{{ message.content }}</div>
        <div v-if="message.attachments?.length" class="flex flex-wrap gap-2">
          <AgentAttachmentChip
            v-for="attachment in message.attachments"
            :key="attachment.id"
            :attachment="attachment"
            variant="message" />
        </div>
      </div>
      <div
        v-else-if="message.content"
        class="prose prose-sm max-w-none text-foreground dark:prose-invert"
        @click.capture="handleContentClick"
        @keydown="handleContentKeydown"
        @mouseover="handleContentMouseOver"
        @mouseleave="handleContentMouseLeave"
        v-html="renderedContent" />

      <!-- Timestamp -->
      <div :class="['text-[10px] mt-1', isUser ? 'text-primary-foreground/60 text-right' : 'text-muted-foreground']">
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

  <Teleport to="body">
    <Transition name="mention-pop">
      <div
        v-if="mentionPreview && mentionEntity"
        data-agent-mention-preview
        :style="mentionPreviewStyle"
        class="w-72 overflow-hidden rounded-lg border border-border bg-popover shadow-lg pointer-events-auto"
        @mouseenter="keepPreview"
        @mouseleave="startHidePreview">
        <EntityPreviewCard :entity-id="mentionPreview.entityId" :entity-type="mentionEntity.type" />
        <div class="border-t border-border/50 bg-muted/20 px-3 py-1.5 text-[10px] text-muted-foreground">
          Click to open
        </div>
      </div>
    </Transition>
  </Teleport>
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

  .prose :deep(.mention-chip) {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    cursor: pointer;
    border-radius: 0.25rem;
    background: color-mix(in oklch, var(--primary) 12%, transparent);
    color: var(--primary);
    padding: 0 0.3em;
    font-size: 0.9em;
    font-weight: 500;
    text-decoration: none;
  }

  .prose :deep(.mention-chip:hover) {
    background: color-mix(in oklch, var(--primary) 18%, transparent);
  }

  .mention-pop-enter-active {
    transition:
      opacity 0.12s ease,
      transform 0.12s ease;
  }

  .mention-pop-leave-active {
    transition:
      opacity 0.08s ease,
      transform 0.08s ease;
  }

  .mention-pop-enter-from,
  .mention-pop-leave-to {
    opacity: 0;
    transform: translateY(-100%) translateY(4px);
  }

  /* Accordion overrides */
  :deep(.accordion-trigger svg.lucide-chevron-down) {
    height: 0.75rem;
    width: 0.75rem;
  }
</style>
