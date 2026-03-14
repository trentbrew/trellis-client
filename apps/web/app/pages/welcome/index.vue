<script lang="ts" setup>
  definePageMeta({
    layout: 'onboarding',
  })

  const currentOrg = useState<any>('currentOrg')
  const currentApp = useState<any>('currentApp')

  // Real-time status from the auth middleware (set via useState('setup:status'))
  const setupStatus = useState<string>('setup:status', () => '')

  const fallbackMessage = 'Preparing your workspace…'
  const displayMessage = computed(() => setupStatus.value || fallbackMessage)

  // Track unique steps seen to drive the progress bar
  const stepsSeen = ref(1)
  const totalSteps = 5 // seed, migrations, loading workspace, almost ready, done
  const ready = ref(false)

  const progressPercent = computed(() => {
    if (ready.value) return 100
    return Math.min(Math.round((stepsSeen.value / totalSteps) * 90), 90)
  })

  // Watch for status changes to increment the progress bar
  watch(setupStatus, (val) => {
    if (val) stepsSeen.value++
  })

  onMounted(() => {
    // Poll until org/app are resolved by the middleware, then navigate
    const check = setInterval(async () => {
      if (currentOrg.value && currentApp.value) {
        ready.value = true
        clearInterval(check)

        // Brief pause so the user sees the final message before transition
        await new Promise((r) => setTimeout(r, 800))
        await navigateTo('/workspace')
      }
    }, 300)

    // Safety timeout — navigate anyway after 20s even if state isn't fully resolved
    setTimeout(async () => {
      if (!ready.value) {
        ready.value = true
        clearInterval(check)
        console.warn('[welcome] Timed out waiting for org/app — navigating anyway')
        await navigateTo('/workspace')
      }
    }, 20000)
  })
</script>

<template>
  <div class="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-background h-screen w-screen">
    <AppLogo size="48" class="animate-pulse" />

    <div class="flex flex-col items-center gap-2">
      <Transition name="fade" mode="out-in">
        <p :key="displayMessage" class="text-muted-foreground text-sm">
          {{ displayMessage }}
        </p>
      </Transition>
    </div>

    <div class="bg-muted h-1 w-48 overflow-hidden rounded-full">
      <div
        class="bg-primary h-full rounded-full transition-all duration-700 ease-out"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
  .fade-enter-active,
  .fade-leave-active {
    transition: opacity 0.2s ease;
  }
  .fade-enter-from,
  .fade-leave-to {
    opacity: 0;
  }
</style>
