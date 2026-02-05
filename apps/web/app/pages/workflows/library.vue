<template>
  <Page
    variant="browse"
    subtitle="Forms"
    title="Template library"
    description="Placeholder gallery for form templates. Wire this to your presets or spaces marketplace.">
    <div class="grid gap-4 md:grid-cols-3">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Onboarding</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-muted-foreground text-sm">Collect team and workspace info.</p>
        </UiCardContent>
      </UiCard>
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Feedback</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-muted-foreground text-sm">Run async pulse checks.</p>
        </UiCardContent>
      </UiCard>
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Event RSVP</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-muted-foreground text-sm">Track responses for launches.</p>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
