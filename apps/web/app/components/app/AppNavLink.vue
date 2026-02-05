<script lang="ts" setup>
  import { useAppNavigate } from '~/composables/useAppNavigate'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    to: string
  }>()

  const appNavigate = useAppNavigate()
  const { workspace, app } = useContext()
  const { currentOrganization: currentWorkspace } = useOrganizations()
  const { currentFacility: currentApp } = useFacilities()

  // Build full path with [workspace]/[app] prefix for app routes
  const resolvedPath = computed(() => {
    const path = props.to

    // Skip if path already has workspace prefix or is not an app path
    if (!path.startsWith('/app') && !path.startsWith('/facility') || path.includes('/[')) {
      return path
    }

    // Check if we have the required context
    const workspaceSlug = currentWorkspace.value?.slug || workspace.value
    const appSlug = currentApp.value?.slug || app.value

    if (!workspaceSlug || !appSlug) {
      return path
    }

    // Transform /app/tasks -> /[workspace]/[app]/tasks
    const appPath = path.replace(/^\/app/, '').replace(/^\/facility/, '')
    return `/${workspaceSlug}/${appSlug}${appPath}`
  })

  const onClick = async (e: MouseEvent) => {
    // Allow new-tab/middle-click behavior to work normally.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    e.preventDefault()
    await appNavigate.navigate(resolvedPath.value, e)
  }
</script>

<template>
  <NuxtLink v-slot="{ href }" :to="resolvedPath" custom>
    <a :href="href" v-bind="$attrs" @click="onClick">
      <slot />
    </a>
  </NuxtLink>
</template>
