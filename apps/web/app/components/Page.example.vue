<!--
  Example usage of the Page component

  This file demonstrates all the features of the Page component.
  You can use this as a reference when creating new pages.
-->

<template>
  <!-- Basic usage -->
  <Page
    subtitle="Section"
    subtitle-color="text-sky-300"
    title="Page Title"
    description="This is a description of what this page does."
  >
    <!-- Your page content here -->
    <div>Content goes here</div>
  </Page>

  <!-- With back button -->
  <Page
    subtitle="Dashboard"
    subtitle-color="text-blue-300"
    title="Analytics Overview"
    description="Track your key metrics."
    show-back-button
  >
    <div>Content</div>
  </Page>

  <!-- With icon -->
  <Page
    subtitle="Settings"
    subtitle-color="text-purple-300"
    title="Project Settings"
    description="Customize your experience."
    icon="lucide:settings"
    icon-class="text-purple-300"
  >
    <div>Content</div>
  </Page>

  <!-- With metadata badges -->
  <Page
    subtitle="Activity"
    subtitle-color="text-orange-300"
    title="Responses"
    description="View all responses."
    :metadata="['24 New', 'Pending']"
  >
    <div>Content</div>
  </Page>

  <!-- With CTA actions -->
  <Page
    subtitle="Forms"
    subtitle-color="text-emerald-300"
    title="Form Library"
    description="Manage your form templates."
  >
    <template #actions>
      <UiButton>Create Form</UiButton>
    </template>
    <div>Content</div>
  </Page>

  <!-- With custom slots -->
  <Page subtitle="Custom" subtitle-color="text-indigo-300" title="Custom Page">
    <template #title>
      Custom
      <span class="text-primary">Title</span>
    </template>
    <template #description>
      Custom
      <strong>description</strong>
      with HTML
    </template>
    <template #metadata>
      <span class="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold">Custom Badge</span>
    </template>
    <template #actions>
      <UiButton variant="outline">Cancel</UiButton>
      <UiButton>Save</UiButton>
    </template>
    <div>Content</div>
  </Page>

  <!-- With custom container class -->
  <Page title="Custom Layout" container-class="space-y-8 py-8" content-class="grid gap-4">
    <div>Content</div>
  </Page>

  <!-- Full width page (no max-width constraint) -->
  <Page
    subtitle="Dashboard"
    subtitle-color="text-blue-300"
    title="Full Width Dashboard"
    description="This page spans the full width of the viewport."
    full-width
  >
    <div>Full width content</div>
  </Page>

  <!-- With SEO (automatic from title/description, or custom) -->
  <Page
    title="SEO Optimized Page"
    description="This page has automatic SEO meta tags."
    seo-title="Custom SEO Title - App Name"
    seo-description="Custom SEO description for better search results."
  >
    <div>Content</div>
  </Page>
</template>
