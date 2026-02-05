<template>
  <Page
    variant="settings"
    subtitle="Settings"
    title="Project settings"
    description="Customize your experience with toggles and preferences.">
    <div class="space-y-3">
      <UiCard>
        <UiCardContent class="p-0">
          <div class="flex items-center justify-between px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="bg-muted flex size-9 items-center justify-center rounded-lg">
                <Icon name="lucide:bell" class="text-muted-foreground size-4" />
              </div>
              <div>
                <p class="text-foreground text-sm font-semibold">Notifications</p>
                <p class="text-muted-foreground text-xs">Route the bell icon to your notifier preferences.</p>
              </div>
            </div>
            <span class="bg-muted text-muted-foreground rounded-full px-3 py-1 text-xs font-semibold">Pending</span>
          </div>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
