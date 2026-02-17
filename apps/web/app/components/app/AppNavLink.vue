<script lang="ts" setup>
  import { useAppNavigate } from '~/composables/useAppNavigate'

  defineOptions({ inheritAttrs: false })

  const props = defineProps<{
    to: string
  }>()

  const appNavigate = useAppNavigate()
  const { wp } = useWorkspacePath()

  const resolvedPath = computed(() => wp(props.to))

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
