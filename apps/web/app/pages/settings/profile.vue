<template>
  <Page
    variant="settings"
    subtitle="Profile"
    title="Your profile"
    description="Placeholder for account details. Link this to your auth provider and user settings.">
    <div class="grid gap-4 md:grid-cols-2">
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Avatar</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-muted-foreground text-sm">Drop in your avatar uploader or identity card.</p>
        </UiCardContent>
      </UiCard>
      <UiCard>
        <UiCardHeader>
          <UiCardTitle>Preferences</UiCardTitle>
        </UiCardHeader>
        <UiCardContent>
          <p class="text-muted-foreground text-sm">Wire toggles for themes, locale, and notification rules.</p>
        </UiCardContent>
      </UiCard>
    </div>
  </Page>
</template>
