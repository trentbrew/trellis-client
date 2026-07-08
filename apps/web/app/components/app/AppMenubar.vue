<script lang="ts" setup>
  import MenubarVitals from './menubar/MenubarVitals.vue'
  import MenubarHostStats from './menubar/MenubarHostStats.vue'
  import MenubarWeather from './menubar/MenubarWeather.vue'
  import MenubarClock from './menubar/MenubarClock.vue'

  const { weather, host, prefs } = useAmbientBar()

  const showWeatherChip = computed(() => prefs.showWeather.value && weather.visible.value)
  const showHostChip = computed(() => prefs.showHostStats.value && host.visible.value)
  const showClockChip = computed(() => prefs.showClock.value)
</script>

<template>
  <nav
    data-slot="app-menubar"
    class="hidden md:flex shrink-0 items-center gap-3 app-region-no-drag"
    aria-label="Facility sky">
    <MenubarVitals />
    <MenubarHostStats v-if="showHostChip" />
    <MenubarWeather v-if="showWeatherChip" />
    <MenubarClock v-if="showClockChip" />
    <AppOmnibox variant="menubar" />
  </nav>
</template>
