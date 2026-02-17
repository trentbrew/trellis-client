<script setup lang="ts">
  import { getRouteMeta } from '~/config/routes'

  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()

  const routeMeta = computed(() => getRouteMeta(route.path))

  useHead(() => {
    const title = routeMeta.value?.title || 'Platform Sandbox'
    return { title }
  })
</script>

<template>
  <Page
    :subtitle="routeMeta?.subtitle || 'Platform Sandbox'"
    :title="routeMeta?.title || route.path"
    :description="
      routeMeta?.description || 'This page is part of the Platform Sandbox prototype and has not been implemented yet.'
    "
    icon="lucide:construction"
    icon-class="text-amber-300">
    <div class="rounded-xl border border-dashed border-border bg-muted/30 p-12">
      <div class="flex items-start gap-4">
        <div class="mt-0.5">
          <Icon name="lucide:construction" class="h-10 w-10 text-muted-foreground opacity-70" />
        </div>
        <div class="space-y-2">
          <div class="text-sm text-muted-foreground">Prototype placeholder</div>
          <div class="text-base font-medium">{{ route.path }}</div>
          <div class="text-sm text-muted-foreground">
            Create a page at
            <code class="rounded bg-foreground/5 px-1.5 py-0.5">app/pages{{ route.path }}/index.vue</code>
            (or the corresponding Nuxt route file) to replace this placeholder.
          </div>
          <div class="pt-2">
            <UiButton variant="outline" as-child>
              <NuxtLink to="/workspace/tasks">Go to My Tasks</NuxtLink>
            </UiButton>
          </div>
        </div>
      </div>
    </div>
  </Page>
</template>
