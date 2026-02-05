<script lang="ts" setup>
  import { useAppNavigate } from '~/composables/useAppNavigate'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    to: string
  }>()

  const appNavigate = useAppNavigate()
  const { selectedYear } = useYear()
  const { currentOrganization } = useOrganizations()
  const { currentFacility } = useFacilities()

  // Build full path with [org]/[year]/[facility] prefix for facility routes
  const resolvedPath = computed(() => {
    const path = props.to

    // Skip if path already has org prefix or is not a facility path
    if (!path.startsWith('/facility') || path.includes('/[')) {
      return path
    }

    // Check if we have the required context
    const orgSlug = currentOrganization.value?.slug
    const facilitySlug = currentFacility.value?.slug
    const year = selectedYear.value

    if (!orgSlug || !facilitySlug) {
      return path
    }

    // Transform /facility/tasks -> /[org]/[year]/[facility]/tasks
    const facilityPath = path.replace(/^\/facility/, '')
    return `/${orgSlug}/${year}/${facilitySlug}${facilityPath}`
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
