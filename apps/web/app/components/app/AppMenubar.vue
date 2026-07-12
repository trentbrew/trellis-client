<script lang="ts" setup>
  import MenubarWeather from './menubar/MenubarWeather.vue'

  const { weather, prefs } = useAmbientBar()

  const showWeatherChip = computed(() => prefs.showWeather.value && weather.visible.value)
</script>

<template>
  <nav
    v-if="showWeatherChip"
    data-slot="app-menubar"
    class="hidden md:flex shrink-0 items-center app-region-no-drag"
    aria-label="Facility sky">
    <MenubarWeather />
  </nav>
</template>
