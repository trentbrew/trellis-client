<script setup lang="ts">
// Static beam configuration using percentage-based coordinates
const beams = [
  { from: { x: 15, y: 20 }, to: { x: 50, y: 50 }, curvature: -20, delay: 0, duration: 4.5 },
  { from: { x: 15, y: 50 }, to: { x: 50, y: 50 }, curvature: 0, delay: 0.8, duration: 5.2 },
  { from: { x: 15, y: 80 }, to: { x: 50, y: 50 }, curvature: 20, delay: 1.6, duration: 4.8 },
  { from: { x: 85, y: 20 }, to: { x: 50, y: 50 }, curvature: 20, delay: 2.4, duration: 5.0 },
  { from: { x: 85, y: 50 }, to: { x: 50, y: 50 }, curvature: 0, delay: 3.2, duration: 4.6 },
  { from: { x: 85, y: 80 }, to: { x: 50, y: 50 }, curvature: -20, delay: 0.4, duration: 5.4 },
]

function getPath(from: { x: number, y: number }, to: { x: number, y: number }, curvature: number) {
  const cx = (from.x + to.x) / 2
  const cy = from.y - curvature
  return `M ${from.x},${from.y} Q ${cx},${cy} ${to.x},${to.y}`
}
</script>

<template>
  <div class="relative flex h-44 w-full items-center justify-center overflow-hidden">
    <!-- Left column -->
    <div class="flex flex-col items-center justify-between h-full py-2 z-10">
      <div class="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm">
        <Icon name="simple-icons:notion" class="h-4 w-4 text-foreground" />
      </div>
      <div class="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm">
        <Icon name="simple-icons:slack" class="h-4 w-4 text-[#E01E5A]" />
      </div>
      <div class="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm">
        <Icon name="simple-icons:whatsapp" class="h-4 w-4 text-[#25D366]" />
      </div>
    </div>

    <div class="flex-1" />

    <!-- Center: Trellis logo -->
    <div class="z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background shadow-lg">
      <AppLogo :size="28" />
    </div>

    <div class="flex-1" />

    <!-- Right column -->
    <div class="flex flex-col items-center justify-between h-full py-2 z-10">
      <div class="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm">
        <Icon name="simple-icons:googledrive" class="h-4 w-4 text-[#4285F4]" />
      </div>
      <div class="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm">
        <Icon name="simple-icons:gmail" class="h-4 w-4 text-[#EA4335]" />
      </div>
      <div class="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm">
        <Icon name="simple-icons:messenger" class="h-4 w-4 text-[#0084FF]" />
      </div>
    </div>

    <!-- Static SVG beams - percentage-based positioning -->
    <svg
      class="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      fill="none"
    >
      <defs>
        <linearGradient id="beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f97316" stop-opacity="0" />
          <stop offset="32.5%" stop-color="#f97316" />
          <stop offset="67.5%" stop-color="#a855f7" />
          <stop offset="100%" stop-color="#a855f7" stop-opacity="0" />
        </linearGradient>
      </defs>

      <g v-for="(beam, i) in beams" :key="i">
        <!-- Background path (visible guide line) -->
        <path
          :d="getPath(beam.from, beam.to, beam.curvature)"
          stroke="hsl(var(--border))"
          stroke-width="1"
          stroke-opacity="0.5"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
        <!-- Animated beam -->
        <path
          :d="getPath(beam.from, beam.to, beam.curvature)"
          stroke="url(#beam-gradient)"
          stroke-width="1.5"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
          pathLength="1"
          class="animated-beam"
          :style="{
            animationDelay: `${beam.delay}s`,
            animationDuration: `${beam.duration}s`
          }"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.animated-beam {
  stroke-dasharray: 0.3 0.7;
  stroke-dashoffset: 0.3;
  animation: beam-travel linear infinite;
}
@keyframes beam-travel {
  from { stroke-dashoffset: 0.3; }
  to { stroke-dashoffset: -1.0; }
}
</style>
