<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Convert HSL string to hex for the color picker
const hslToHex = (hsl: string): string => {
  const parts = hsl.split(' ').map((p) => parseFloat(p))
  if (parts.length !== 3) return '#000000'

  const [h, s, l] = parts
  const sNorm = s / 100
  const lNorm = l / 100

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = lNorm - c / 2

  let r = 0,
    g = 0,
    b = 0
  if (h < 60) {
    r = c
    g = x
  } else if (h < 120) {
    r = x
    g = c
  } else if (h < 180) {
    g = c
    b = x
  } else if (h < 240) {
    g = x
    b = c
  } else if (h < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// Convert hex to HSL string
const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '0 0% 0%'

  const r = parseInt(result[1] ?? '0', 16) / 255
  const g = parseInt(result[2] ?? '0', 16) / 255
  const b = parseInt(result[3] ?? '0', 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) * 60
        break
      case g:
        h = ((b - r) / d + 2) * 60
        break
      case b:
        h = ((r - g) / d + 4) * 60
        break
    }
  }

  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

const hexValue = computed({
  get: () => hslToHex(props.modelValue),
  set: (hex: string) => emit('update:modelValue', hexToHsl(hex)),
})

const previewStyle = computed(() => ({
  backgroundColor: `hsl(${props.modelValue})`,
}))
</script>

<template>
  <div class="flex items-center gap-2">
    <label v-if="label" class="text-xs font-medium text-muted-foreground w-28 shrink-0">
      {{ label }}
    </label>
    <div class="flex items-center gap-2 flex-1">
      <div class="w-8 h-8 rounded border shrink-0" :style="previewStyle" />
      <input
        v-model="hexValue"
        type="color"
        class="w-8 h-8 rounded border cursor-pointer shrink-0"
        :title="label" />
      <UiInput :model-value="modelValue" class="flex-1 font-mono text-xs" @update:model-value="emit('update:modelValue', $event)" />
    </div>
  </div>
</template>
