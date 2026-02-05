<script setup lang="ts">
  definePageMeta({
    layout: 'marketing',
  })

  const instant = useInstantDb()

  onMounted(async () => {
    const user = await instant.getAuth()
    if (user) {
      await navigateTo('/welcome')
    }
  })
</script>

<template>
  <div class="relative overflow-hidden">
    <UiContainer constrained class="py-16 sm:py-24">
      <div class="mx-auto max-w-3xl text-center space-y-6">
        <div class="flex items-center justify-center">
          <UiBadge variant="secondary" class="px-3 py-1">Beta</UiBadge>
        </div>

        <h1 class="text-4xl sm:text-5xl font-bold tracking-tight">Environmental Compliance Made Simple</h1>
        <p class="text-muted-foreground text-base sm:text-lg">
          Streamline your facility's compliance workflows with powerful task management, scheduling, and reporting tools
          designed for environmental and safety teams.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <UiButton size="lg" as-child>
            <NuxtLink to="/auth/signup">Get started</NuxtLink>
          </UiButton>
          <UiButton size="lg" variant="outline" as-child>
            <NuxtLink to="/auth/login">Sign in</NuxtLink>
          </UiButton>
        </div>
      </div>

      <div class="mx-auto mt-12 max-w-5xl">
        <div
          class="aspect-video rounded-2xl border border-border bg-card/60 shadow-sm overflow-hidden flex items-center justify-center">
          <div class="text-center px-6">
            <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Icon name="lucide:image" class="h-6 w-6 text-muted-foreground" />
            </div>
            <div class="text-sm font-medium">App screenshot</div>
            <div class="text-xs text-muted-foreground mt-1">Placeholder — drop in a hero image when ready</div>
          </div>
        </div>
      </div>

      <div class="mt-14 grid gap-4 sm:grid-cols-3">
        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Icon name="lucide:list-checks" class="h-4 w-4" />
              Task Management
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <p class="text-muted-foreground text-sm">
              Track compliance tasks with powerful filtering, scheduling, and status tracking.
            </p>
          </UiCardContent>
        </UiCard>

        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Icon name="lucide:calendar-check" class="h-4 w-4" />
              Scheduling
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <p class="text-muted-foreground text-sm">
              Set up recurring inspections, reports, and compliance deadlines with smart reminders.
            </p>
          </UiCardContent>
        </UiCard>

        <UiCard>
          <UiCardHeader>
            <UiCardTitle class="flex items-center gap-2">
              <Icon name="lucide:layout-dashboard" class="h-4 w-4" />
              Facility Dashboard
            </UiCardTitle>
          </UiCardHeader>
          <UiCardContent>
            <p class="text-muted-foreground text-sm">
              Monitor compliance status across all your facilities with real-time dashboards.
            </p>
          </UiCardContent>
        </UiCard>
      </div>

      <div class="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <div class="text-lg font-semibold">Ready to get started?</div>
            <div class="text-sm text-muted-foreground">
              Sign in to set up your facility workspace and start tracking compliance.
            </div>
          </div>
          <div class="flex gap-2">
            <UiButton as-child>
              <NuxtLink to="/auth/signup">Create account</NuxtLink>
            </UiButton>
            <UiButton variant="outline" as-child>
              <NuxtLink to="/auth/login">Sign in</NuxtLink>
            </UiButton>
          </div>
        </div>
      </div>
    </UiContainer>
  </div>
</template>
