<script setup lang="ts">
  import type { ZonePresencePeer } from '~/composables/useZonePresence'

  const props = withDefaults(
    defineProps<{
      peers: ZonePresencePeer[]
      maxVisible?: number
    }>(),
    { maxVisible: 4 },
  )

  const visible = computed(() => props.peers.slice(0, props.maxVisible))
  const overflow = computed(() => Math.max(0, props.peers.length - props.maxVisible))
  const overflowNames = computed(() =>
    props.peers
      .slice(props.maxVisible)
      .map((p) => p.name)
      .join(', '),
  )

  function tip(p: ZonePresencePeer) {
    const bits = [p.name]
    if (p.self) bits.push('you')
    if (p.away) bits.push('away')
    if (p.route) bits.push(p.route)
    return bits.join(' · ')
  }
</script>

<template>
  <div
    v-if="peers.length > 0"
    data-testid="zone-presence-avatars"
    class="flex items-center"
    aria-label="People in this zone"
    role="group">
    <span
      v-for="(p, i) in visible"
      :key="p.id"
      class="flex size-6 items-center justify-center rounded-full border-2 border-background text-[10px] font-semibold text-white"
      :class="i > 0 ? '-ml-1.5' : ''"
      :style="{
        background: p.away ? 'var(--muted, #3a3a44)' : p.color,
        color: p.away ? 'var(--muted-foreground)' : '#fff',
      }"
      :title="tip(p)"
      aria-hidden="true"
      tabindex="-1">
      {{ p.initials }}
    </span>
    <span
      v-if="overflow > 0"
      class="-ml-1.5 flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-muted-foreground"
      :title="overflowNames"
      aria-hidden="true"
      tabindex="-1">
      +{{ overflow }}
    </span>
  </div>
</template>
