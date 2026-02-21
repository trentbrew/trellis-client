<script setup lang="ts">
import { motion } from 'motion-v'

interface Props {
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  size: 28,
})

const animateState = ref<'normal' | 'animate'>('normal')

const line1Variants = {
  normal: { rotate: 0, y: 0, opacity: 1 },
  animate: { rotate: 45, y: 6, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
}
const line2Variants = {
  normal: { rotate: 0, y: 0, opacity: 1 },
  animate: { rotate: 0, y: 0, opacity: 0, transition: { type: 'spring', stiffness: 260, damping: 20 } },
}
const line3Variants = {
  normal: { rotate: 0, y: 0, opacity: 1 },
  animate: { rotate: -45, y: -6, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } },
}

const startAnimation = () => { animateState.value = 'animate' }
const stopAnimation = () => { animateState.value = 'normal' }

defineExpose({ startAnimation, stopAnimation })
</script>

<template>
  <svg
    fill="none"
    :height="props.size"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    :width="props.size"
    xmlns="http://www.w3.org/2000/svg"
  >
    <motion.line
      :animate="animateState"
      :variants="line1Variants"
      initial="normal"
      x1="4" x2="20" y1="6" y2="6"
    />
    <motion.line
      :animate="animateState"
      :variants="line2Variants"
      initial="normal"
      x1="4" x2="20" y1="12" y2="12"
    />
    <motion.line
      :animate="animateState"
      :variants="line3Variants"
      initial="normal"
      x1="4" x2="20" y1="18" y2="18"
    />
  </svg>
</template>
