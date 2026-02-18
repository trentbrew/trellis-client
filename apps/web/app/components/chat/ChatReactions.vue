<script setup lang="ts">
  const props = defineProps<{
    reactions: Record<string, string[]>
    currentUserId?: string
  }>()

  const emit = defineEmits<{
    add: [emoji: string]
    remove: [emoji: string]
  }>()

  const reactionList = computed(() =>
    Object.entries(props.reactions ?? {}).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      hasReacted: props.currentUserId ? users.includes(props.currentUserId) : false,
    })),
  )

  function toggle(emoji: string, hasReacted: boolean) {
    if (hasReacted) emit('remove', emoji)
    else emit('add', emoji)
  }
</script>

<template>
  <div v-if="reactionList.length" class="flex flex-wrap gap-1 mt-1">
    <button
      v-for="r in reactionList"
      :key="r.emoji"
      class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors"
      :class="r.hasReacted
        ? 'bg-primary/15 border-primary/40 text-primary hover:bg-primary/25'
        : 'bg-muted/40 border-border hover:bg-muted/70 text-foreground'"
      @click="toggle(r.emoji, r.hasReacted)"
    >
      <span>{{ r.emoji }}</span>
      <span class="font-medium tabular-nums">{{ r.count }}</span>
    </button>
  </div>
</template>
