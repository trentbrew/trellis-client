<template>
  <Page
    variant="settings"
    subtitle="Notifications"
    title="Inbox"
    description="Placeholder inbox for alerts, releases, and system messages. Connect to your real notification service."
    fill-height>
    <UiEmpty class="h-full border bg-card/50">
      <UiEmptyMedia>
        <div class="flex size-16 items-center justify-center rounded-full bg-muted">
          <Icon name="lucide:inbox" class="size-7 text-muted-foreground" />
        </div>
      </UiEmptyMedia>
      <UiEmptyContent>
        <UiEmptyTitle>No messages yet</UiEmptyTitle>
        <UiEmptyDescription>
          When hooked up, this area will show unread and recent notices from your notification service.
        </UiEmptyDescription>
      </UiEmptyContent>
    </UiEmpty>
  </Page>
</template>
