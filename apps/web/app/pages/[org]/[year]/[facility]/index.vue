<script setup lang="ts">
  definePageMeta({
    layout: 'default',
  })

  const route = useRoute()
  const router = useRouter()

  // Redirect to facility tasks by default
  onMounted(() => {
    const { org, year, facility } = route.params
    router.replace(`/${org}/${year}/${facility}/tasks`)
  })
</script>

<template>
  <Page variant="canvas" :fill-height="true">
    <div class="flex h-full items-center justify-center">
      <Icon name="lucide:loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  </Page>
</template>
