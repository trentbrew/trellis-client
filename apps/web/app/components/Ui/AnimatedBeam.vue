<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick, computed } from 'vue'
import type { Ref, ShallowRef } from 'vue'

type ElRef = Ref<HTMLElement | null>

interface Props {
  containerRef: ElRef
  fromRef: ElRef
  toRef: ElRef
  curvature?: number
  reverse?: boolean
  pathColor?: string
  pathWidth?: number
  pathOpacity?: number
  gradientStartColor?: string
  gradientStopColor?: string
  delay?: number
  duration?: number
  startXOffset?: number
  startYOffset?: number
  endXOffset?: number
  endYOffset?: number
}

const props = withDefaults(defineProps<Props>(), {
  curvature: 0,
  reverse: false,
  pathColor: 'hsl(var(--border))',
  pathWidth: 2,
  pathOpacity: 0.2,
  gradientStartColor: '#f97316',
  gradientStopColor: '#a855f7',
  delay: 0,
  duration: 5,
  startXOffset: 0,
  startYOffset: 0,
  endXOffset: 0,
  endYOffset: 0,
})

const uid = Math.random().toString(36).slice(2, 9)
const svgW = ref(0)
const svgH = ref(0)
const pathD = ref('')
const gx1 = ref('0')
const gy1 = ref('0')
const gx2 = ref('0')
const gy2 = ref('0')
const isReady = ref(false)

const gradientId = computed(() => `beam-grad-${uid}`)

async function updatePath(retryCount = 0) {
  // Wait for next frame to ensure DOM is fully rendered
  await new Promise(resolve => requestAnimationFrame(resolve))
  await new Promise(resolve => requestAnimationFrame(resolve))

  const c = props.containerRef?.value
  const f = props.fromRef?.value
  const t = props.toRef?.value

  if (!c || !f || !t) {
    isReady.value = false
    if (retryCount < 20) {
      setTimeout(() => updatePath(retryCount + 1), 50)
    }
    return
  }

  const cr = c.getBoundingClientRect()
  const fr = f.getBoundingClientRect()
  const tr = t.getBoundingClientRect()

  // If container has no size, retry
  if (cr.width === 0 || cr.height === 0) {
    isReady.value = false
    if (retryCount < 20) {
      setTimeout(() => updatePath(retryCount + 1), 50)
    }
    return
  }

  svgW.value = cr.width
  svgH.value = cr.height

  const sx = fr.left - cr.left + fr.width / 2 + props.startXOffset
  const sy = fr.top - cr.top + fr.height / 2 + props.startYOffset
  const ex = tr.left - cr.left + tr.width / 2 + props.endXOffset
  const ey = tr.top - cr.top + tr.height / 2 + props.endYOffset
  const cy = sy - props.curvature
  const cx = (sx + ex) / 2

  pathD.value = `M ${sx},${sy} Q ${cx},${cy} ${ex},${ey}`

  if (props.reverse) {
    gx1.value = `${ex}`; gy1.value = `${ey}`
    gx2.value = `${sx}`; gy2.value = `${sy}`
  } else {
    gx1.value = `${sx}`; gy1.value = `${sy}`
    gx2.value = `${ex}`; gy2.value = `${ey}`
  }

  isReady.value = true
}

let ro: ResizeObserver | null = null

onMounted(async () => {
  // Wait a tick for all child refs to mount, then calculate
  await nextTick()
  await updatePath()

  if (props.containerRef?.value) {
    ro = new ResizeObserver(() => updatePath())
    ro.observe(props.containerRef.value)
  }
})

onUnmounted(() => ro?.disconnect())

// Watch for ref availability (they may mount after this component)
watch(() => [props.fromRef?.value, props.toRef?.value, props.containerRef?.value], (vals, oldVals) => {
  // Only update if refs changed from null to not-null
  const anyNew = vals.some((v, i) => v && !oldVals?.[i])
  if (anyNew) updatePath()
}, { immediate: false, flush: 'post' })
</script>

<template>
  <svg
    :width="svgW || '100%'"
    :height="svgH || '100%'"
    :viewBox="svgW && svgH ? `0 0 ${svgW} ${svgH}` : '0 0 100 100'"
    class="pointer-events-none absolute left-0 top-0 overflow-visible"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient
        :id="gradientId"
        gradientUnits="userSpaceOnUse"
        :x1="gx1" :y1="gy1"
        :x2="gx2" :y2="gy2"
      >
        <stop offset="0%"   :stop-color="gradientStartColor" stop-opacity="0" />
        <stop offset="32.5%" :stop-color="gradientStartColor" />
        <stop offset="67.5%" :stop-color="gradientStopColor" />
        <stop offset="100%" :stop-color="gradientStopColor"  stop-opacity="0" />
      </linearGradient>
    </defs>

    <path v-if="pathD" :d="pathD" :stroke="pathColor" :stroke-width="pathWidth" :stroke-opacity="pathOpacity" fill="none" />

    <path
      v-if="pathD"
      :d="pathD"
      pathLength="1"
      :stroke="`url(#${gradientId})`"
      :stroke-width="pathWidth"
      stroke-linecap="round"
      fill="none"
      class="animated-beam"
      :style="{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }"
    />
  </svg>
</template>

<style scoped>
.animated-beam {
  stroke-dasharray: 0.3 0.7;
  stroke-dashoffset: 0.3;
  animation: beam-travel linear infinite;
}
@keyframes beam-travel {
  from { stroke-dashoffset:  0.3; }
  to   { stroke-dashoffset: -1.0; }
}
</style>
