<script setup lang="ts">
  const { resetTheme } = useTheme()

  onMounted(() => {
    resetTheme()
  })
</script>

<template>
  <div class="bg-background text-foreground flex min-h-dvh items-center justify-center">
    <slot />
  </div>
</template>
