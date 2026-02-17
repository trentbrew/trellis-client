<script setup lang="ts">
  const props = withDefaults(
    defineProps<{
      values: number[]
      color?: string
      width?: number
      height?: number
      strokeWidth?: number
      filled?: boolean
    }>(),
    {
      color: 'currentColor',
      width: 48,
      height: 16,
      strokeWidth: 1.5,
      filled: false,
    },
  )

  const pathD = computed(() => {
    const vals = props.values
    if (!vals.length) return ''

    const max = Math.max(...vals, 1)
    const min = Math.min(...vals, 0)
    const range = max - min || 1
    const w = props.width
    const h = props.height
    const pad = 1

    const points = vals.map((v, i) => {
      const x = vals.length === 1 ? w / 2 : (i / (vals.length - 1)) * (w - pad * 2) + pad
      const y = h - pad - ((v - min) / range) * (h - pad * 2)
      return { x, y }
    })

    if (points.length === 1) {
      return `M${points[0]!.x},${points[0]!.y}L${points[0]!.x},${points[0]!.y}`
    }

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('')
  })

  const fillPathD = computed(() => {
    if (!props.filled || !pathD.value) return ''
    return `${pathD.value}L${props.width - 1},${props.height - 1}L1,${props.height - 1}Z`
  })
</script>

<template>
  <svg
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    class="inline-block align-middle"
    preserveAspectRatio="none">
    <path
      v-if="filled && fillPathD"
      :d="fillPathD"
      :fill="color"
      fill-opacity="0.1"
      stroke="none" />
    <path
      v-if="pathD"
      :d="pathD"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round" />
  </svg>
</template>
